"""Build the 0.27.0 football pages from the 0.26.3 pages (git 5a653c7) and write page-patch.json.

python3 -I design/release-0.27.0/build_pages.py          # writes index.html, index.en.html, page-patch.json
python3 -I design/release-0.27.0/build_pages.py --check  # rebuild in memory and compare with the files

Changes, all recorded so tools/check_release.py can undo them before the v50 comparison:
1. data tag ?v= hash follows the refreshed data file (the checker recomputes it from the file).
2. <script id="matchlab-xg-helpers"> (xg-helpers.js) right before the main page script.
3. Small code edits (page-patch.json, before -> after, each exactly once) so matches without xG
   (results after 2026-09-20) show "—" instead of breaking or counting as 0.
4. The analysis engine inlined from analysis/record-engine.cjs (English page: Korean as \\u escapes).
5. <script id="matchlab-refresh-ui"> (refresh-ui.<lang>.js) right before </body>.
"""
from pathlib import Path
import hashlib, json, re, subprocess, sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BASE_COMMIT = '5a653c7'
PAGES = {'index.html': ('ko', 'data.ko.js'), 'index.en.html': ('en', 'data.en.js')}
MAIN_START = '<script>\nlet metricHelpTrigger=null;'
END = '</script></body></html>'


def git_show(path):
    return subprocess.check_output(['git', 'show', BASE_COMMIT + ':' + path], cwd=ROOT).decode('utf8')


def escape_korean(text):
    return re.sub('[가-힣]', lambda m: '\\u%04x' % ord(m[0]), text)


def rules(lang):
    note = {'ko': '<div class="muted">xG 자료가 없는 경기(football-data.co.uk 결과)는 점을 표시하지 않습니다.</div>',
            'en': '<div class="muted">Matches without xG (football-data.co.uk results) have no point.</div>'}[lang]
    trend = {'ko': '<div class="muted">같은 경기 순서로 비교 · xG: 기회의 득점 기대치</div>',
             'en': '<div class="muted">Compared by match order · xG: expected goals from chances</div>'}[lang]
    old_example, new_example, next_example = {'ko': ('라리가 이번 시즌 경기당 기대 득점 순위', '라리가 이번 시즌 경기당 득점 순위', '바르셀로나 홈 원정 성적 비교'),
                                              'en': ('LaLiga this season xG per match ranking', 'LaLiga this season goals per match ranking', 'Compare Barcelona home and away')}[lang]
    return [
        ('review R2: featured example asks for goals, not this season\'s xG (button)',
         'data-id="' + old_example + '">' + old_example + '</button>', 'data-id="' + new_example + '">' + new_example + '</button>'),
        ('review R2: featured example asks for goals, not this season\'s xG (label list)',
         '"' + old_example + '", "' + next_example + '"]', '"' + new_example + '", "' + next_example + '"]'),
        ('calc: count xG only when the match has it; null when any selected match lacks it',
         "xg=0,xga=0,w=0,d=0,l=0;ms.forEach(m=>{let h=m.home===id,f=h?m.hg:m.ag,a=h?m.ag:m.hg;p+=f>a?3:f===a?1:0;w+=f>a;d+=f===a;l+=f<a;gf+=f;ga+=a;xg+=h?m.hx:m.ax;xga+=h?m.ax:m.hx});return {n,p,gf,ga,xg,xga,w,d,l}}",
         "xg=0,xga=0,w=0,d=0,l=0,nx=0;ms.forEach(m=>{let h=m.home===id,f=h?m.hg:m.ag,a=h?m.ag:m.hg;p+=f>a?3:f===a?1:0;w+=f>a;d+=f===a;l+=f<a;gf+=f;ga+=a;if(hasXg(m)){nx++;xg+=h?m.hx:m.ax;xga+=h?m.ax:m.hx}});if(nx<n){xg=null;xga=null}return {n,p,gf,ga,xg,xga,w,d,l}}"),
        ('preview xG per match',
         'h.n?h.xg/h.n:null,a.n?a.xg/a.n:null,2]', 'h.n&&h.xg!==null?h.xg/h.n:null,a.n&&a.xg!==null?a.xg/a.n:null,2]'),
        ('preview xG chart scale uses matches with xG',
         'let max=Math.max(1,...hs.map(g=>g.home===m.home?g.hx:g.ax),...as.map(g=>g.home===m.away?g.hx:g.ax));',
         'let max=Math.max(1,...hs.filter(hasXg).map(g=>g.home===m.home?g.hx:g.ax),...as.filter(hasXg).map(g=>g.home===m.away?g.hx:g.ax));'),
        ('preview xG chart line keeps match positions, draws only matches with xG',
         'function line(ms,id,c,dash){let points=ms.map((g,i)=>`', 'function line(ms,id,c,dash){ms=ms.map((g,i)=>[g,i]).filter(([g])=>hasXg(g));let points=ms.map(([g,i])=>`'),
        ('preview xG chart points',
         "+ms.map((g,i)=>`<circle cx=\"${40+i*70}\"", "+ms.map(([g,i])=>`<circle cx=\"${40+i*70}\""),
        ('preview xG chart note when a match has no xG',
         trend + '<details>', trend + "${hs.concat(as).some(g=>!hasXg(g))?'" + note + "':''}<details>"),
        ('rows(): xG cell', "<td>${h?m.hg:m.ag} : ${h?m.ag:m.hg}</td><td>${(h?m.hx:m.ax).toFixed(2)}</td>",
         "<td>${h?m.hg:m.ag} : ${h?m.ag:m.hg}</td><td>${xgText(h?m.hx:m.ax)}</td>"),
        ('historyRows(): xG cells', "${f} : ${a}</td><td>${(h?m.hx:m.ax).toFixed(2)}</td><td>${(h?m.ax:m.hx).toFixed(2)}</td>",
         "${f} : ${a}</td><td>${xgText(h?m.hx:m.ax)}</td><td>${xgText(h?m.ax:m.hx)}</td>"),
        ('overviewRecent(): xG cell', "${f}:${a}</td><td>${(h?m.hx:m.ax).toFixed(2)}</td>", "${f}:${a}</td><td>${xgText(h?m.hx:m.ax)}</td>"),
        ('teamOverview(): xG per match bars', ",s.xg/s.n],", ",s.xg===null?null:s.xg/s.n],"),
        ('teamOverview(): xG conceded per match bars', ",s.xga/s.n]].map(([label,v])=>", ",s.xga===null?null:s.xga/s.n]].map(([label,v])=>"),
        ('teamOverview(): bar width and value for missing xG',
         'width:${v/max*100}%;background:${c}"></span></div><span>${v.toFixed(2)}</span>',
         'width:${v===null?0:v/max*100}%;background:${c}"></span></div><span>${v===null?\'—\':v.toFixed(2)}</span>'),
        ('updateTeam(): season card xG', " · xG ${v.n?(v.xg/v.n).toFixed(2):'—'}</span>", " · xG ${v.n&&v.xg!==null?(v.xg/v.n).toFixed(2):'—'}</span>"),
        ('updateTeam(): season table xG', "<td>${v.n?(v.xg/v.n).toFixed(2):'—'}</td></tr>", "<td>${v.n&&v.xg!==null?(v.xg/v.n).toFixed(2):'—'}</td></tr>"),
        ('renderCompletedMatch(): home xG', '<div class="stat"><strong>${m.hx.toFixed(2)}</strong>', '<div class="stat"><strong>${xgText(m.hx)}</strong>'),
        ('renderCompletedMatch(): away xG', '<strong>${m.ax.toFixed(2)}</strong></div></article>', '<strong>${xgText(m.ax)}</strong></div></article>'),
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
    old_engine, new_engine = git_show('analysis/record-engine.cjs'), (ROOT / 'analysis/record-engine.cjs').read_text(encoding='utf8')
    if lang == 'en':
        old_engine, new_engine = escape_korean(old_engine), escape_korean(new_engine)
    assert html.count(old_engine) == 1, 'engine not found once: ' + page
    html = html.replace(old_engine, new_engine)
    patches = []
    for why, before, after in rules(lang):
        assert html.count(before) == 1, 'patch target not unique: ' + page + ' ' + why
        html = html.replace(before, after)
        assert html.count(after) == 1, 'patch result not unique: ' + page + ' ' + why
        patches.append(dict(why=why, before=before, after=after))
    helpers = (HERE / 'xg-helpers.js').read_text(encoding='utf8').rstrip('\n')
    assert html.count(MAIN_START) == 1
    html = html.replace(MAIN_START, '<script id="matchlab-xg-helpers">' + helpers + '</script>' + MAIN_START)
    ui = (HERE / ('refresh-ui.' + lang + '.js')).read_text(encoding='utf8').rstrip('\n')
    assert '</script' not in ui and '</script' not in helpers
    assert html.endswith(END) and html.count('</body>') == 1
    html = html[:-len(END)] + '</script><script id="matchlab-refresh-ui">' + ui + END
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
