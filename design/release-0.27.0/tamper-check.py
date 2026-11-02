"""0.27.0 tamper tests: each case changes one thing in a fresh clone of the committed HEAD and runs
tools/check_release.py --write-manifest (all assertions run; the manifest comparison is skipped so the
failure names the real check) and node server/check.cjs. Every case except the control must FAIL in at
least one of the two. Usage (work folder outside the repository; cleared case by case):
  python3 -I design/release-0.27.0/tamper-check.py /some/empty/folder
Results: design/release-0.27.0/tamper-result.json"""
import hashlib, json, re, shutil, subprocess, sys
from pathlib import Path

SRC = str(Path(__file__).resolve().parents[2])
BASE = Path(sys.argv[1])


def fresh(name):
    d = BASE / 'case'
    if d.exists():
        shutil.rmtree(d)
    subprocess.run(['git', 'clone', '-q', '--no-hardlinks', SRC, str(d)], check=True)
    return d


def sub(path, old, new, count=1):
    s = path.read_text(encoding='utf8')
    assert s.count(old) == count, (path, old[:60], s.count(old))
    path.write_text(s.replace(old, new), encoding='utf8')


def rehash(d):
    for name in ['data.ko.js', 'data.en.js', 'predictions.js']:
        digest = hashlib.sha256((d / 'data/football' / name).read_bytes()).hexdigest()[:16]
        for page in ['index.html', 'index.en.html']:
            s = (d / page).read_text(encoding='utf8')
            s = re.sub(re.escape(name) + r'\?v=[0-9a-f]{16}', name + '?v=' + digest, s)
            (d / page).write_text(s, encoding='utf8')


def json_edit(path, fn):
    data = json.loads(path.read_text(encoding='utf8'))
    fn(data)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf8')


def refresh_edit(d, fn):
    json_edit(d / 'tools/football_refresh/0.27.0/refresh.json', fn)
    for script in [['tools/football_refresh/refresh.py', 'apply'], ['design/release-0.27.0/build_pages.py']]:
        subprocess.run([sys.executable, '-I'] + script, cwd=d, capture_output=True)  # may refuse; the check must still fail
    rehash(d)


def run(d, args):
    r = subprocess.run(args, cwd=d, capture_output=True, text=True)
    text = (r.stdout + r.stderr).strip().splitlines()
    if args[0] == 'node' and r.returncode:
        err = [l.strip() for l in r.stderr.splitlines() if 'Error' in l or 'Expected' in l or 'message' in l]
        return r.returncode, ' | '.join(err[:2])[:200]
    return r.returncode, (text[-1] if text else '')[:300]


def data_text(d, name):
    return (d / 'data/football' / name).read_text(encoding='utf8')


cases = {
    'control (no change)': lambda d: None,
    'refreshed score changed in data.ko.js only (+ ?v=)': lambda d: (sub(d / 'data/football/data.ko.js', '"id":"understat:31230","league":"EPL","season":"2026/27","date":"2026-10-10","home":"understat:83","away":"understat:245","hg":2.0', '"id":"understat:31230","league":"EPL","season":"2026/27","date":"2026-10-10","home":"understat:83","away":"understat:245","hg":3.0'), rehash(d)),
    'xG filled for a refreshed match in both data files (+ ?v=)': lambda d: ([sub(d / 'data/football' / n, '"hg":2.0,"ag":1.0,"hx":null,"ax":null,"source":"https://www.football-data.co.uk/mmz4281/2627/E0.csv","provider":"football-data.co.uk","hs":13', '"hg":2.0,"ag":1.0,"hx":1.5,"ax":null,"source":"https://www.football-data.co.uk/mmz4281/2627/E0.csv","provider":"football-data.co.uk","hs":13') for n in ['data.ko.js', 'data.en.js']], rehash(d)),
    'old Understat match changed in data.ko.js (+ ?v=)': lambda d: (sub(d / 'data/football/data.ko.js', '"id":"understat:22275","league":"EPL","season":"2023/24","date":"2023-08-11","home":"understat:92","away":"understat:88","hg":0.0', '"id":"understat:22275","league":"EPL","season":"2023/24","date":"2023-08-11","home":"understat:92","away":"understat:88","hg":1.0'), rehash(d)),
    'refresh.json score changed, data files not rebuilt': lambda d: json_edit(d / 'tools/football_refresh/0.27.0/refresh.json', lambda r: r['results'][0].update(hg=r['results'][0]['hg'] + 1)),
    'one refreshed result dropped from data (refresh + data rebuilt, ?v=)': lambda d: (json_edit(d / 'tools/football_refresh/0.27.0/refresh.json', lambda r: (r['results'].pop(), r.update(as_of=r['results'][-1]['date']))), subprocess.run([sys.executable, '-I', 'tools/football_refresh/refresh.py', 'apply'], cwd=d, check=True, capture_output=True), rehash(d)),
    'stored prediction probability changed in predictions.js (+ ?v=)': lambda d: (sub(d / 'data/football/predictions.js', '"home":0.6085747997883622', '"home":0.6185747997883622'), rehash(d)),
    'recorded edit removed from page-patch.json only': lambda d: json_edit(d / 'design/release-0.27.0/page-patch.json', lambda p: p['index.html'].pop(0)),
    'unrecorded page code edit (ko): xgText back to toFixed in rows()': lambda d: sub(d / 'index.html', '<td>${h?m.hg:m.ag} : ${h?m.ag:m.hg}</td><td>${xgText(h?m.hx:m.ax)}</td>', '<td>${h?m.hg:m.ag} : ${h?m.ag:m.hg}</td><td>${(h?m.hx:m.ax).toFixed(2)}</td>'),
    'calc() counts missing xG as 0 again (ko page)': lambda d: sub(d / 'index.html', 'if(nx<n){xg=null;xga=null}', ''),
    'refresh UI block removed (en)': lambda d: (lambda s: (d / 'index.en.html').write_text(re.sub(r'<script id="matchlab-refresh-ui">[\s\S]*?</script>', '', s, count=1), encoding='utf8'))((d / 'index.en.html').read_text(encoding='utf8')),
    'refresh UI logic changed in page only (ko)': lambda d: sub(d / 'index.html', "limit=shown.get(lg)||5;", "limit=shown.get(lg)||50;"),
    'refresh UI logic changed in ko source and page': lambda d: [sub(d / x, "limit=shown.get(lg)||5;", "limit=shown.get(lg)||50;") for x in ['design/release-0.27.0/refresh-ui.ko.js', 'index.html']],
    'Korean text in the English refresh UI (source and page)': lambda d: [sub(d / x, "hit:'Hit'", "hit:'적중'") for x in ['design/release-0.27.0/refresh-ui.en.js', 'index.en.html']],
    'xG helper changed in page only (ko)': lambda d: sub(d / 'index.html', "v.toFixed(2):'—'}</script>", "v.toFixed(1):'—'}</script>"),
    'VERSION 0.26.3': lambda d: (d / 'VERSION').write_text('0.26.3\n'),
    # 0.27.0 review R1: refresh.json edited by hand, then apply and build_pages run again (+ ?v=).
    'R1 refresh.json score changed, apply + build_pages rerun': lambda d: refresh_edit(d, lambda r: r['results'][0].update(hg=r['results'][0]['hg'] + 1)),
    'R1 refresh.json home/away goals swapped, apply + build_pages rerun': lambda d: refresh_edit(d, lambda r: (lambda x: x.update(hg=x['ag'], ag=x['hg']))(next(x for x in r['results'] if x['hg'] != x['ag']))),
    'R1 refresh.json date 2026-09-19, apply + build_pages rerun': lambda d: refresh_edit(d, lambda r: r['results'][0].update(date='2026-09-19')),
    'R1 refresh.json shots on target > shots, apply + build_pages rerun': lambda d: refresh_edit(d, lambda r: r['results'][2].update(hst=r['results'][2]['hs'] + 1)),
}
results = []
for name, change in cases.items():
    d = fresh(name)
    change(d)
    rel = run(d, [sys.executable, '-I', 'tools/check_release.py', '--write-manifest'])
    srv = run(d, ['node', 'server/check.cjs'])
    failed = rel[0] != 0 or srv[0] != 0
    expected = name.startswith('control')
    results.append(dict(case=name, check_release='PASS' if rel[0] == 0 else 'FAIL', check_release_message=rel[1],
                        server_check='PASS' if srv[0] == 0 else 'FAIL', server_message=srv[1],
                        outcome='as expected' if failed != expected else 'UNEXPECTED'))
    print(results[-1]['outcome'], '|', name, '|', results[-1]['check_release'], results[-1]['server_check'], '|', rel[1][:120])
shutil.rmtree(BASE / 'case', ignore_errors=True)
out = Path(__file__).with_name('tamper-result.json')
out.write_text(json.dumps(dict(cases=results, unexpected=sum(r['outcome'] != 'as expected' for r in results),
                               note='A refresh.json edit that is also applied to the data files is the recorded source and passes by design; it is reviewed as data, not detected as tampering.'),
                          ensure_ascii=False, indent=1) + '\n', encoding='utf8')
