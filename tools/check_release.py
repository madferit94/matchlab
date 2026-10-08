"""Check release links, payload identity and manifest; optionally refresh hashes."""
from pathlib import Path
import hashlib,json,re,subprocess,sys

p=Path(__file__).resolve().parents[1]
repo=Path(subprocess.check_output(['git','rev-parse','--show-toplevel'],cwd=p,text=True).strip())
prefix='' if p==repo else p.relative_to(repo).as_posix()+'/'
tracked=subprocess.check_output(['git','ls-files','-z','--',prefix or '.'],cwd=repo).decode().split('\0')
extra=subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z','--',prefix or '.'],cwd=repo).decode().split('\0')
files=sorted(set(x for x in tracked+extra if x and (repo/x).is_file()))
patterns=[re.compile(rb'gh[pousr]_[A-Za-z0-9]{30,}'),re.compile(rb'github_pat_[A-Za-z0-9_]{30,}'),re.compile(rb'AIza[A-Za-z0-9_-]{30,}'),re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')]
for f in files:
    path=Path(f)
    assert not any(part in {'private','raw','.env','__pycache__'} for part in path.parts), f'Excluded file: {f}'
    blob=(repo/f).read_bytes()
    assert not any(rx.search(blob) for rx in patterns), f'Credential-like content in {f}'
    assert (repo/f).stat().st_size<95*1024*1024, f'Oversize file: {f}'
link_docs=list(dict.fromkeys([repo/'README.md',repo/'README.ko.md',p/'README.md',p/'README.ko.md',p/'docs/SPEC-0.22.0.md']))
links=0
for doc in link_docs:
    for target in re.findall(r'\]\(([^)]+)\)',doc.read_text(encoding='utf8')):
        if '://' in target or target.startswith('#'): continue
        if doc.parent==repo and not target.startswith(prefix): continue
        assert (doc.parent/target.split('#')[0]).exists(), f'Missing link in {doc.name}: {target}'
        links+=1
def payload(version):
    html=(p/f'archive/visualizations/visualization-design-2026-10-06-{version}/index.html').read_text(encoding='utf8')
    return json.loads(re.search(r'<script id="data" type="application/json">(.*?)</script>',html,re.S)[1])
assert all(payload(f'v{n}')==payload('v12') for n in range(13,24)), 'Design preview changed source data'
# Verify the exact shared presentation layer before comparing preserved application code.
def presentation_base(name):
    html=(p/name).read_text(encoding='utf8')
    for tag, ident, source in [('style','matchlab-shared-theme','theme.css'),('script','matchlab-shared-search','search.js')]:
        pattern='<'+tag+' id="'+ident+'">([\\s\\S]*?)</'+tag+'>'
        blocks=re.findall(pattern,html)
        assert len(blocks)==1 and blocks[0]==(p/'design/release-0.21.0'/source).read_text(encoding='utf-8-sig'), 'Shared presentation drift: '+name
        html=re.sub(pattern,'',html)
    return html.replace(' data-design="matchlab-2026"','',1)
for page in ['index.html','index.en.html','f1/index.html']: presentation_base(page)
engine_source=(p/'analysis/record-engine.cjs').read_text(encoding='utf8')
assert engine_source in (p/'index.html').read_text(encoding='utf8'), 'Korean analysis engine drift'
engine_en=re.sub('[가-힣]',lambda m:'\\u%04x'%ord(m[0]),engine_source)
assert engine_en in (p/'index.en.html').read_text(encoding='utf8'), 'English analysis engine drift'
assert (p/'analysis/release-0.23.0/f1-natural-analysis.js').read_text(encoding='utf8').strip() in (p/'f1/index.html').read_text(encoding='utf8'), 'F1 analysis engine drift'
for entry in ['index.html','index.en.html','f1/index.html']:
    assert (p/'analysis/release-0.23.0/workbench.js').read_text(encoding='utf8') in (p/entry).read_text(encoding='utf8'), 'Analysis workbench drift: '+entry
f1_html=(p/'f1/index.html').read_text(encoding='utf8')
assert (p/'f1/release-0.9.3/tyre-help.js').read_text(encoding='utf8') in f1_html, 'Tyre help module drift'
for tag,ident,source in [('script','f1-archive-catalog','archive-catalog.js'),('style','f1-archive-catalog-styles','archive.css')]:
    block=re.search('<'+tag+' id="'+ident+'">([\\s\\S]*?)</'+tag+'>',f1_html)
    assert block and block[1]==(p/('f1/release-0.9.0' if source=='archive-catalog.js' else 'f1/release-0.8.7')/source).read_text(encoding='utf8'), 'Archive catalogue drift: '+ident
for ident,source in [('f1-query-history','query-history.json'),('f1-history-analysis','history-analysis.js'),('f1-history-query-styles','history.css')]:
    block=re.search(r'<(?:script|style) id="'+ident+r'"[^>]*>([\s\S]*?)</(?:script|style)>',f1_html)
    assert block and block[1]==(p/('f1/release-0.9.2' if source=='history-analysis.js' else 'f1/release-0.8.6')/source).read_text(encoding='utf8'), 'Historical module drift: '+ident
f1_before=(p/'f1/release-0.8.6/index-before.html').read_text(encoding='utf8')
for ident in ['dataset','forecasts','historical','maps','tracks']:
    rx=r'<script id="'+ident+r'" type="application/json">([\s\S]*?)</script>'
    assert re.search(rx,f1_html)[1]==re.search(rx,f1_before)[1], 'F1 original data drift: '+ident
assert presentation_base('index.html')==(p/'archive/visualizations/visualization-design-2026-10-08-v50/index.html').read_text(encoding='utf8'), 'Default entry differs from adopted v50'

en_html=presentation_base('index.en.html')
assert presentation_base('index.en.html')==(p/'archive/visualizations/visualization-design-2026-10-08-v50/index.en.html').read_text(encoding='utf8')
english=json.loads(re.search(r'<script id="data" type="application/json">(.*?)</script>',en_html,re.S)[1])
korean=payload('v23')
for key in korean:
    if key!='metric_meta': assert korean[key]==english[key], f'English data drift: {key}'
assert len(english['metric_meta'])==47
# The simulation contains a shared bilingual module. Verify its exact source
# identity before excluding that code from the static English-label check;
# dynamic English rendering is covered by the simulation integration checks.
english_labels=re.sub(r'<script id="data" type="application/json">.*?</script>','',en_html,flags=re.S)
for module in ('pixel-simulation.js','integration.js'):
    shared=(p/'simulation/pixel-v2-2026-10-06-v01'/module).read_text(encoding='utf8').strip()
    assert shared in english_labels, f'Shared module differs: {module}'
    english_labels=english_labels.replace(shared,'')
for module in ('team-chart-engine.cjs','team-chart-ui.js'):
    shared=(p/'archive/visualizations/visualization-design-2026-10-07-v31'/module).read_text(encoding='utf8')
    assert shared in english_labels, f'Chart module differs: {module}'
    english_labels=english_labels.replace(shared,'')
shared=(p/'analysis/release-0.23.0/workbench.js').read_text(encoding='utf8')
assert shared in english_labels, 'Shared analysis review module differs'
english_labels=english_labels.replace(shared,'')
# Odds are model inputs, not a separate public comparison interface.
for entry in ['index.html','index.en.html']:
    html=(p/entry).read_text(encoding='utf8')
    for ident in ['football-odds-style','football-odds-data','football-odds-panel']:
        assert 'id="'+ident+'"' not in html, 'Removed odds UI returned: '+entry
report_ui=(p/'reports/release-0.25.0/report-ui.js').read_text(encoding='utf8')
report_css=(p/'reports/release-0.25.0/report.css').read_text(encoding='utf8')
for entry in ['index.html','index.en.html']:
    html=(p/entry).read_text(encoding='utf8')
    assert report_ui in html and report_css in html, 'Automatic report module drift: '+entry
english_labels=english_labels.replace(report_ui,'')
assert not re.search('[가-힣]',english_labels.replace('한국어',''))

old=json.loads((p/'docs/publication_manifest-0.9.0.json').read_text(encoding='utf8'))
labels={item['path']:item['snapshot'] for item in old['files']}
old_hashes={item['path']:item['sha256'] for item in old['files']}
text_ext={'.md','.json','.py','.cjs','.js','.css','.ps1','.example','.html','.txt','.yaml','.yml','.csv','.gitattributes','.gitignore'}
entries=[]
for f in files:
    relative=Path(f).relative_to(p.relative_to(repo)).as_posix()
    if relative=='publication_manifest.json': continue
    b=(repo/f).read_bytes()
    if Path(relative).suffix in text_ext or Path(relative).name in {'.gitignore','.gitattributes','VERSION'}:
        b=b.replace(b'\r\n',b'\n')
    digest=hashlib.sha256(b).hexdigest()
    snapshot=labels[relative] if old_hashes.get(relative)==digest else '0.25.0'
    entries.append(dict(path=relative,bytes=len(b),sha256=digest,snapshot=snapshot))
manifest=dict(version='0.25.0',public_export=True,files=entries,display_dataset=dict(completed=2399,scheduled=641,team_match_rows=4798,season_snapshots=160,metrics=47),csv_demo=dict(completed=20,scheduled=2),published_model_evidence=['prematch-v2 features, model weights, metrics and future probabilities','prior-rank ablation and independent review'],excluded=['full provider caches','complete source modeling CSV','ignored baseline generated runs','local administrator source report','credentials','workshop materials','root personal work journal'],text_hash_encoding='UTF-8 with LF line endings, matching published blob contents')
if '--write-manifest' in sys.argv:
    (p/'publication_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
else:
    actual=json.loads((p/'publication_manifest.json').read_text(encoding='utf8'))
    assert actual==manifest,'Manifest differs from current release files'
print(f'PASS release audit: {len(entries)} hashed files, {links} local documentation links; design payloads identical; no private/admin files or credential-pattern matches.')



