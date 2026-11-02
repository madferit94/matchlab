"""Build the 0.27.1 football pages from the 0.27.0 pages (git 8bffcc6) and write page-patch.json.

python3 -I design/release-0.27.1/build_pages.py          # writes index.html, index.en.html, page-patch.json
python3 -I design/release-0.27.1/build_pages.py --check  # rebuild in memory and compare with the files

Changes, all recorded so tools/check_release.py can undo them before the 0.27.0 and v50 comparisons:
1. data tag ?v= hash follows the data file with archive xG (the checker recomputes it from the file).
2. <script id="matchlab-refresh-ui"> now holds refresh-ui.<lang>.js from this folder (xG for 5 of 60 refreshed
   matches: header count, xG column in the finished-match table, source and method note in the match room,
   accurate note on this season's xG questions).
3. Small code and text edits (page-patch.json, before -> after, each exactly once).
4. Review fixes: the analysis engine inlined from analysis/record-engine.cjs (English page: Korean as \\u escapes);
   R1 the analysis answer labels follow xG / xGA; R2 a "shot sum" mark wherever an archive shot-sum xG is shown
   (match room, team and preview tables, analysis answers); R7 a "team not found" message.
"""
from pathlib import Path
import hashlib, json, re, sys, subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BASE_COMMIT = '8bffcc6'
PAGES = {'index.html': ('ko', 'data.ko.js'), 'index.en.html': ('en', 'data.en.js')}
UI_START = '<script id="matchlab-refresh-ui">'
END = '</script></body></html>'


def git_show(path):
    return subprocess.check_output(['git', 'show', BASE_COMMIT + ':' + path], cwd=ROOT).decode('utf8')


def escape_korean(text):
    return re.sub('[가-힣]', lambda m: '\\u%04x' % ord(m[0]), text)


def rules(lang):
    ko = lang == 'ko'
    mark = '슈팅 합계' if ko else 'shot sum'
    actual_before = '"actual": "실제 득점", ' if ko else '"actual": "Actual goals", '
    actual_after = actual_before + ('"actualAgainst": "실제 실점", "seriesAgainst": "초록 막대: 기대 실점 · 노랑 막대: 실제 실점", '
                                    '"shotSumNote": "* 슈팅 합계: Understat 슈팅별 xG를 더한 값(Internet Archive 사본)이 들어간 수치입니다.", '
                                    '"team_not_found": "팀을 찾지 못했어요. 프리미어리그·라리가 구단 이름으로 다시 질문해 주세요.", ' if ko else
                                    '"actualAgainst": "Goals conceded", "seriesAgainst": "Green bars: expected goals against · Yellow bars: goals conceded", '
                                    '"shotSumNote": "* Shot sum: includes xG added up from Understat per-shot values (Internet Archive copy).", '
                                    '"team_not_found": "Team not found. Ask about a Premier League or LaLiga club.", ')
    label = '기대 득점 (xG)' if ko else 'Expected goals (xG)'
    review_fixes = [
        ('R2: xgMark() helper for shot-sum xG (next to xgText)',
         "function xgText(v){return typeof v==='number'&&Number.isFinite(v)?v.toFixed(2):'—'}</script>",
         "function xgText(v){return typeof v==='number'&&Number.isFinite(v)?v.toFixed(2):'—'}\n"
         "function xgMark(m,v){return m&&m.xg_method==='shot_sum'&&typeof v==='number'&&Number.isFinite(v)?'<br><small class=\"muted xg-mark\">" + mark + "</small>':''}</script>"),
        ('R2: rows() xG cell mark',
         "<td>${xgText(h?m.hx:m.ax)}</td></tr>`}).join('')}</tbody></table></div>`}\nconst fixtureLimits",
         "<td>${xgText(h?m.hx:m.ax)}${xgMark(m,h?m.hx:m.ax)}</td></tr>`}).join('')}</tbody></table></div>`}\nconst fixtureLimits"),
        ('R2: historyRows() xG cell marks',
         "<td>${xgText(h?m.hx:m.ax)}</td><td>${xgText(h?m.ax:m.hx)}</td>",
         "<td>${xgText(h?m.hx:m.ax)}${xgMark(m,h?m.hx:m.ax)}</td><td>${xgText(h?m.ax:m.hx)}${xgMark(m,h?m.ax:m.hx)}</td>"),
        ('R2: overviewRecent() xG cell mark',
         "${f}:${a}</td><td>${xgText(h?m.hx:m.ax)}</td>", "${f}:${a}</td><td>${xgText(h?m.hx:m.ax)}${xgMark(m,h?m.hx:m.ax)}</td>"),
        ('R2: match room xG label mark',
         '<div class="stat"><strong>${xgText(m.hx)}</strong><div><label>' + label + '</label></div>',
         '<div class="stat"><strong>${xgText(m.hx)}</strong><div><label>' + label + '${xgMark(m,m.hx)}</label></div>'),
        ('R1, R2, R7: analysis texts for xGA trends, the shot-sum note and team not found', actual_before, actual_after),
        ('R2: analysis chart value mark', "<strong>${r.value===null?'—':r.value.toFixed(2)}${result.unit}${r.actual!==undefined?' / '+r.actual:''}</strong>",
         "<strong>${r.value===null?'—':r.value.toFixed(2)}${r.shotSum?'*':''}${result.unit}${r.actual!==undefined?' / '+r.actual:''}</strong>"),
        ('R2: analysis table value mark', "<td>${r.value===null?'—':r.value.toFixed(2)}${result.unit}</td>",
         "<td>${r.value===null?'—':r.value.toFixed(2)}${r.shotSum?'*':''}${result.unit}</td>"),
        ('R1, R2: analysis labels follow xG / xGA; shot-sum note', 'const actual=result.rows.some(r=>r.actual!==undefined);',
         "const actual=result.rows.some(r=>r.actual!==undefined),against=result.metric==='xga',actualLabel=against?analystText.actualAgainst:analystText.actual,shotNote=result.rows.some(r=>r.shotSum)?'<p class=\"analystlegend\">'+esc(analystText.shotSumNote)+'</p>':'';"),
        ('R1: analysis heading', "<h3>${esc(metric)}${actual?' / '+esc(analystText.actual):''}</h3>", "<h3>${esc(metric)}${actual?' / '+esc(actualLabel):''}</h3>"),
        ('R1: analysis legend', '${actual?`<p class="analystlegend">${esc(analystText.series)}</p>`:\'\'}',
         '${actual?`<p class="analystlegend">${esc(against?analystText.seriesAgainst:analystText.series)}</p>`:\'\'}'),
        ('R1, R2: analysis table heading and shot-sum note', "${actual?'<th>'+esc(analystText.actual)+'</th>':''}</tr></thead><tbody>${rows}</tbody></table></div>`;",
         "${actual?'<th>'+esc(actualLabel)+'</th>':''}</tr></thead><tbody>${rows}</tbody></table></div>${shotNote}`;"),
        ('R1: analysis condition summary (shared workbench copy in this page)', "(p.compareGoals?tr(' / 실제 득점',' / actual goals'):'')",
         "(p.compareGoals?(p.metric==='xga'?tr(' / 실제 실점',' / goals conceded'):tr(' / 실제 득점',' / actual goals')):'')"),
        ('R7: team not found message (shared workbench copy in this page)', "team:['구단 이름을 적거나",
         "team_not_found:['팀을 찾지 못했어요. 프리미어리그·라리가 구단 이름으로 다시 질문해 주세요.','Team not found. Ask about a Premier League or LaLiga club.'],team:['구단 이름을 적거나"),
    ]
    old_note, new_note = {
        'ko': ('<div class="muted">xG 자료가 없는 경기(football-data.co.uk 결과)는 점을 표시하지 않습니다.</div>',
               '<div class="muted">xG 자료가 없는 경기(2026-09-20 이후 결과 대부분)는 점을 표시하지 않습니다.</div>'),
        'en': ('<div class="muted">Matches without xG (football-data.co.uk results) have no point.</div>',
               '<div class="muted">Matches without xG (most results after 2026-09-20) have no point.</div>')}[lang]
    return [
        ('preview xG chart note: some football-data.co.uk results now have xG', old_note, new_note),
    ] + review_fixes


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
