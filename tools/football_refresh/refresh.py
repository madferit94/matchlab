"""Football result refresh (0.27.0): football-data.co.uk public CSV -> MatchLab data files.

Commands (run from the repository root, Python 3, standard library only):
  python3 -I tools/football_refresh/refresh.py fetch --raw <folder outside the repository>
  python3 -I tools/football_refresh/refresh.py build --raw <same folder>     # writes tools/football_refresh/0.27.0/refresh.json
  python3 -I tools/football_refresh/refresh.py verify --raw <same folder>    # raw line fingerprints = refresh.json
  python3 -I tools/football_refresh/refresh.py apply                         # writes data/football/data.ko.js and data.en.js
  python3 -I tools/football_refresh/refresh.py check                         # data files == apply(v50 data, refresh.json, archive-xg.json)

0.27.1 archive xG (Internet Archive copies of understat.com, which is unreachable):
  python3 -I tools/football_refresh/refresh.py fetch-xg --raw <folder outside the repository>
  python3 -I tools/football_refresh/refresh.py build-xg --raw <same folder>  # writes tools/football_refresh/0.27.1/archive-xg.json
  python3 -I tools/football_refresh/refresh.py verify-xg --raw <folder>      # downloads again; hashes and values = archive-xg.json
  python3 -I tools/football_refresh/refresh.py check-xg                      # offline: evidence rules, xG recomputed from stored strings

Rules
- Only values from the same provider row are used: final score, shots, shots on target.
  The provider's xG (a different xG model from Understat) and every other column are not used.
- A refreshed match must be one of the 641 stored scheduled fixtures (same league, home, away).
  It moves from `scheduled` to `completed` with hx/ax = null (no xG after 2026-09-20).
- Before anything is written, every stored 2026/27 completed match (Understat, up to 2026-09-20)
  must appear in the provider file with the same date and the same score.
- The base is always the archived v50 data block, so applying twice gives the same bytes.
- Stored predictions (data/football/predictions.js) are never read for writing and never changed.
- 0.27.1: of those results, only the matches in archive-xg.json get hx/ax (plus xg_source, xg_method);
  every other refreshed match keeps hx/ax = null.
"""
from pathlib import Path
import argparse, csv, datetime, email.utils, gzip, hashlib, io, json, math, re, sys, urllib.request

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
# 0.27.0 review R1: the provider columns behind each result are stored in refresh.json with two fingerprints:
# row_sha256 (canonical JSON of these columns; re-checked by apply_refresh, so by check_release and the JS mirror)
# and line_sha256 (the exact raw CSV line; re-checked by `verify --raw` when the raw files are available).
ROW_COLUMNS = ['Div', 'Date', 'Time', 'HomeTeam', 'AwayTeam', 'FTHG', 'FTAG', 'FTR', 'HS', 'AS', 'HST', 'AST']
DIVISION = {'EPL': 'E0', 'La_liga': 'SP1'}


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


def canonical_row(row):
    return json.dumps({k: row[k] for k in ROW_COLUMNS}, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def row_sha256(row):
    return hashlib.sha256(canonical_row(row).encode('utf8')).hexdigest()


def validate_refresh(data, refresh):
    """Content rules for refresh.json against the v50 data. Same rules as build() and as tools/football_refresh/apply.cjs."""
    names = {k: aliases().get(v['name'], v['name']) for k, v in data['teams'].items()}
    by_id = {m['id']: m for m in data['scheduled']}
    assert refresh['provider'] == PROVIDER and refresh['previous_last_date'] == PREVIOUS_LAST_DATE == data['last_date'], 'Refresh header differs'
    results = refresh['results']
    assert results and len({r['id'] for r in results}) == len(results), 'Empty or duplicate refresh results'
    assert results == sorted(results, key=lambda r: (r['date'], r['id'])), 'Refresh results not in date order'
    assert refresh['as_of'] == max(r['date'] for r in results), 'as_of is not the last result date'
    required = ['id', 'league', 'date', 'provider_file', 'provider_line', 'provider_row', 'row_sha256', 'line_sha256'] + list(FIELDS)
    for r in results:
        missing = [k for k in required if k not in r]
        assert not missing, 'Refresh result is missing ' + ', '.join(missing) + ': ' + str(r.get('id'))
        m = by_id.get(r['id'])
        assert m and m['league'] == r['league'] and m['season'] == SEASON and m['hg'] is None, 'Not a stored scheduled fixture: ' + r['id']
        assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', r['date']) and PREVIOUS_LAST_DATE < r['date'] <= refresh['as_of'], 'Result date outside (previous cutoff, as_of]: ' + r['id']
        for field in FIELDS:
            assert type(r[field]) is int and r[field] >= 0, 'Value is not a non-negative integer: ' + r['id'] + ' ' + field
        assert r['hst'] <= r['hs'] and r['ast'] <= r['as'], 'Shots on target exceed shots: ' + r['id']
        row = r['provider_row']
        assert list(row) == ROW_COLUMNS and all(type(v) is str for v in row.values()), 'Provider row columns differ: ' + r['id']
        assert row_sha256(row) == r['row_sha256'], 'Provider row fingerprint differs: ' + r['id']
        assert row['Div'] == DIVISION[r['league']] == r['provider_file'], 'Provider division differs: ' + r['id']
        assert iso(row['Date']) == r['date'], 'Provider date differs: ' + r['id']
        assert (row['HomeTeam'], row['AwayTeam']) == (names[m['home']], names[m['away']]), 'Provider teams differ from the fixture: ' + r['id']
        assert all(row[column] == str(r[field]) for field, column in FIELDS.items()), 'Provider values differ from the result: ' + r['id']
        ftr = 'H' if r['hg'] > r['ag'] else 'D' if r['hg'] == r['ag'] else 'A'
        assert row['FTR'] == ftr, 'Result letter differs from score: ' + r['id']
        assert isinstance(r['line_sha256'], str) and re.fullmatch(r'[0-9a-f]{64}', r['line_sha256']), 'Raw line fingerprint missing: ' + r['id']


def verify(raw):
    """With the raw files: file hashes, raw line fingerprints and provider columns all match refresh.json."""
    refresh = json.loads(OUT.read_text(encoding='utf8'))
    files = {f['league']: f for f in refresh['files']}
    lines = {}
    for league, div in FILES.items():
        body = (raw / (div + '.csv')).read_bytes()
        assert hashlib.sha256(body).hexdigest() == files[league]['sha256'], 'Raw file hash differs: ' + div
        lines[div] = body.decode('utf-8-sig').splitlines()
    for r in refresh['results']:
        line = lines[r['provider_file']][r['provider_line'] - 1]
        assert hashlib.sha256(line.encode('utf8')).hexdigest() == r['line_sha256'], 'Raw line fingerprint differs: ' + r['id']
        parsed = next(csv.DictReader(io.StringIO(lines[r['provider_file']][0] + '\n' + line)))
        assert {k: parsed[k] for k in ROW_COLUMNS} == r['provider_row'], 'Provider columns differ from the raw line: ' + r['id']
    validate_refresh(json.loads(v50_block('index.html')), refresh)
    print('PASS refresh.json = raw provider files (%d results, raw line fingerprints match)' % len(refresh['results']))


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
        raw_lines = body.decode('utf-8-sig').splitlines()
        assert len(raw_lines) == len(rows) + 1, 'CSV rows span several lines: ' + div
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
            raw_line = raw_lines[line - 1]
            assert raw_line.split(',')[:5] == [r['Div'], r['Date'], r['Time'], r['HomeTeam'], r['AwayTeam']], 'Raw line does not match the parsed row: ' + fixture['id']
            provider_row = {k: r[k] for k in ROW_COLUMNS}
            new.append(dict(id=fixture['id'], league=league, date=day, scheduled_date=fixture['date'],
                            kickoff_uk=r['Time'], provider_file=div, provider_line=line, **values,
                            provider_row=provider_row, row_sha256=row_sha256(provider_row),
                            line_sha256=hashlib.sha256(raw_line.encode('utf8')).hexdigest()))
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
    validate_refresh(data, refresh)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(refresh, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    print(json.dumps({k: v for k, v in refresh.items() if k != 'results'}, ensure_ascii=False, indent=1))
    print('results', len(results))


def apply_refresh(data, refresh):
    """Pure function: v50 data object + refresh.json -> refreshed data object."""
    data = json.loads(json.dumps(data))
    validate_refresh(data, refresh)
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
    xg = json.loads(XG_OUT.read_text(encoding='utf8'))
    out = {}
    for page, name in [('index.html', 'data.ko.js'), ('index.en.html', 'data.en.js')]:
        refreshed = apply_archive_xg(apply_refresh(json.loads(v50_block(page)), refresh), refresh, xg)
        out[name] = PREFIX + json.dumps(refreshed, ensure_ascii=False, separators=(',', ':')) + ';\n'
    return out


def apply():
    for name, text in expected_texts().items():
        (DATA / name).write_text(text, encoding='utf8')
        print('wrote', name, len(text.encode('utf8')))


def check():
    for name, text in expected_texts().items():
        assert (DATA / name).read_text(encoding='utf8') == text, name + ' differs from apply(v50, refresh.json, archive-xg.json)'
    print('PASS data files = apply(v50 data, refresh.json, archive-xg.json)')


# ---------------------------------------------------------------------------------------------------------------
# 0.27.1: xG for a few refreshed matches from Internet Archive copies of understat.com.
# understat.com itself does not resolve (its name servers do not answer, 2026-11-02). web.archive.org still holds
# Understat data for 5 of the 60 refreshed matches. archive-xg.json is the evidence: capture URL, sha256 of the
# archived bytes (after gzip is undone), method, the raw xG strings and the resulting hx/ax.
#   match_info: hx/ax = the match page's match_info h_xg/a_xg (the same match xG as the stored Understat rows)
#   shot_sum:   hx/ax = sum of the per-shot xG in getMatchData, in archived order, rounded to 6 decimals.
#               A shot sum can differ slightly from Understat's match xG (up to 0.0143 on 5 stored matches).
# ---------------------------------------------------------------------------------------------------------------
XG_OUT = HERE / '0.27.1' / 'archive-xg.json'
XG_VERSION = '0.27.1'
XG_SOURCE = 'Internet Archive (web.archive.org) copies of understat.com'
ARCHIVE_URL = 'https://web.archive.org/web/{stamp}id_/{url}'
XG_METHODS = {'match_info': 'https://understat.com/match/{n}', 'shot_sum': 'https://understat.com/getMatchData/{n}'}
# (match id, archive capture time, method). The original URL follows from the method.
XG_CAPTURES = [
    ('understat:31232', '20261010204330', 'shot_sum'),
    ('understat:31233', '20261010175440', 'shot_sum'),
    ('understat:31239', '20261017135551', 'shot_sum'),
    ('understat:31249', '20261025161437', 'match_info'),
    ('understat:31256', '20261025161531', 'match_info'),
]
XG_REQUIRED = ['id', 'date', 'method', 'hx', 'ax', 'archive_url', 'original_url', 'archived_at', 'bytes', 'sha256',
               'archive_match', 'shots']
# 0.27.1 review R4: no keys beyond these (same lists in apply.cjs).
XG_TOP_KEYS = ['version', 'source', 'reason', 'refresh', 'methods', 'sha256_of', 'matches']
XG_METHOD_KEYS = {'match_info': ['h_xg', 'a_xg'], 'shot_sum': ['shot_xg']}
XG_MATCH_KEYS = {'match_info': ['date', 'home', 'away', 'home_id', 'away_id', 'score'], 'shot_sum': ['date', 'home', 'away', 'score']}
DECIMAL = re.compile(r'[0-9]+(?:\.[0-9]+)?')  # ASCII digits only, as in apply.cjs


def json_int(value):
    """A JSON number with an integer value (JavaScript Number.isInteger); booleans are not numbers."""
    return type(value) in (int, float) and math.isfinite(value) and value == int(value)


def original_url(match_id, method):
    return XG_METHODS[method].format(n=match_id.split(':', 1)[1])


def stamp_iso(stamp):
    return datetime.datetime.strptime(stamp, '%Y%m%d%H%M%S').strftime('%Y-%m-%dT%H:%M:%SZ')


def raw_name(match_id, method):
    return match_id.split(':', 1)[1] + ('.json' if method == 'shot_sum' else '.html')


def shot_sum(values):
    """Per-shot xG strings added left to right (not sum(), which compensates in Python 3.12+), rounded to
    6 decimals. Same arithmetic as shotSum() in apply.cjs."""
    total = 0.0
    for value in values:
        total += float(value)
    return float('%.6f' % total)


def fetch_capture(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'MatchLab archive xG check (manual run)'})
    with urllib.request.urlopen(request, timeout=90) as response:
        body = response.read()
    return gzip.decompress(body) if body[:2] == b'\x1f\x8b' else body


def raw_outside(raw):
    raw.mkdir(parents=True, exist_ok=True)
    assert ROOT not in raw.resolve().parents and raw.resolve() != ROOT, 'Raw archive files stay outside the repository'


def fetch_xg(raw):
    raw_outside(raw)
    log = []
    for match_id, stamp, method in XG_CAPTURES:
        url = ARCHIVE_URL.format(stamp=stamp, url=original_url(match_id, method))
        body = fetch_capture(url)
        (raw / raw_name(match_id, method)).write_bytes(body)
        log.append(dict(id=match_id, url=url, bytes=len(body), sha256=hashlib.sha256(body).hexdigest()))
    (raw / 'xg-fetch-log.json').write_text(json.dumps(log, indent=1) + '\n', encoding='utf8')
    print(json.dumps(log, indent=1))


def decode_js_string(text):
    """Undo the escapes inside Understat's JSON.parse('...'): \\xNN, \\uNNNN, \\\\, \\' and \\/. Anything else stops."""
    out, i = [], 0
    while i < len(text):
        if text[i] != '\\':
            out.append(text[i])
            i += 1
            continue
        kind = text[i + 1:i + 2]
        size = {'x': 2, 'u': 4}.get(kind)
        if size:
            digits = text[i + 2:i + 2 + size]
            assert re.fullmatch('[0-9a-fA-F]{%d}' % size, digits), 'Bad escape in match_info'
            out.append(chr(int(digits, 16)))
            i += 2 + size
        else:
            assert kind in ('\\', "'", '/'), 'Unexpected escape in match_info'
            out.append(kind)
            i += 2
    return ''.join(out)


def read_capture(match_id, method, body):
    """Archived (gunzipped) bytes -> the evidence fields taken from them."""
    number = match_id.split(':', 1)[1]
    if method == 'match_info':
        found = re.findall(r"var match_info\s*=\s*JSON\.parse\('([^']*)'\)", body.decode('utf8'))
        assert len(found) == 1, 'match_info missing or repeated: ' + match_id
        info = json.loads(decode_js_string(found[0]))
        assert info['id'] == number, 'match_info is for another match: ' + match_id
        return dict(archive_match=dict(date=info['date'][:10], home=info['team_h'], away=info['team_a'],
                                       home_id='understat:' + info['h'], away_id='understat:' + info['a'],
                                       score=[int(info['h_goals']), int(info['a_goals'])]),
                    archive_shots=[int(info['h_shot']), int(info['a_shot'])], h_xg=info['h_xg'], a_xg=info['a_xg'])
    shots = json.loads(body.decode('utf8'))['shots']
    every = shots['h'] + shots['a']
    keys = {(s['match_id'], s['date'], s['h_team'], s['a_team'], s['h_goals'], s['a_goals']) for s in every}
    assert len(keys) == 1, 'No shots, or shots disagree on the match: ' + match_id
    number_seen, date, home, away, hg, ag = keys.pop()
    assert number_seen == number, 'getMatchData is for another match: ' + match_id
    assert all(s['h_a'] == side for side in 'ha' for s in shots[side]), 'Shot side differs from its list: ' + match_id
    return dict(archive_match=dict(date=date[:10], home=home, away=away, score=[int(hg), int(ag)]),
                archive_shots=[len(shots['h']), len(shots['a'])],
                shot_xg={side: [s['xG'] for s in shots[side]] for side in 'ha'})


def validate_archive_xg(data, refresh, xg):
    """Content rules for archive-xg.json against refreshed data (apply_refresh output). Same rules as apply.cjs."""
    assert type(xg) is dict and set(xg) <= set(XG_TOP_KEYS), 'Archive xG file has unknown keys'
    assert xg['version'] == XG_VERSION and xg['source'] == XG_SOURCE, 'Archive xG header differs'
    results = {r['id']: r for r in refresh['results']}
    matches = xg['matches']
    assert matches and len({e['id'] for e in matches}) == len(matches) <= len(results), 'Empty, duplicate or too many archive xG entries'
    rows = {m['id']: m for m in data['completed']}
    for e in matches:
        missing = [k for k in XG_REQUIRED if k not in e]
        assert not missing, 'Archive xG entry is missing ' + ', '.join(missing) + ': ' + str(e.get('id'))
        r, m = results.get(e['id']), rows.get(e['id'])
        assert r and m, 'Archive xG match is not a refreshed result: ' + e['id']
        assert m['provider'] == PROVIDER and m['hx'] is None and m['ax'] is None, 'Archive xG target is not a refreshed match without xG: ' + e['id']
        method = e['method']
        assert method in XG_METHODS and set(e) <= set(XG_REQUIRED + XG_METHOD_KEYS[method]), 'Archive xG entry has unknown keys: ' + e['id']
        assert type(e['archive_match']) is dict and set(e['archive_match']) == set(XG_MATCH_KEYS[method]), 'Archive match keys differ: ' + e['id']
        assert type(e['shots']) is dict and set(e['shots']) == {'archive', 'football_data'}, 'Archive shots keys differ: ' + e['id']
        assert e['original_url'] == original_url(e['id'], method), 'Archive xG method or original URL differs: ' + e['id']
        assert re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', e['archived_at']), 'Archive capture time malformed: ' + e['id']
        stamp = re.sub(r'\D', '', e['archived_at'])
        assert e['archive_url'] == ARCHIVE_URL.format(stamp=stamp, url=e['original_url']), 'Archive URL differs: ' + e['id']
        assert json_int(e['bytes']) and e['bytes'] > 0 and isinstance(e['sha256'], str) and re.fullmatch('[0-9a-f]{64}', e['sha256']), 'Archive fingerprint missing: ' + e['id']
        a = e['archive_match']
        assert e['date'] == a['date'] == r['date'], 'Archive date differs from the result: ' + e['id']
        assert type(a['score']) is list and len(a['score']) == 2 and all(json_int(v) for v in a['score']) and a['score'] == [r['hg'], r['ag']], 'Archive score differs from the result: ' + e['id']
        assert (a['home'], a['away']) == (data['teams'][m['home']]['name'], data['teams'][m['away']]['name']), 'Archive teams differ: ' + e['id']
        if method == 'match_info':
            assert (a.get('home_id'), a.get('away_id')) == (m['home'], m['away']), 'Archive team ids differ: ' + e['id']
        shots = e['shots']
        assert type(shots['football_data']) is list and all(json_int(v) for v in shots['football_data']) and shots['football_data'] == [r['hs'], r['as']], 'Recorded football-data shots differ from refresh.json: ' + e['id']
        assert type(shots['archive']) is list and len(shots['archive']) == 2 and all(json_int(v) and v >= 0 for v in shots['archive']), 'Archive shot counts malformed: ' + e['id']
        for v in (e['hx'], e['ax']):
            assert type(v) in (int, float) and math.isfinite(v) and v >= 0, 'xG is not a non-negative finite number: ' + e['id']
        if method == 'match_info':
            assert 'shot_xg' not in e and all(type(e[k]) is str and DECIMAL.fullmatch(e[k]) for k in ('h_xg', 'a_xg')), 'match_info xG strings malformed: ' + e['id']
            expected = (float(e['h_xg']), float(e['a_xg']))
        else:
            sx = e['shot_xg']
            assert 'h_xg' not in e and 'a_xg' not in e and list(sx) == ['h', 'a'], 'shot_sum evidence malformed: ' + e['id']
            assert all(type(sx[side]) is list for side in 'ha') and all(type(v) is str and DECIMAL.fullmatch(v) for side in 'ha' for v in sx[side]), 'Shot xG strings malformed: ' + e['id']
            assert shots['archive'] == [len(sx['h']), len(sx['a'])], 'Archive shot count differs from the shot list: ' + e['id']
            expected = (shot_sum(sx['h']), shot_sum(sx['a']))
        assert (e['hx'], e['ax']) == expected, 'Stored xG differs from the archived values: ' + e['id']


def apply_archive_xg(data, refresh, xg):
    """Pure function: refreshed data object + archive-xg.json -> data with those matches' hx/ax filled."""
    data = json.loads(json.dumps(data))
    validate_archive_xg(data, refresh, xg)
    rows = {m['id']: m for m in data['completed']}
    for e in xg['matches']:
        m = rows[e['id']]
        m['hx'], m['ax'] = e['hx'], e['ax']
        m['xg_source'], m['xg_method'] = e['archive_url'], e['method']
    return data


def evidence(match_id, stamp, method, body, result):
    fields = read_capture(match_id, method, body)
    if method == 'match_info':
        hx, ax = float(fields['h_xg']), float(fields['a_xg'])
    else:
        hx, ax = shot_sum(fields['shot_xg']['h']), shot_sum(fields['shot_xg']['a'])
    entry = dict(id=match_id, date=result['date'], method=method, hx=hx, ax=ax,
                 archive_url=ARCHIVE_URL.format(stamp=stamp, url=original_url(match_id, method)),
                 original_url=original_url(match_id, method), archived_at=stamp_iso(stamp),
                 bytes=len(body), sha256=hashlib.sha256(body).hexdigest(), archive_match=fields['archive_match'],
                 shots=dict(archive=fields['archive_shots'], football_data=[result['hs'], result['as']]))
    if method == 'match_info':
        entry.update(h_xg=fields['h_xg'], a_xg=fields['a_xg'])
    else:
        entry['shot_xg'] = fields['shot_xg']
    return entry


def build_xg(raw):
    refresh = json.loads(OUT.read_text(encoding='utf8'))
    results = {r['id']: r for r in refresh['results']}
    matches = [evidence(match_id, stamp, method, (raw / raw_name(match_id, method)).read_bytes(), results[match_id])
               for match_id, stamp, method in XG_CAPTURES]
    xg = dict(version=XG_VERSION, source=XG_SOURCE,
              reason='understat.com does not resolve (2026-11-02); the Internet Archive holds Understat data for these refreshed matches only',
              refresh='tools/football_refresh/0.27.0/refresh.json',
              methods=dict(match_info='match page match_info h_xg / a_xg (Understat match xG)',
                           shot_sum='getMatchData per-shot xG added in archived order, rounded to 6 decimals (can differ slightly from Understat match xG)'),
              sha256_of='archived bytes after gzip is undone',
              matches=matches)
    validate_archive_xg(apply_refresh(json.loads(v50_block('index.html')), refresh), refresh, xg)
    XG_OUT.parent.mkdir(parents=True, exist_ok=True)
    XG_OUT.write_text(json.dumps(xg, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    for e in matches:
        print(e['id'], e['method'], e['hx'], e['ax'], 'shots archive', e['shots']['archive'], 'football-data', e['shots']['football_data'])


def check_xg():
    refresh = json.loads(OUT.read_text(encoding='utf8'))
    xg = json.loads(XG_OUT.read_text(encoding='utf8'))
    for page in ('index.html', 'index.en.html'):
        validate_archive_xg(apply_refresh(json.loads(v50_block(page)), refresh), refresh, xg)
    print('PASS archive-xg.json rules (%d matches, xG recomputed from the stored strings)' % len(xg['matches']))


def verify_xg(raw):
    """Download every capture again: bytes, sha256 and the fields read from them = archive-xg.json."""
    raw_outside(raw)
    xg = json.loads(XG_OUT.read_text(encoding='utf8'))
    for e in xg['matches']:
        body = fetch_capture(e['archive_url'])
        (raw / ('verify-' + raw_name(e['id'], e['method']))).write_bytes(body)
        assert len(body) == e['bytes'] and hashlib.sha256(body).hexdigest() == e['sha256'], 'Archived bytes differ: ' + e['id']
        fields = read_capture(e['id'], e['method'], body)
        assert fields.pop('archive_shots') == e['shots']['archive'], 'Archive shot counts differ: ' + e['id']
        assert all(e[k] == v for k, v in fields.items()), 'Archive fields differ: ' + e['id']
        print('match', e['id'], e['method'], e['hx'], e['ax'])
    check_xg()
    print('PASS archive-xg.json = Internet Archive captures (%d downloaded again, hashes and values match)' % len(xg['matches']))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['fetch', 'build', 'verify', 'apply', 'check', 'fetch-xg', 'build-xg', 'verify-xg', 'check-xg'])
    parser.add_argument('--raw', type=Path)
    args = parser.parse_args()
    if args.command in ('fetch', 'build', 'verify', 'fetch-xg', 'build-xg', 'verify-xg'):
        assert args.raw, '--raw folder required'
    {'fetch': lambda: fetch(args.raw), 'build': lambda: build(args.raw), 'verify': lambda: verify(args.raw), 'apply': apply, 'check': check,
     'fetch-xg': lambda: fetch_xg(args.raw), 'build-xg': lambda: build_xg(args.raw), 'verify-xg': lambda: verify_xg(args.raw),
     'check-xg': check_xg}[args.command]()
