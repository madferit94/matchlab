'use strict';
/* 0.26.2 browser check.
   1. Normal pages: the previous release (git main = 0.26.1) and the current working tree must render
      the same visible output (text of the main areas, <main> markup, screenshots, fixed-seed simulation
      over all 641 predictions) for ko/en x 390/1440, with 0 page errors and no horizontal overflow.
   2. Load failures: each football data file is blocked through request routing (aborted, 404, or served
      without its object). The page must show the load notice in its own language; console and page
      errors are recorded.
   3. Malformed scoreGrid for one match (Arsenal-Leeds): the simulation must show its existing
      "invalid probabilities" message instead of silently using fixed scores. The previous release is
      run with the same inputs for the record only.
   Playwright is not a project dependency: run with NODE_PATH pointing at a separate install, e.g.
   NODE_PATH=/path/to/pw/node_modules CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     node design/release-0.26.2/check-browser.cjs
   Optional: OLD_REF (default main). */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),oldRef=process.env.OLD_REF||'main';
const PREVIEW='understat:31230';// Arsenal vs Leeds, 2026-10-10
const OTHER_PREVIEW_INDEX=0;// another upcoming EPL fixture, to see the notice follow a match change
const QUESTIONS={ko:'아스널 최근 5경기 득점과 기대 득점 비교해 줘',en:'Compare Arsenal goals and expected goals in the last 5 matches'};
const SEARCHES=['Arsenal','real'];
const SEEDS=20,RANDOM_SEED=20261021;
const NOTICE={ko:{data:'경기 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.',predictions:'예측 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'},
 en:{data:'Match data could not be loaded. Please refresh in a moment.',predictions:'Prediction data could not be loaded. Please refresh in a moment.'}};
const INVALID={ko:'모델 확률 검증에 실패해 시뮬레이션을 표시하지 않습니다.',en:'Invalid model probabilities. Simulation is unavailable.'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
// The automatic report stamps its creation time inside a closed <details>; mask only that clock text.
const mainMarkup=html=>html.replace(/(보고서 생성: |Report generated: )[^<]*/g,'$1<time masked>');
function extractOld(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'matchlab-0.26.2-old-'));
 const tar=execFileSync('git',['archive','--format=tar',oldRef,'index.html','index.en.html','f1/index.html','server','analysis/record-engine.cjs','reports/release-0.25.0','data/football'],{cwd:root,maxBuffer:256*1024*1024});
 execFileSync('tar',['-x','-C',dir],{input:tar,maxBuffer:256*1024*1024});
 assert(!fs.readFileSync(path.join(dir,'index.html'),'utf8').includes('matchlab-load-notice'),'Old ref must not contain the load notice');
 return dir;
}
const listen=server=>new Promise(r=>server.listen(0,'127.0.0.1',()=>r('http://127.0.0.1:'+server.address().port)));
const close=server=>{server.closeAllConnections();return new Promise(r=>server.close(r))};
async function overflow(page){return page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)}
// Same pseudo-random sequence for both versions so the simulation sample and any other random use match.
function seedRandom(seed){let a=seed;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pageSimulation({seeds}){
 function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
 function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
 const list=window.MatchLabData.predictions.predictions,rows=[],shape={predictions:list.length,withGrid:0,cellCounts:{}};
 for(const p of list){
  if('scoreGrid' in p)shape.withGrid++;
  const n=Array.isArray(p.scoreDistribution)?p.scoreDistribution.length:-1;shape.cellCounts[n]=(shape.cellCounts[n]||0)+1;
  const input={model:p.model_id,status:p.status,home:p.home_team,away:p.away_team,probabilities:[p.probabilities.home,p.probabilities.draw,p.probabilities.away],scoreDistribution:p.scoreDistribution};
  for(let s=0;s<seeds;s++){const r=MatchDeskSimulation.sample(input,mulberry32(hash(p.match_key+'#'+s)));rows.push(p.match_key+'#'+s+'='+r.outcome+':'+r.score.join('-')+(r.scoreFromModel?'':'!'))}
 }
 return {rows,shape};
}
async function newPage(browser,base,width,routes){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 await context.addInitScript(seedRandom,RANDOM_SEED);
 const page=await context.newPage(),errors=[],consoleErrors=[],requests=[],aborted=new Set();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
 // Only the local server is reachable; optional per-path overrides for the data files.
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==new URL(base).origin){aborted.add(url.origin);return route.abort()}
  requests.push(url.pathname+url.search);const override=routes&&routes[url.pathname];if(override)return override(route);return route.continue()});
 return {context,page,errors,consoleErrors,requests,aborted};
}
// Screenshot once the area has settled: two consecutive captures 300 ms apart must be byte-identical
// (late logo fallbacks or report rendering would otherwise make a comparison flaky).
async function shot(locator,file){const page=locator.page?locator.page():locator;let buffer=await locator.screenshot({animations:'disabled'});
 for(let i=0;i<8;i++){await page.waitForTimeout(300);const next=await locator.screenshot({animations:'disabled'});if(next.equals(buffer))break;buffer=next;}
 if(file)fs.writeFileSync(path.join(__dirname,file),buffer);return buffer}
// 1. Normal page capture (same steps for both versions).
async function captureNormal(browser,base,lang,width,keep){
 const {context,page,errors,consoleErrors,requests,aborted}=await newPage(browser,base,width);
 const file=lang==='ko'?'index.html':'index.en.html',out={},shots={},overflowAt={},extra={};
 await page.goto(base+'/'+file+'#matches',{waitUntil:'load'});
 await page.locator('#fixtures .fixture').first().waitFor();
 out.notices=await page.locator('.matchlab-load-notice,[data-load-notice]').count();
 out.lastDate=await page.locator('#lastdate').innerText();
 out.listMain=sha(mainMarkup(await page.locator('main').evaluate(n=>n.outerHTML)));
 out.bodyText=await page.locator('body').innerText();
 shots.list=await shot(page,null);
 out.upcoming={};
 for(const league of ['EPL','La_liga']){await page.locator('#league').selectOption(league);out.upcoming[league]=(await page.locator('#fixtures').innerText())+'\n'+(await page.locator('#fixturepagination').innerText());}
 await page.locator('#league').selectOption('EPL');
 overflowAt.list=await overflow(page);
 out.search={};
 for(const q of SEARCHES){await page.locator('#ml-search').fill(q);await page.locator('#ml-searchresults').waitFor();out.search[q]=await page.locator('#ml-searchresults').innerText();}
 await page.locator('#ml-search').fill('');
 overflowAt.search=await overflow(page);
 await page.evaluate(id=>{location.hash='preview='+encodeURIComponent(id)},PREVIEW);
 await page.locator('#prediction-simulation-v22').waitFor();
 const report=page.locator('#match-ai-report');await report.locator('.match-report-verdict').waitFor({timeout:30000});
 out.preview=await page.locator('#comparison').innerText();
 out.simulation=await page.locator('#prediction-simulation-v22').innerText();
 out.simulationMounted=await page.locator('#prediction-simulation-v22 section.md-pixel-simulation canvas').count()>0;
 out.report=await report.innerText();
 out.previewMain=sha(mainMarkup(await page.locator('main').evaluate(n=>n.outerHTML)));
 out.previewNotices=await page.locator('[data-load-notice]').count();
 overflowAt.preview=await overflow(page);
 shots.preview=await shot(page.locator('#matches'),keep?'preview-'+lang+'-'+width+'.png':null);
 shots.simulation=await shot(page.locator('#prediction-simulation-v22'),null);
 const sim=await page.evaluate(pageSimulation,{seeds:SEEDS});
 out.fixedSeedAllDigest=sha(sim.rows.join('\n'));extra.simRows=sim.rows;extra.shape=sim.shape;
 await page.locator('#analystmode').selectOption('local');await page.locator('#analystquery').fill(QUESTIONS[lang]);await page.locator('#analystsubmit').click();
 await page.locator('#analystresult .ml-analysis-context').waitFor();
 out.analysis=await page.locator('#analystresult').innerText();
 overflowAt.analysis=await overflow(page);
 shots.analysis=await shot(page.locator('#analystresult'),null);
 await context.close();
 return {out,shots,extra,errors,consoleErrors,overflowAt,abortedOrigins:[...aborted].sort(),dataRequests:requests.filter(r=>r.startsWith('/data/'))};
}
// 2. Load-failure capture.
const MODES={abort:route=>route.abort('failed'),notfound:route=>route.fulfill({status:404,contentType:'text/plain',body:'not found'}),noobject:route=>route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:'/* loaded without the data object */\n'})};
async function captureFailure(browser,base,lang,width,blocked,mode,keep){
 const {context,page,errors,consoleErrors,requests}=await newPage(browser,base,width,{['/data/football/'+blocked]:MODES[mode]});
 const file=lang==='ko'?'index.html':'index.en.html',result={lang,width,blocked,mode};
 await page.goto(base+'/'+file+'#matches',{waitUntil:'load'});
 await page.waitForTimeout(300);
 const kind=blocked==='predictions.js'?'predictions':'data';
 result.responsive=await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>r(document.readyState))));
 result.fixtureCards=await page.locator('#fixtures .fixture').count();
 result.languageLinks=await page.locator('.language-switch a').count();
 if(kind==='data'){
  const n=page.locator('[data-load-notice="data"]');
  result.noticeCount=await page.locator('[data-load-notice]').count();
  result.noticeVisible=await n.isVisible();
  result.noticeText=result.noticeVisible?await n.innerText():null;
  result.noticeIsFirstInMain=await page.evaluate(()=>{const m=document.querySelector('main');return !!m&&m.firstElementChild&&m.firstElementChild.dataset.loadNotice==='data'});
  const box=result.noticeCount?await n.boundingBox():null;result.noticeTop=box&&Math.round(box.y);result.noticeInFirstScreen=!!box&&box.y>=0&&box.y+box.height<=900;
  result.noticeRole=result.noticeCount?await n.getAttribute('role'):null;
  if(keep)await shot(page,'notice-data-'+lang+'-'+width+'.png');
 }else{
  result.topNotice=await page.locator('main > [data-load-notice]').count();
  await page.evaluate(id=>{location.hash='preview='+encodeURIComponent(id)},PREVIEW);
  await page.locator('#prediction-simulation-v22').waitFor({timeout:5000}).catch(()=>{});// the previous release shows no simulation place at all
  result.simulationPlace=await page.locator('#prediction-simulation-v22').count();
  const n=page.locator('#prediction-simulation-v22 [data-load-notice="predictions"]');
  result.noticeCount=await page.locator('[data-load-notice]').count();
  result.noticeVisible=await n.isVisible();
  result.noticeText=result.noticeVisible?await n.innerText():null;
  result.noticeRole=await n.count()?await n.getAttribute('role'):null;
  result.simulationCanvas=await page.locator('#prediction-simulation-v22 canvas').count();
  result.previewShown=(await page.locator('#comparison').innerText()).length>0;
  if(keep)await shot(page.locator('#matches'),'notice-predictions-'+lang+'-'+width+'.png');
  // Switch to another fixture: the old notice must not stay behind, a new one appears for the new match.
  const other=await page.evaluate(([i,skip])=>{const p=window.MatchLabData.data.scheduled.filter(m=>m.league==='EPL'&&m.date>='2026-10-06'&&m.id!==skip).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));return p[i]&&p[i].id},[OTHER_PREVIEW_INDEX,PREVIEW]).catch(()=>null);
  if(other&&other!==PREVIEW){await page.evaluate(id=>{location.hash='preview='+encodeURIComponent(id)},other);await page.waitForTimeout(300);result.afterSwitch={match:other,notices:await page.locator('#prediction-simulation-v22 [data-load-notice="predictions"]').count(),hosts:await page.locator('#prediction-simulation-v22').count()};}
  // Team view has no simulation place: the notice must go away with it.
  await page.locator('nav button[data-view="team"]').click();await page.waitForTimeout(200);
  result.noticeInTeamView=await page.locator('[data-load-notice="predictions"]').count();
 }
 result.overflow=await overflow(page);
 result.pageErrors=errors;result.consoleErrors=consoleErrors;result.dataRequests=requests.filter(r=>r.startsWith('/data/'));
 await context.close();
 return result;
}
// 3. Malformed scoreGrid for the preview match.
const PRED_PREFIX='window.MatchLabData=window.MatchLabData||{};window.MatchLabData.predictions=';
const predictionsText=fs.readFileSync(path.join(root,'data/football/predictions.js'),'utf8');
function malformed(change){
 assert(predictionsText.startsWith(PRED_PREFIX)&&predictionsText.endsWith(';\n'));
 const bundle=JSON.parse(predictionsText.slice(PRED_PREFIX.length,-2)),p=bundle.predictions.find(x=>x.match_key===PREVIEW);
 assert(Array.isArray(p.scoreGrid)&&p.scoreGrid.length===169);change(p);
 return PRED_PREFIX+JSON.stringify(bundle)+';\n';
}
const GRID_CASES={
 unchanged:p=>{},
 cells170:p=>{p.scoreGrid.push(0)},
 nullCell:p=>{p.scoreGrid[14]=null},
 missingLastCell:p=>{p.scoreGrid.pop()},
 missingMiddleCell:p=>{p.scoreGrid.splice(14,1)},
 notArrayObject:p=>{p.scoreGrid=Object.fromEntries(p.scoreGrid.map((v,i)=>[i,v]))},
 notArrayString:p=>{p.scoreGrid='0.1'},
 gridAbsent:p=>{delete p.scoreGrid},
 negativeCell:p=>{p.scoreGrid[168]=-p.scoreGrid[168]},
 stringCell:p=>{p.scoreGrid[14]=String(p.scoreGrid[14])}
};
async function captureGrid(browser,base,lang,width,name,keep){
 const body=malformed(GRID_CASES[name]);
 const {context,page,errors,consoleErrors}=await newPage(browser,base,width,{'/data/football/predictions.js':route=>route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body})});
 const file=lang==='ko'?'index.html':'index.en.html',result={lang,width,case:name};
 await page.goto(base+'/'+file+'#preview='+encodeURIComponent(PREVIEW),{waitUntil:'load'});
 await page.locator('#prediction-simulation-v22').waitFor();
 await page.waitForTimeout(200);
 const note=page.locator('#prediction-simulation-v22 > p.note').first();
 result.message=await note.innerText();
 result.invalidMessageShown=result.message===INVALID[lang];
 result.simulationMounted=await page.locator('#prediction-simulation-v22 section.md-pixel-simulation').count()>0;
 const state=await page.evaluate(key=>{const p=window.MatchLabData.predictions.predictions.find(x=>x.match_key===key);const s=window.MatchDeskSimulation;let r=null;try{const out=s.sample({model:p.model_id,status:p.status,probabilities:[p.probabilities.home,p.probabilities.draw,p.probabilities.away],scoreDistribution:p.scoreDistribution},()=>0.5);r={scoreFromModel:out.scoreFromModel,score:out.score}}catch(e){r={error:e.message}}return {cells:Array.isArray(p.scoreDistribution)?p.scoreDistribution.length:null,hasGrid:'scoreGrid' in p,sample:r}},PREVIEW);
 Object.assign(result,state);
 result.pageErrors=errors;result.consoleErrors=consoleErrors;
 if(keep)await shot(page.locator('#prediction-simulation-v22'),'grid-invalid-'+lang+'-'+width+'.png');
 await context.close();
 return result;
}
(async()=>{
 const oldDir=extractOld();
 const servers={old:require(path.join(oldDir,'server/gemini.cjs')).createServer({key:''}),new:require(path.join(root,'server/gemini.cjs')).createServer({key:''})};
 const bases={old:await listen(servers.old),new:await listen(servers.new)};
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const browserVersion=browser.version(),normal=[],failuresCases=[],gridCases=[],failures=[];
 try{
  // 1. Normal pages.
  for(const lang of ['ko','en'])for(const width of [390,1440]){
   const keep=(lang==='ko'&&width===390)||(lang==='en'&&width===1440);
   const old=await captureNormal(browser,bases.old,lang,width,false),cur=await captureNormal(browser,bases.new,lang,width,keep);
   const fields=Object.keys(old.out),diff=fields.filter(k=>JSON.stringify(old.out[k])!==JSON.stringify(cur.out[k]));
   const shotDiff=Object.keys(old.shots).filter(k=>!old.shots[k].equals(cur.shots[k]));
   for(const k of shotDiff){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'matchlab-0.26.2-shot-'));fs.writeFileSync(path.join(dir,'old.png'),old.shots[k]);fs.writeFileSync(path.join(dir,'new.png'),cur.shots[k]);console.log('  screenshot '+k+' differs; saved to '+dir);}
   const simDiffs=old.extra.simRows.filter((r,i)=>r!==cur.extra.simRows[i]).length+Math.abs(old.extra.simRows.length-cur.extra.simRows.length);
   const row={lang,width,identicalText:diff.length===0,differentFields:diff,compared:fields,identicalScreenshots:shotDiff.length===0,differentScreenshots:shotDiff,
    screenshots:Object.fromEntries(Object.keys(cur.shots).map(k=>[k,{old:sha(old.shots[k]).slice(0,16),new:sha(cur.shots[k]).slice(0,16)}])),
    notices:{old:old.out.notices,new:cur.out.notices,previewNew:cur.out.previewNotices},lastDate:cur.out.lastDate,
    fixedSeed:{matches:cur.extra.shape.predictions,seeds:SEEDS,runs:cur.extra.simRows.length,differences:simDiffs},loadedShape:{old:old.extra.shape,new:cur.extra.shape},
    pageErrors:{old:old.errors,new:cur.errors},consoleErrors:{old:old.consoleErrors,new:cur.consoleErrors},horizontalOverflow:{old:old.overflowAt,new:cur.overflowAt},
    abortedExternalOrigins:{old:old.abortedOrigins,new:cur.abortedOrigins},dataRequests:{old:old.dataRequests,new:cur.dataRequests}};
   normal.push(row);
   if(diff.length)failures.push(lang+'-'+width+' text differs: '+diff.join(','));
   if(shotDiff.length)failures.push(lang+'-'+width+' screenshots differ: '+shotDiff.join(','));
   if(simDiffs)failures.push(lang+'-'+width+' fixed-seed simulation differs in '+simDiffs+' runs');
   if(cur.errors.length||old.errors.length)failures.push(lang+'-'+width+' page errors');
   if(Object.values(cur.overflowAt).some(Boolean))failures.push(lang+'-'+width+' horizontal overflow');
   if(!cur.out.simulationMounted)failures.push(lang+'-'+width+' simulation not mounted');
   if(cur.out.notices||cur.out.previewNotices)failures.push(lang+'-'+width+' notice shown on a normal page');
   if(cur.extra.shape.withGrid!==0||JSON.stringify(cur.extra.shape.cellCounts)!=='{"169":641}')failures.push(lang+'-'+width+' expanded bundle shape '+JSON.stringify(cur.extra.shape));
   console.log((diff.length||shotDiff.length||simDiffs?'DIFF ':'SAME ')+lang+' '+width+'px text',diff.join(',')||'-','shots',shotDiff.join(',')||'-','sim diffs',simDiffs,'errors new/old',cur.errors.length,old.errors.length);
   for(const k of diff)console.log('  '+k+'\n  old: '+JSON.stringify(old.out[k]).slice(0,300)+'\n  new: '+JSON.stringify(cur.out[k]).slice(0,300));
  }
  // 2. Load failures (current version; the old version is recorded for comparison).
  const plan=[];
  for(const width of [390,1440]){plan.push(['ko',width,'data.ko.js','abort'],['en',width,'data.en.js','abort'],['ko',width,'predictions.js','abort'],['en',width,'predictions.js','abort']);}
  for(const lang of ['ko','en']){const data=lang==='ko'?'data.ko.js':'data.en.js';plan.push([lang,390,data,'notfound'],[lang,390,data,'noobject'],[lang,390,'predictions.js','notfound'],[lang,390,'predictions.js','noobject']);}
  for(const [lang,width,blocked,mode] of plan){
   const keep=mode==='abort'&&((lang==='ko'&&width===390)||(lang==='en'&&width===1440));
   const cur=await captureFailure(browser,bases.new,lang,width,blocked,mode,keep);
   const old=mode==='abort'&&width===390?await captureFailure(browser,bases.old,lang,width,blocked,mode,false):null;
   const kind=blocked==='predictions.js'?'predictions':'data';
   const ok=cur.noticeVisible&&cur.noticeText===NOTICE[lang][kind]&&cur.noticeRole==='alert'&&cur.noticeCount===1&&!cur.overflow&&cur.responsive==='complete'
    &&(kind==='data'?cur.noticeIsFirstInMain&&cur.noticeInFirstScreen:cur.topNotice===0&&cur.simulationCanvas===0&&cur.fixtureCards>0&&cur.previewShown&&cur.noticeInTeamView===0&&(!cur.afterSwitch||cur.afterSwitch.notices===1&&cur.afterSwitch.hosts===1));
   failuresCases.push({...cur,pass:ok,previousRelease:old&&{noticeVisible:old.noticeVisible,noticeCount:old.noticeCount,fixtureCards:old.fixtureCards,simulationCanvas:old.simulationCanvas??null,pageErrors:old.pageErrors}});
   if(!ok)failures.push('load failure '+lang+'-'+width+' '+blocked+' '+mode+' notice not as expected');
   console.log((ok?'NOTICE ':'NO-NOTICE ')+lang+' '+width+'px '+blocked+' '+mode,JSON.stringify(cur.noticeText),'page errors',cur.pageErrors.length,'console errors',cur.consoleErrors.length,old?'| previous release page errors '+old.pageErrors.length+' notice '+old.noticeCount:'');
  }
  // 3. Malformed scoreGrid.
  for(const lang of ['ko','en'])for(const name of Object.keys(GRID_CASES)){
   const keep=name==='missingLastCell'&&lang==='ko';
   const cur=await captureGrid(browser,bases.new,lang,390,name,keep),old=await captureGrid(browser,bases.old,lang,390,name,false);
   const ok=name==='unchanged'?cur.simulationMounted&&!cur.invalidMessageShown&&cur.cells===169&&cur.sample.scoreFromModel===true
    :cur.invalidMessageShown&&!cur.simulationMounted&&cur.cells===0&&!!cur.sample.error;
   gridCases.push({...cur,pass:ok,previousRelease:{message:old.message,invalidMessageShown:old.invalidMessageShown,simulationMounted:old.simulationMounted,cells:old.cells,sample:old.sample,pageErrors:old.pageErrors}});
   if(!ok)failures.push('scoreGrid '+lang+' '+name+' not handled as expected');
   if(cur.pageErrors.length)failures.push('scoreGrid '+lang+' '+name+' page errors');
   console.log((ok?'OK ':'BAD ')+lang+' '+name,'| new:',cur.invalidMessageShown?'invalid message':'mounted='+cur.simulationMounted,JSON.stringify(cur.sample),'| previous:',old.invalidMessageShown?'invalid message':'mounted='+old.simulationMounted,JSON.stringify(old.sample));
  }
 }finally{await browser.close();await close(servers.old);await close(servers.new);fs.rmSync(oldDir,{recursive:true,force:true});}
 const result={status:failures.length?'FAIL':'PASS',testedAt:new Date().toISOString(),oldRef,oldCommit:execFileSync('git',['rev-parse',oldRef],{cwd:root,encoding:'utf8'}).trim(),
  newCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()+' + working tree',browser:(process.env.CHROME_PATH||'Playwright Chromium')+' '+browserVersion,
  method:'Two local servers (old ref via git archive, current tree), key empty so no AI or news calls; all non-local requests aborted; reduced motion; Math.random seeded with mulberry32('+RANDOM_SEED+') in both versions. Normal: innerText of upcoming lists (EPL, LaLiga), club search, preview, simulation panel, report, local natural-language answer, body text and <main> outerHTML (sha256, report creation clock text masked) at list and preview, PNG bytes of list viewport / #matches preview / simulation panel / analysis result, plus MatchDeskSimulation.sample() for 641 matches x 20 seeds. Overflow = scrollWidth > documentElement.clientWidth. Load failures: request routing aborts the file, answers 404, or answers 200 without the data object. Malformed scoreGrid: predictions.js served with one changed Arsenal-Leeds grid.',
  match:PREVIEW,questions:QUESTIONS,searches:SEARCHES,noticeTexts:NOTICE,invalidMessage:INVALID,normal,loadFailures:failuresCases,scoreGrid:gridCases,failures};
 fs.writeFileSync(path.join(__dirname,'browser-result.json'),JSON.stringify(result,null,2)+'\n');
 console.log(result.status,'normal',normal.length,'load failures',failuresCases.length,'scoreGrid cases',gridCases.length,failures.join('; '));if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
