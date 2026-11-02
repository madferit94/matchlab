"""Build the 0.27.1 football pages from the 0.27.0 pages (git 8bffcc6) and write page-patch.json.

python3 -I design/release-0.27.1/build_pages.py          # writes index.html, index.en.html, page-patch.json
python3 -I design/release-0.27.1/build_pages.py --check  # rebuild in memory and compare with the files

Changes, all recorded so tools/check_release.py can undo them before the 0.27.0 and v50 comparisons:
1. data tag ?v= hash follows the data file with archive xG (the checker recomputes it from the file).
2. <script id="matchlab-refresh-ui"> now holds refresh-ui.<lang>.js from this folder (xG for 5 of 60 refreshed
   matches: header count, xG column in the finished-match table, source and method note in the match room,
   accurate note on this season's xG questions).
3. Small text edits (page-patch.json, before -> after, each exactly once).
"""
from pathlib import Path
import hashlib, json, sys, subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BASE_COMMIT = '8bffcc6'
PAGES = {'index.html': ('ko', 'data.ko.js'), 'index.en.html': ('en', 'data.en.js')}
UI_START = '<script id="matchlab-refresh-ui">'
END = '</script></body></html>'


def git_show(path):
    return subprocess.check_output(['git', 'show', BASE_COMMIT + ':' + path], cwd=ROOT).decode('utf8')


def rules(lang):
    old_note, new_note = {
        'ko': ('<div class="muted">xG 자료가 없는 경기(football-data.co.uk 결과)는 점을 표시하지 않습니다.</div>',
               '<div class="muted">xG 자료가 없는 경기(2026-09-20 이후 결과 대부분)는 점을 표시하지 않습니다.</div>'),
        'en': ('<div class="muted">Matches without xG (football-data.co.uk results) have no point.</div>',
               '<div class="muted">Matches without xG (most results after 2026-09-20) have no point.</div>')}[lang]
    return [
        ('preview xG chart note: some football-data.co.uk results now have xG', old_note, new_note),
    ]


def data_tag(name, digest):
    return '<script src="data/football/' + name + '?v=' + digest + '"></script>'


def build(page):
    lang, data_name = PAGES[page]
    html = git_show(page)
    base_digest = hashlib.sha256(git_show('data/football/' + data_name).encode('utf8')).hexdigest()[:16]
    new_digest = hashlib.sha256((ROOT / 'data/football' / data_name).read_bytes()).hexdigest()[:16]
    assert html.count(data_tag(data_name, base_digest)) == 1
    html = html.replace(data_tag(data_name, base_digest), data_tag(data_name, new_digest))
    old_ui = UI_START + git_show('design/release-0.27.0/refresh-ui.' + lang + '.js').rstrip('\n') + END
    new_ui = (HERE / ('refresh-ui.' + lang + '.js')).read_text(encoding='utf8').rstrip('\n')
    assert '</script' not in new_ui
    assert html.endswith(old_ui) and html.count(UI_START) == 1, '0.27.0 refresh UI block not found: ' + page
    html = html[:-len(old_ui)] + UI_START + new_ui + END
    patches = []
    for why, before, after in rules(lang):
        assert html.count(before) == 1, 'patch target not unique: ' + page + ' ' + why
        html = html.replace(before, after)
        assert html.count(after) == 1, 'patch result not unique: ' + page + ' ' + why
        patches.append(dict(why=why, before=before, after=after))
    return html, patches


def main():
    out, patch_file = {}, {}
    for page in PAGES:
        out[page], patch_file[page] = build(page)
    patch_text = json.dumps(patch_file, ensure_ascii=False, indent=1) + '\n'
    if '--check' in sys.argv:
        for page, html in out.items():
            assert (ROOT / page).read_text(encoding='utf8') == html, page + ' differs from build_pages.py output'
        assert (HERE / 'page-patch.json').read_text(encoding='utf8') == patch_text, 'page-patch.json differs'
        print('PASS pages = build_pages.py output')
        return
    for page, html in out.items():
        (ROOT / page).write_text(html, encoding='utf8')
    (HERE / 'page-patch.json').write_text(patch_text, encoding='utf8')
    print('wrote', ', '.join(out), 'and page-patch.json')


if __name__ == '__main__':
    main()
