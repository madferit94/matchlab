"""0.26.2 tamper tests: each case changes one thing in a fresh clone of the committed HEAD and runs
tools/check_release.py --write-manifest (all assertions run; the manifest comparison is skipped so the
failure names the real check) and, for some cases, node server/check.cjs. Every case except the control
must FAIL. Usage (work folder must be outside the repository; it is deleted case by case):
  python3 -I design/release-0.26.2/tamper-check.py /tmp/some-empty-folder
Results: design/release-0.26.2/tamper-result.json"""
import hashlib,re,shutil,subprocess,sys,json
from pathlib import Path
SRC=str(Path(__file__).resolve().parents[2])
BASE=Path(sys.argv[1])
def fresh(name):
    d=BASE/name
    if d.exists(): shutil.rmtree(d)
    subprocess.run(['git','clone','-q','--no-hardlinks',SRC,str(d)],check=True)
    return d
def sub(path,old,new,count=1):
    s=path.read_text(encoding='utf8'); assert s.count(old)==count,(path,old,s.count(old)); path.write_text(s.replace(old,new),encoding='utf8')
def rehash(d):
    digest=hashlib.sha256((d/'data/football/predictions.js').read_bytes()).hexdigest()[:16]
    for page in ['index.html','index.en.html']:
        s=(d/page).read_text(encoding='utf8'); s=re.sub(r'predictions\.js\?v=[0-9a-f]{16}','predictions.js?v='+digest,s); (d/page).write_text(s,encoding='utf8')
def generator(d,old,new):
    sub(d/'design/release-0.26.1/compact_predictions.py',old,new)
    subprocess.run([sys.executable,'-I','design/release-0.26.1/compact_predictions.py'],cwd=d,check=True,capture_output=True)
    rehash(d)
def run(d,args):
    r=subprocess.run(args,cwd=d,capture_output=True,text=True)
    lines=(r.stdout+r.stderr).strip().splitlines()
    if r.returncode and args[0]=='node':
        passed=[l for l in r.stdout.splitlines() if l.startswith('PASS ')]
        errors=[l.strip() for l in r.stderr.splitlines() if 'Error' in l or 'Expected' in l or 'message' in l]
        return r.returncode,'after '+str(len(passed))+' passes: '+' | '.join(errors[:2])[:200]
    return r.returncode,(lines[-1] if lines else '')
GEN_RETURN="    return HEAD + dumps(bundle) + TAIL"
cases={
 'control (no change)':lambda d:None,
 'bundle model_accepted true->1 (generator+file+?v=)':lambda d:generator(d,GEN_RETURN,"    assert bundle['model_accepted'] is True\n    bundle['model_accepted']=1\n"+GEN_RETURN),
 'prediction source_date_is_verified_kickoff false->0 (generator+file+?v=)':lambda d:generator(d,GEN_RETURN,"    bundle['predictions'][0]['source_date_is_verified_kickoff']=0\n"+GEN_RETURN),
 'prediction top_scores home 1->1.0 (generator+file+?v=)':lambda d:generator(d,GEN_RETURN,"    bundle['predictions'][0]['score_summary']['top_scores'][0]['home']=1.0\n"+GEN_RETURN),
 'true->1 edited in predictions.js only':lambda d:(sub(d/'data/football/predictions.js','"model_accepted":true','"model_accepted":1'),rehash(d)),
 'README.md version 0.26.1':lambda d:sub(d/'README.md','Current version: **0.26.2**','Current version: **0.26.1**'),
 'README.ko.md version 0.26.1':lambda d:sub(d/'README.ko.md','현재 버전: **0.26.2**','현재 버전: **0.26.1**'),
 'README.md version line removed':lambda d:sub(d/'README.md','Current version: **0.26.2**\n',''),
 'VERSION 0.26.3':lambda d:(d/'VERSION').write_text('0.26.3\n'),
 'notice block removed (ko)':lambda d:(lambda s:(d/'index.html').write_text(re.sub(r'<script id="matchlab-load-notice">[\s\S]*?</script>','',s,count=1),encoding='utf8'))((d/'index.html').read_text(encoding='utf8')),
 'notice block removed (en)':lambda d:(lambda s:(d/'index.en.html').write_text(re.sub(r'<script id="matchlab-load-notice">[\s\S]*?</script>','',s,count=1),encoding='utf8'))((d/'index.en.html').read_text(encoding='utf8')),
 'notice text changed in page only (en)':lambda d:sub(d/'index.en.html','Match data could not be loaded.','Data could not be loaded.'),
 'notice logic changed in en source and page':lambda d:(sub(d/'design/release-0.26.2/load-notice.en.js',"n.style.top='12px'","n.style.top='0px'"),sub(d/'index.en.html',"n.style.top='12px'","n.style.top='0px'")),
 'prediction notice guard removed (ko)':lambda d:sub(d/'index.html',"if(!bundle||!Array.isArray(bundle.predictions)){","if(false){"),
 'grid shape check reverted to 0.26.1 expansion (both pages)':lambda d:[sub(d/p,"bundle.predictions.forEach(p=>{if(!p.scoreDistribution){const g=p.scoreGrid,ok=Array.isArray(g)&&g.length===169&&Array.from(g).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0);p.scoreDistribution=ok?g.map((probability,i)=>({home:Math.floor(i/13),away:i%13,probability})):[];delete p.scoreGrid;}});","bundle.predictions.forEach(p=>{if(Array.isArray(p.scoreGrid)){p.scoreDistribution=p.scoreGrid.map((probability,i)=>({home:Math.floor(i/13),away:i%13,probability}));delete p.scoreGrid;}});") for p in ['index.html','index.en.html']],
 'notice moved after the main script (ko)':lambda d:(lambda s:(lambda blk:(d/'index.html').write_text(s.replace(blk,'',1).replace('<script src="data/football/predictions.js','<script id="matchlab-load-notice">'+blk[len('<script id="matchlab-load-notice">'):],1),encoding='utf8'))(re.search(r'<script id="matchlab-load-notice">[\s\S]*?</script>',s)[0]))((d/'index.html').read_text(encoding='utf8')),
}
results=[]
for i,(name,fn) in enumerate(cases.items()):
    d=fresh('c%02d'%i); fn(d)
    code,msg=run(d,[sys.executable,'-I','tools/check_release.py','--write-manifest'])
    # restore the committed manifest so --write-manifest leaves no trace inside the comparison of a plain run
    entry={'case':name,'check_release':('PASS' if code==0 else 'FAIL'),'message':msg}
    if name.startswith('README') or name.startswith('VERSION') or name.startswith('control') or 'true->1' in name or 'notice block' in name:
        c2,m2=run(d,['node','server/check.cjs']); entry['test_server']=('PASS' if c2==0 else 'FAIL')+' '+m2
    results.append(entry); print(json.dumps(entry,ensure_ascii=False))
    shutil.rmtree(d)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=SRC,text=True).strip()
ok=results[0]['check_release']=='PASS' and all(r['check_release']=='FAIL' for r in results[1:])
Path(SRC,'design/release-0.26.2/tamper-result.json').write_text(json.dumps({'status':'PASS' if ok else 'FAIL','commit':head,'python':sys.version.split()[0],'cases':results},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('PASS' if ok else 'FAIL',len(results),'cases')
sys.exit(0 if ok else 1)
