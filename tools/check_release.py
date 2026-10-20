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
# 0.26.2: one release number everywhere. README "current version" lines must
# match VERSION (they were left at 0.25.3 through 0.26.1).
RELEASE='0.26.2'
version_file=(p/'VERSION').read_text(encoding='utf8').strip()
assert version_file==RELEASE, 'VERSION differs from the release checker version: '+version_file
assert json.loads((p/'package.json').read_text(encoding='utf8'))['version']==RELEASE, 'package.json version differs from VERSION'
for readme,label in [('README.md','Current version: '),('README.ko.md','현재 버전: ')]:
    shown=re.findall(re.escape(label)+r'\*\*([^*\n]+)\*\*',(p/readme).read_text(encoding='utf8'))
    assert shown==[RELEASE], readme+' current version '+repr(shown)+' differs from VERSION '+RELEASE
def payload(version):
    html=(p/f'archive/visualizations/visualization-design-2026-10-06-{version}/index.html').read_text(encoding='utf8')
    return json.loads(re.search(r'<script id="data" type="application/json">(.*?)</script>',html,re.S)[1])
assert all(payload(f'v{n}')==payload('v12') for n in range(13,24)), 'Design preview changed source data'
# 0.26.0: football JSON moved byte-for-byte from the HTML into data/football/*.js.
# Rebuild the former inline page (blocks back in place, the three reading
# expressions reverted, script tags dropped) so every comparison below still
# runs against the archived v50 bytes.
FOOTBALL_DATA={'index.html':'data.ko.js','index.en.html':'data.en.js'}
DATA_PREFIX='window.MatchLabData=window.MatchLabData||{};window.MatchLabData.'
DATA_READERS=[("const D=JSON.parse(document.getElementById('data').textContent)","const D=window.MatchLabData.data"),
              ("const bundle=JSON.parse(document.getElementById('prematch-predictions-v22').textContent);","const bundle=window.MatchLabData.predictions;"),
              ("else Object.values(read('data').teams)","else Object.values(window.MatchLabData.data.teams)")]
data_dir=p/'data/football'
assert data_dir.is_dir() and sorted(x.name for x in data_dir.iterdir())==['data.en.js','data.ko.js','predictions.js'], 'Football data files missing or unexpected files in data/football'
assert sorted(f for f in files if f.startswith(prefix+'data/'))==[prefix+'data/football/'+n for n in ['data.en.js','data.ko.js','predictions.js']], 'Unexpected published files under data/'
def data_json_text(name, key):
    text=(data_dir/name).read_bytes().decode('utf8')
    head=DATA_PREFIX+key+'='
    assert text.startswith(head) and text.endswith(';\n') and text.count('\n')==1, 'Football data file format drift: '+name
    return text[len(head):-2]
# 0.26.1: predictions.js stores scoreGrid (169 numbers, 8 significant digits,
# home goals 0..12 then away goals 0..12) instead of scoreDistribution objects.
# The pages expand it right after reading the bundle. The rebuild below puts the
# ORIGINAL v50 prediction block back and removes that expansion, so the v50
# byte comparisons keep running unchanged; the compact file is checked against
# the v50 original separately.
V50=p/'archive/visualizations/visualization-design-2026-10-08-v50'
# 0.26.2: the statement after the reader (a) stops quietly when the match data
# object is missing (the top notice is already shown), (b) shows the load notice
# in the simulation place when the prediction object is missing, and (c) expands
# scoreGrid only when it is exactly 169 finite non-negative numbers; otherwise
# it sets an empty scoreDistribution so the simulation's own validation fails
# and the existing "invalid probabilities" message is shown. The whole
# statement is removed in the rebuild, exactly like the 0.26.1 expansion was.
PREDICTION_EXPANSION=("if(!window.MatchLabData.data)return;"
    "if(!bundle||!Array.isArray(bundle.predictions)){let host=null;const show=()=>{if(host)host.remove();host=null;if(V!=='matches'||!selected)return;host=document.createElement('div');host.id='prediction-simulation-v22';host.appendChild(MatchLabLoadNotice('predictions'));document.getElementById('matches').appendChild(host);};const baseMatches=renderMatches;renderMatches=function(){baseMatches();show();};const baseRender=render;render=function(){baseRender();show();};window.addEventListener('pagehide',()=>{if(host)host.remove();host=null;});show();return;}"
    "bundle.predictions.forEach(p=>{if(!p.scoreDistribution){const g=p.scoreGrid,ok=Array.isArray(g)&&g.length===169&&Array.from(g).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);p.scoreDistribution=ok?g.map((probability,i)=>({home:Math.floor(i/13),away:i%13,probability})):[];delete p.scoreGrid;}});")
# 0.26.2: load-failure notice, inlined right after the language data tag. The
# sources live in design/release-0.26.2; logic is identical, only the text line
# differs by language. The rebuild removes the block before the v50 comparison.
NOTICE_LANG={'index.html':'ko','index.en.html':'en'}
NOTICE_TEXT={'ko':['경기 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.','예측 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'],
             'en':['Match data could not be loaded. Please refresh in a moment.','Prediction data could not be loaded. Please refresh in a moment.']}
def notice_block(name):
    lang=NOTICE_LANG[name]
    source=(p/'design/release-0.26.2'/('load-notice.'+lang+'.js')).read_text(encoding='utf8').rstrip('\n')
    assert all(text in source for text in NOTICE_TEXT[lang]), 'Load notice text missing: '+lang
    assert '</script' not in source, 'Load notice source cannot be inlined'
    return '<script id="matchlab-load-notice">'+source+'</script>'
notice_logic=[re.sub(r"^const text=\{.*\};$",'',(p/'design/release-0.26.2'/('load-notice.'+lang+'.js')).read_text(encoding='utf8'),flags=re.M) for lang in ['ko','en']]
assert notice_logic[0]==notice_logic[1], 'Load notice logic differs by language'
assert not re.search('[가-힣]',(p/'design/release-0.26.2/load-notice.en.js').read_text(encoding='utf8')), 'Korean text in the English load notice'
def strict_equal(a,b):
    """JSON value equality that also compares types: True != 1 and 1 != 1.0."""
    if type(a) is not type(b): return False
    if isinstance(a,dict): return list(a)==list(b) and all(strict_equal(a[k],b[k]) for k in a)
    if isinstance(a,list): return len(a)==len(b) and all(strict_equal(x,y) for x,y in zip(a,b))
    return a==b
def v50_block(name, ident):
    blocks=re.findall(r'<script id="'+ident+r'" type="application/json">([\s\S]*?)</script>',(V50/name).read_text(encoding='utf8'))
    assert len(blocks)==1, 'Archived v50 block missing: '+name+' '+ident
    return blocks[0]
ORIGINAL_PREDICTIONS=v50_block('index.html','prematch-predictions-v22')
assert ORIGINAL_PREDICTIONS==v50_block('index.en.html','prematch-predictions-v22'), 'Archived v50 prediction blocks differ by language'
def data_tag(name):
    digest=hashlib.sha256((data_dir/name).read_bytes()).hexdigest()[:16]
    return '<script src="data/football/'+name+'?v='+digest+'"></script>'
def reconstruct_inline(name):
    html=(p/name).read_text(encoding='utf8')
    notice=data_tag(FOOTBALL_DATA[name])+notice_block(name)
    assert html.count(notice_block(name))==1 and html.count(notice)==1, 'Load notice missing or moved: '+name
    html=html.replace(notice,data_tag(FOOTBALL_DATA[name]))
    for file,key,ident in [(FOOTBALL_DATA[name],'data','data'),('predictions.js','predictions','prematch-predictions-v22')]:
        tag=data_tag(file)
        assert html.count(tag)==1, 'Football data tag missing or ?v= hash differs from file contents: '+name+' '+file
        block=ORIGINAL_PREDICTIONS if file=='predictions.js' else data_json_text(file,key)
        html=html.replace(tag,'<script id="'+ident+'" type="application/json">'+block+'</script>')
    reader=DATA_READERS[1][1]
    assert html.count(PREDICTION_EXPANSION)==1 and html.count(reader+PREDICTION_EXPANSION)==1, 'Score grid expansion missing or moved: '+name
    html=html.replace(reader+PREDICTION_EXPANSION,reader)
    for before,after in DATA_READERS:
        assert html.count(after)==1 and html.count(before)==0, 'Football data reader drift: '+name
        html=html.replace(after,before)
    assert 'data/football/' not in html and 'MatchLabData' not in html and 'matchlab-load-notice' not in html, 'Unexpected extra football data reference: '+name
    return html
def page_source(name):
    return reconstruct_inline(name) if name in FOOTBALL_DATA else (p/name).read_text(encoding='utf8')
for name in FOOTBALL_DATA:
    live=(p/name).read_text(encoding='utf8')
    assert not re.search(r'<script id="(?:data|prematch-predictions-v22)" type="application/json">',live), 'Inline football JSON returned: '+name
    rebuilt=reconstruct_inline(name)
    assert data_tag('predictions.js') in live, 'Prediction file is not shared by both languages: '+name
    archived=(p/'archive/visualizations/visualization-design-2026-10-08-v50'/name).read_text(encoding='utf8')
    for ident in ['data','prematch-predictions-v22']:
        rx=r'<script id="'+ident+r'" type="application/json">([\s\S]*?)</script>'
        assert re.findall(rx,rebuilt)==re.findall(rx,archived) and len(re.findall(rx,archived))==1, 'Football data differs from v50: '+name+' '+ident
assert data_json_text('data.ko.js','data')!=data_json_text('data.en.js','data'), 'Language data files unexpectedly identical'
# 0.26.1 compact prediction file checks.
import importlib.util
sys.dont_write_bytecode=True  # no __pycache__ inside the published tree
compact_spec=importlib.util.spec_from_file_location('compact_predictions',p/'design/release-0.26.1/compact_predictions.py')
compact_module=importlib.util.module_from_spec(compact_spec); compact_spec.loader.exec_module(compact_module)
assert compact_module.build().encode('utf8')==(data_dir/'predictions.js').read_bytes(), 'predictions.js differs from compact_predictions.py output'
original_bundle=json.loads(ORIGINAL_PREDICTIONS)
compact_bundle=json.loads(data_json_text('predictions.js','predictions'))
assert list(compact_bundle)==list(original_bundle) and all(strict_equal(compact_bundle[k],original_bundle[k]) for k in original_bundle if k!='predictions'), 'Prediction bundle fields differ from v50'
assert len(compact_bundle['predictions'])==len(original_bundle['predictions'])==641, 'Prediction count drift'
worst_outcome_error=0.0
for compact_p,original_p in zip(compact_bundle['predictions'],original_bundle['predictions']):
    key=original_p['match_key']
    assert list(compact_p)==['scoreGrid' if k=='scoreDistribution' else k for k in original_p], 'Prediction key order drift: '+key
    assert all(strict_equal(compact_p[k],original_p[k]) for k in original_p if k!='scoreDistribution'), 'Prediction field differs from v50 (value or type): '+key
    cells=original_p['scoreDistribution']; grid=compact_p['scoreGrid']
    assert len(cells)==len(grid)==169 and all((c['home'],c['away'])==divmod(i,13) for i,c in enumerate(cells)), 'Score grid shape drift: '+key
    assert all(type(v) is float and v==float(f"{c['probability']:.8g}") for v,c in zip(grid,cells)), 'Score cell is not the 8-digit rounding of v50: '+key
    masses=[0.0,0.0,0.0]
    for v,c in zip(grid,cells): masses[0 if c['home']>c['away'] else 1 if c['home']==c['away'] else 2]+=v
    error=max(abs(m-compact_p['probabilities'][o]) for m,o in zip(masses,['home','draw','away']))
    assert error<1e-6, 'Score grid outcome mass differs by 1e-6 or more: '+key
    worst_outcome_error=max(worst_outcome_error,error)
# Verify the exact shared presentation layer before comparing preserved application code.
def presentation_base(name, normalize_analysis=True):
    html=page_source(name)
    for tag, ident, source in [('style','matchlab-shared-theme','theme.css'),('script','matchlab-shared-search','search.js')]:
        pattern='<'+tag+' id="'+ident+'">([\\s\\S]*?)</'+tag+'>'
        blocks=re.findall(pattern,html)
        assert len(blocks)==1 and blocks[0]==(p/'design/release-0.21.0'/source).read_text(encoding='utf-8-sig'), 'Shared presentation drift: '+name
        html=re.sub(pattern,'',html)
    if name in ['index.html','index.en.html']:
        css=(p/'design/release-0.25.3/comparison.css').read_text(encoding='utf8')
        block='<style id="matchlab-comparison-bars">'+css+'</style>'
        assert html.count(block)==1, 'Comparison bar styles drift: '+name
        html=html.replace(block,'')
        patch=json.loads((p/'design/release-0.25.3/render-patch.json').read_text(encoding='utf8'))[name]
        assert html.count(patch['after'])==1, 'Comparison row render drift: '+name
        if normalize_analysis: html=html.replace(patch['after'],patch['before'])
    html=html.replace(' data-design="matchlab-2026"','',1)
    # Compare all unrelated markup against v50, normalizing only the two patched modules.
    if normalize_analysis and name in ['index.html','index.en.html']:
        archived=(p/'archive/visualizations/visualization-design-2026-10-08-v50'/name).read_text(encoding='utf8')
        pattern=r'<script id="matchlab-analysis-workbench">([\s\S]*?)</script>'
        original=re.search(pattern,archived)
        assert original, 'Archived workbench missing'
        html=re.sub(pattern,lambda m:original[0],html)
        live_engine=(p/'analysis/record-engine.cjs').read_text(encoding='utf8')
        start=archived.index('/* Browser-native recorded-data analysis.')
        closing=live_engine.rstrip().splitlines()[-1]
        original_engine=archived[start:archived.index(closing,start)+len(closing)]+'\n'
        if name=='index.en.html': live_engine=re.sub('[가-힣]',lambda m:'\\u%04x'%ord(m[0]),live_engine)
        assert live_engine in html, 'Live engine missing before archive comparison'
        html=html.replace(live_engine,original_engine)
    return html
for page in ['index.html','index.en.html','f1/index.html']: presentation_base(page)
engine_source=(p/'analysis/record-engine.cjs').read_text(encoding='utf8')
assert engine_source in (p/'index.html').read_text(encoding='utf8'), 'Korean analysis engine drift'
engine_en=re.sub('[가-힣]',lambda m:'\\u%04x'%ord(m[0]),engine_source)
assert engine_en in (p/'index.en.html').read_text(encoding='utf8'), 'English analysis engine drift'
assert (p/'analysis/release-0.23.0/f1-natural-analysis.js').read_text(encoding='utf8').strip() in (p/'f1/index.html').read_text(encoding='utf8'), 'F1 analysis engine drift'
for entry in ['index.html','index.en.html','f1/index.html']:
    assert (p/'analysis/release-0.25.2/workbench.js').read_text(encoding='utf8') in (p/entry).read_text(encoding='utf8'), 'Analysis workbench drift: '+entry
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
english_live=presentation_base('index.en.html', normalize_analysis=False)
english_labels=re.sub(r'<script id="data" type="application/json">.*?</script>','',english_live,flags=re.S)
for module in ('pixel-simulation.js','integration.js'):
    shared=(p/'simulation/pixel-v2-2026-10-06-v01'/module).read_text(encoding='utf8').strip()
    assert shared in english_labels, f'Shared module differs: {module}'
    english_labels=english_labels.replace(shared,'')
for module in ('team-chart-engine.cjs','team-chart-ui.js'):
    shared=(p/'archive/visualizations/visualization-design-2026-10-07-v31'/module).read_text(encoding='utf8')
    assert shared in english_labels, f'Chart module differs: {module}'
    english_labels=english_labels.replace(shared,'')
shared=(p/'analysis/release-0.25.2/workbench.js').read_text(encoding='utf8')
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
# Preserve the last committed version label for unchanged file hashes.
try:
    committed=json.loads(subprocess.check_output(['git','show','HEAD:'+prefix+'publication_manifest.json'],cwd=repo,text=True,encoding='utf8'))
    old['files'].extend(committed['files'])
except (subprocess.CalledProcessError, KeyError, json.JSONDecodeError):
    pass
labels={item['path']:item['snapshot'] for item in old['files']}
old_hashes={item['path']:item['sha256'] for item in old['files']}
text_ext={'.md','.json','.py','.cjs','.js','.css','.ps1','.example','.html','.txt','.yaml','.yml','.csv','.gitattributes','.gitignore'}
entries=[]
for f in files:
    relative=Path(f).relative_to(p.relative_to(repo)).as_posix()
    if relative=='publication_manifest.json': continue
    b=(repo/f).read_bytes()
    # Normalise line endings for every non-binary file so the manifest matches on Windows and macOS/Linux checkouts alike.
    if Path(relative).suffix in text_ext or Path(relative).name in {'.gitignore','.gitattributes','VERSION'} or b'\0' not in b:
        b=b.replace(b'\r\n',b'\n')
    digest=hashlib.sha256(b).hexdigest()
    snapshot=labels[relative] if old_hashes.get(relative)==digest else RELEASE
    entries.append(dict(path=relative,bytes=len(b),sha256=digest,snapshot=snapshot))
manifest=dict(version=RELEASE,public_export=True,files=entries,display_dataset=dict(completed=2399,scheduled=641,team_match_rows=4798,season_snapshots=160,metrics=47),csv_demo=dict(completed=20,scheduled=2),published_model_evidence=['prematch-v2 features, model weights, metrics and future probabilities','prior-rank ablation and independent review'],excluded=['full provider caches','complete source modeling CSV','ignored baseline generated runs','local administrator source report','credentials','workshop materials','root personal work journal'],text_hash_encoding='UTF-8 with LF line endings, matching published blob contents')
if '--write-manifest' in sys.argv:
    (p/'publication_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
else:
    actual=json.loads((p/'publication_manifest.json').read_text(encoding='utf8'))
    assert actual==manifest,'Manifest differs from current release files'
print(f'PASS release audit: {len(entries)} hashed files, {links} local documentation links; design payloads identical; compact predictions = v50 except 8-digit score cells (641 matches, worst outcome error {worst_outcome_error:.1e}); no private/admin files or credential-pattern matches.')



