'use strict';
/* 0.26.0 browser check: the previous release (git main, inline JSON) and the current
   working tree (data/football/*.js) must render the same text. Playwright is not a
   project dependency: run with NODE_PATH pointing at a separate install, e.g.
   NODE_PATH=/path/to/pw/node_modules node design/release-0.26.0/check-browser.cjs
   Optional: OLD_REF (default main), CHROME_PATH (browser executable; default Playwright's Chromium). */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),oldRef=process.env.OLD_REF||'main';
const PREVIEW='understat:31230';// Arsenal vs Leeds, 2026-10-10
const QUESTIONS={ko:'아스널 최근 5경기 득점과 기대 득점 비교해 줘',en:'Compare Arsenal goals and expected goals in the last 5 matches'};
// Extract only what the previous server needs from the old commit; nothing is written to the repository.
function extractOld(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'matchlab-0.26.0-old-'));
 const tar=execFileSync('git',['archive','--format=tar',oldRef,'index.html','index.en.html','f1/index.html','server','analysis/record-engine.cjs','reports/release-0.25.0'],{cwd:root,maxBuffer:256*1024*1024});
 execFileSync('tar',['-x','-C',dir],{input:tar,maxBuffer:256*1024*1024});
 assert(fs.readFileSync(path.join(dir,'index.html'),'utf8').includes('<script id="prematch-predictions-v22" type="application/json">'),'Old ref must still contain the inline JSON');
 return dir;
}
const listen=server=>new Promise(r=>server.listen(0,'127.0.0.1',()=>r('http://127.0.0.1:'+server.address().port)));
const close=server=>{server.closeAllConnections();return new Promise(r=>server.close(r))};
async function overflow(page){return page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}
async function capture(browser,base,lang,width,shot){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],consoleErrors=[],requests=[],aborted=new Set();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
 // Same isolation for both versions: only the local server is reachable.
 await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base)){requests.push(new URL(url).pathname+new URL(url).search);return route.continue()}aborted.add(new URL(url).origin);return route.abort()});
 const file=lang==='ko'?'index.html':'index.en.html',out={lang,width},overflowAt={};
 await page.goto(base+'/'+file+'#matches',{waitUntil:'load'});
 await page.locator('#fixtures').waitFor();
 out.lastDate=await page.locator('#lastdate').innerText();
 out.upcoming={};
 for(const league of ['EPL','La_liga']){await page.locator('#league').selectOption(league);out.upcoming[league]=(await page.locator('#fixtures').innerText())+'\n'+(await page.locator('#fixturepagination').innerText());}
 overflowAt.list=await overflow(page);
 await page.evaluate(id=>{location.hash='preview='+encodeURIComponent(id)},PREVIEW);
 await page.locator('#prediction-simulation-v22').waitFor();
 const report=page.locator('#match-ai-report');await report.locator('.match-report-verdict').waitFor({timeout:30000});
 out.preview=await page.locator('#comparison').innerText();
 out.simulation=await page.locator('#prediction-simulation-v22').innerText();
 // Probabilities as the page passed them to the simulation, read from the loaded bundle in each version.
 out.simulationProbabilities=await page.evaluate(id=>{const p=window.MatchLabData?window.MatchLabData.predictions:JSON.parse(document.getElementById('prematch-predictions-v22').textContent);const x=p.predictions.find(r=>r.match_key===id);return [x.probabilities.home,x.probabilities.draw,x.probabilities.away]},PREVIEW);
 out.report=await report.innerText();
 overflowAt.preview=await overflow(page);
 if(shot)await page.locator('#matches').screenshot({path:path.join(__dirname,'preview-'+lang+'-'+width+'.png')});
 await page.locator('#analystmode').selectOption('local');await page.locator('#analystquery').fill(QUESTIONS[lang]);await page.locator('#analystsubmit').click();
 await page.locator('#analystresult .ml-analysis-context').waitFor();
 out.analysis=await page.locator('#analystresult').innerText();
 overflowAt.analysis=await overflow(page);
 if(shot)await page.locator('#analystresult').screenshot({path:path.join(__dirname,'analysis-'+lang+'-'+width+'.png')});
 await page.close();
 return {out,errors,consoleErrors,overflowAt,abortedOrigins:[...aborted].sort(),dataRequests:requests.filter(r=>r.startsWith('/data/'))};
}
(async()=>{
 const oldDir=extractOld();
 const servers={old:require(path.join(oldDir,'server/gemini.cjs')).createServer({key:''}),new:require(path.join(root,'server/gemini.cjs')).createServer({key:''})};
 const bases={old:await listen(servers.old),new:await listen(servers.new)};
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const browserVersion=browser.version(),combos=[],failures=[];
 try{
  for(const lang of ['ko','en'])for(const width of [390,1440]){
   const shot=(lang==='ko'&&width===390)||(lang==='en'&&width===1440);
   const old=await capture(browser,bases.old,lang,width,false),cur=await capture(browser,bases.new,lang,width,shot);
   const fields=Object.keys(old.out).filter(k=>!['lang','width'].includes(k)),diff=fields.filter(k=>JSON.stringify(old.out[k])!==JSON.stringify(cur.out[k]));
   const row={lang,width,identical:diff.length===0,differentFields:diff,compared:fields,
    textLengths:Object.fromEntries(fields.map(k=>[k,JSON.stringify(cur.out[k]).length])),
    simulationProbabilities:cur.out.simulationProbabilities,lastDate:cur.out.lastDate,
    pageErrors:{old:old.errors,new:cur.errors},consoleErrors:{old:old.consoleErrors,new:cur.consoleErrors},
    horizontalOverflow:{old:old.overflowAt,new:cur.overflowAt},abortedExternalOrigins:{old:old.abortedOrigins,new:cur.abortedOrigins},dataRequests:{old:old.dataRequests,new:cur.dataRequests}};
   combos.push(row);
   if(diff.length)failures.push(lang+'-'+width+' text differs: '+diff.join(','));
   if(cur.errors.length||old.errors.length)failures.push(lang+'-'+width+' page errors');
   if(Object.values(cur.overflowAt).some(Boolean))failures.push(lang+'-'+width+' horizontal overflow');
   const expected=['/data/football/'+(lang==='ko'?'data.ko.js':'data.en.js'),'/data/football/predictions.js'];
   if(cur.dataRequests.length!==2||!expected.every((p,i)=>cur.dataRequests[i].startsWith(p+'?v=')))failures.push(lang+'-'+width+' unexpected data requests '+JSON.stringify(cur.dataRequests));
   if(old.dataRequests.length)failures.push(lang+'-'+width+' old version requested data files');
   console.log((diff.length?'DIFF ':'SAME ')+lang+' '+width+'px',diff.join(',')||'', 'errors new/old',cur.errors.length,old.errors.length);
   if(diff.length)for(const k of diff)console.log('  '+k+'\n  old: '+JSON.stringify(old.out[k]).slice(0,400)+'\n  new: '+JSON.stringify(cur.out[k]).slice(0,400));
  }
  assert.deepEqual(combos[0].simulationProbabilities,[0.6085747997883622,0.22077050835147805,0.1706546918601598]);
 }finally{await browser.close();await close(servers.old);await close(servers.new);fs.rmSync(oldDir,{recursive:true,force:true});}
 const result={status:failures.length?'FAIL':'PASS',testedAt:new Date().toISOString(),oldRef,oldCommit:execFileSync('git',['rev-parse',oldRef],{cwd:root,encoding:'utf8'}).trim(),
  newCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()+' + working tree',browser:(process.env.CHROME_PATH||'Playwright Chromium')+' '+browserVersion,
  method:'Two local servers (old ref via git archive with inline JSON, current tree with data files), key empty so no AI or news calls; all non-local requests aborted. Compared innerText of upcoming lists (EPL, LaLiga), match preview, simulation panel, simulation probabilities, automatic report and a local natural-language answer.',
  match:PREVIEW,questions:QUESTIONS,combos,failures};
 fs.writeFileSync(path.join(__dirname,'browser-result.json'),JSON.stringify(result,null,2)+'\n');
 console.log(result.status,combos.length,'combinations',failures.join('; '));if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
