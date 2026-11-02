"""Football result refresh (0.27.0): football-data.co.uk public CSV -> MatchLab data files.

Commands (run from the repository root, Python 3, standard library only):
  python3 -I tools/football_refresh/refresh.py fetch --raw <folder outside the repository>
  python3 -I tools/football_refresh/refresh.py build --raw <same folder>     # writes tools/football_refresh/0.27.0/refresh.json
  python3 -I tools/football_refresh/refresh.py apply                         # writes data/football/data.ko.js and data.en.js
  python3 -I tools/football_refresh/refresh.py check                         # data files == apply(v50 data, refresh.json)

Rules
- Only values from the same provider row are used: final score, shots, shots on target.
  The provider's xG (a different xG model from Understat) and every other column are not used.
- A refreshed match must be one of the 641 stored scheduled fixtures (same league, home, away).
  It moves from `scheduled` to `completed` with hx/ax = null (no xG after 2026-09-20).
- Before anything is written, every stored 2026/27 completed match (Understat, up to 2026-09-20)
  must appear in the provider file with the same date and the same score.
- The base is always the archived v50 data block, so applying twice gives the same bytes.
- Stored predictions (data/football/predictions.js) are never read for writing and never changed.
"""
from pathlib import Path
import argparse, csv, datetime, email.utils, hashlib, io, json, re, sys, urllib.request

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = HERE / '0.27.0' / 'refresh.json'
V50 = ROOT / 'archive/visualizations/visualization-design-2026-10-08-v50'
DATA = ROOT / 'data/football'
PREFIX = 'window.MatchLabData=window.MatchLabData||{};window.MatchLabData.data='
PROVIDER = 'football-data.co.uk'
FILES = {'EPL': 'E0', 'La_liga': 'SP1'}
SEASON, SEASON_CODE = '2026/27', '2627'
URL = 'https://www.football-data.co.uk/mmz4281/{code}/{div}.csv'
TERMS_URL = 'https://www.football-data.co.uk/disclaimer.php'
NOTES_URL = 'https://www.football-data.co.uk/notes.txt'
PREVIOUS_LAST_DATE = '2026-09-20'
FIELDS = {'hg': 'FTHG', 'ag': 'FTAG', 'hs': 'HS', 'as': 'AS', 'hst': 'HST', 'ast': 'AST'}


def v50_block(page):
    html = (V50 / page).read_text(encoding='utf8')
    blocks = re.findall(r'<script id="data" type="application/json">([\s\S]*?)</script>', html)
    assert len(blocks) == 1, 'v50 data block missing: ' + page
    return blocks[0]


def aliases():
    # Stored team name -> provider team name (names that differ only). Same table used by the 0.24.0 odds link.
    return json.loads((ROOT / 'modeling/odds-0.24.0/team-aliases.json').read_text(encoding='utf8'))


def http_time(value):
    return email.utils.parsedate_to_datetime(value).astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def iso(day):
    return datetime.datetime.strptime(day, '%d/%m/%Y').date().isoformat()


def fetch(raw):
    raw.mkdir(parents=True, exist_ok=True)
    assert ROOT not in raw.resolve().parents and raw.resolve() != ROOT, 'Raw provider files stay outside the repository'
    log = []
    for league, div in FILES.items():
        url = URL.format(code=SEASON_CODE, div=div)
        request = urllib.request.Request(url, headers={'User-Agent': 'MatchLab result refresh (manual run)'})
        with urllib.request.urlopen(request, timeout=60) as response:
            body = response.read()
            headers = {k.lower(): v for k, v in response.headers.items()}
        (raw / (div + '.csv')).write_bytes(body)
        log.append(dict(league=league, url=url, bytes=len(body), sha256=hashlib.sha256(body).hexdigest(),
                        last_modified=headers.get('last-modified'), fetched_at=headers.get('date')))
    (raw / 'fetch-log.json').write_text(json.dumps(log, indent=1) + '\n', encoding='utf8')
    print(json.dumps(log, indent=1))


def read_rows(raw, div):
    text = (raw / (div + '.csv')).read_bytes().decode('utf-8-sig')
    return list(csv.DictReader(io.StringIO(text)))


def build(raw):
    data = json.loads(v50_block('index.html'))
    names = {k: aliases().get(v['name'], v['name']) for k, v in data['teams'].items()}
    fetch_log = {x['league']: x for x in json.loads((raw / 'fetch-log.json').read_text(encoding='utf8'))}
    results, consistency, files = [], {}, []
    scheduled = {(m['league'], names[m['home']], names[m['away']]): m for m in data['scheduled'] if m['season'] == SEASON}
    assert len(scheduled) == len([m for m in data['scheduled'] if m['season'] == SEASON]), 'Duplicate scheduled pair'
    for league, div in FILES.items():
        body = (raw / (div + '.csv')).read_bytes()
        assert hashlib.sha256(body).hexdigest() == fetch_log[league]['sha256'], 'Raw file changed after fetch: ' + div
        rows = read_rows(raw, div)
        by_pair = {}
        for i, r in enumerate(rows, start=2):
            assert r['Div'] == div, 'Unexpected division row'
            key = (r['HomeTeam'], r['AwayTeam'])
            assert key not in by_pair, 'Duplicate provider pair: ' + str(key)
            by_pair[key] = (i, r)
        stored = [m for m in data['completed'] if m['league'] == league and m['season'] == SEASON]
        checked = []
        for m in stored:
            hit = by_pair.get((names[m['home']], names[m['away']]))
            assert hit, 'Stored completed match missing in provider file: ' + m['id']
            r = hit[1]
            same = iso(r['Date']) == m['date'] and float(r['FTHG']) == m['hg'] and float(r['FTAG']) == m['ag']
            assert same, 'Provider date or score differs from stored match: ' + m['id']
            checked.append(m['id'])
        stored_pairs = {(names[m['home']], names[m['away']]) for m in stored}
        new = []
        for key, (line, r) in by_pair.items():
            if key in stored_pairs:
                continue
            fixture = scheduled.get((league,) + key)
            assert fixture, 'Provider match is not a stored scheduled fixture: ' + str(key)
            values = {}
            for field, column in FIELDS.items():
                value = r[column].strip()
                assert re.fullmatch(r'\d+', value), 'Missing or non-integer ' + column + ' for ' + fixture['id']
                values[field] = int(value)
            assert values['hst'] <= values['hs'] and values['ast'] <= values['as'], 'Shots on target exceed shots: ' + fixture['id']
            ftr = 'H' if values['hg'] > values['ag'] else 'D' if values['hg'] == values['ag'] else 'A'
            assert r['FTR'] == ftr, 'Result letter differs from score: ' + fixture['id']
            day = iso(r['Date'])
            assert day > PREVIOUS_LAST_DATE, 'Refreshed match dated on or before the previous cutoff: ' + fixture['id']
            new.append(dict(id=fixture['id'], league=league, date=day, scheduled_date=fixture['date'],
                            kickoff_uk=r['Time'], provider_file=div, provider_line=line, **values))
        results += new
        consistency[league] = dict(stored_completed_checked=len(checked), same_date_and_score=len(checked),
                                   provider_rows=len(rows), new_results=len(new))
        files.append(dict(league=league, url=fetch_log[league]['url'], bytes=fetch_log[league]['bytes'],
                          sha256=fetch_log[league]['sha256'], last_modified=http_time(fetch_log[league]['last_modified']),
                          fetched_at=http_time(fetch_log[league]['fetched_at']), rows=len(rows)))
    results.sort(key=lambda x: (x['date'], x['id']))
    assert len({x['id'] for x in results}) == len(results)
    as_of = max(x['date'] for x in results)
    remaining = [m for m in data['scheduled'] if m['id'] not in {x['id'] for x in results}]
    overdue = sorted(m['id'] for m in remaining if m['date'] <= as_of)
    refresh = dict(version='0.27.0', provider=PROVIDER, terms_url=TERMS_URL, notes_url=NOTES_URL,
                   previous_last_date=PREVIOUS_LAST_DATE, as_of=as_of,
                   fields=dict(used={k: v for k, v in FIELDS.items()}, not_used='provider xG (different model from the stored Understat xG), all other columns'),
                   files=files, consistency=consistency,
                   scheduled_after=len(remaining), scheduled_dated_on_or_before_as_of=overdue,
                   results=results)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(refresh, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    print(json.dumps({k: v for k, v in refresh.items() if k != 'results'}, ensure_ascii=False, indent=1))
    print('results', len(results))


def apply_refresh(data, refresh):
    """Pure function: v50 data object + refresh.json -> refreshed data object."""
    data = json.loads(json.dumps(data))
    by_id = {m['id']: m for m in data['scheduled']}
    url = {f['league']: f['url'] for f in refresh['files']}
    moved = set()
    for r in refresh['results']:
        m = by_id[r['id']]
        assert m['league'] == r['league'] and m['season'] == SEASON and m['hg'] is None
        data['completed'].append({'id': m['id'], 'league': m['league'], 'season': m['season'], 'date': r['date'],
                                  'home': m['home'], 'away': m['away'], 'hg': float(r['hg']), 'ag': float(r['ag']),
                                  'hx': None, 'ax': None, 'source': url[m['league']], 'provider': refresh['provider'],
                                  'hs': r['hs'], 'as': r['as'], 'hst': r['hst'], 'ast': r['ast']})
        moved.add(m['id'])
    data['scheduled'] = [m for m in data['scheduled'] if m['id'] not in moved]
    data['last_date'] = refresh['as_of']
    data['refresh'] = {'version': refresh['version'], 'provider': refresh['provider'], 'terms_url': refresh['terms_url'],
                       'previous_last_date': refresh['previous_last_date'], 'as_of': refresh['as_of'],
                       'results': len(refresh['results']), 'fields': ['hg', 'ag', 'hs', 'as', 'hst', 'ast'],
                       'source_urls': [f['url'] for f in refresh['files']],
                       'fetched_at': max(f['fetched_at'] for f in refresh['files'])}
    return data


def expected_texts():
    refresh = json.loads(OUT.read_text(encoding='utf8'))
    out = {}
    for page, name in [('index.html', 'data.ko.js'), ('index.en.html', 'data.en.js')]:
        refreshed = apply_refresh(json.loads(v50_block(page)), refresh)
        out[name] = PREFIX + json.dumps(refreshed, ensure_ascii=False, separators=(',', ':')) + ';\n'
    return out


def apply():
    for name, text in expected_texts().items():
        (DATA / name).write_text(text, encoding='utf8')
        print('wrote', name, len(text.encode('utf8')))


def check():
    for name, text in expected_texts().items():
        assert (DATA / name).read_text(encoding='utf8') == text, name + ' differs from apply(v50, refresh.json)'
    print('PASS data files = apply(v50 data, refresh.json)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['fetch', 'build', 'apply', 'check'])
    parser.add_argument('--raw', type=Path)
    args = parser.parse_args()
    if args.command in ('fetch', 'build'):
        assert args.raw, '--raw folder required'
    {'fetch': lambda: fetch(args.raw), 'build': lambda: build(args.raw), 'apply': apply, 'check': check}[args.command]()
