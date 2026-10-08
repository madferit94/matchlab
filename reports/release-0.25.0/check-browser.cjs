'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const runtime='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(runtime,'playwright'));
const {createServer,loadData}=require('../../server/gemini.cjs');const {loadBundle,buildFacts}=require('./report.cjs');
const data=loadData(),bundle=loadBundle(),first='understat:31230',second='understat:31231',la=data.scheduled.find(m=>m.league==='La_liga').id,results=[];
function fixture(id,locale){const facts=buildFacts(data,bundle,id);return {version:'0.25.0',locale,generatedAt:new Date().toISOString(),expiresAt:Date.now()+1800000,facts,reasonIds:['form','chance','defence'],narrativeStatus:'ai_curated',news:{status:'unverified',reason:'no_recent_supported_sources',items:[],checkedAt:new Date().toISOString(),suggestions:''}};}
(async()=>{const s=createServer({key:''});await new Promise(r=>s.listen(0,'127.0.0.1',r));let browser;
 try{browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-gpu']});
 for(const locale of ['ko','en'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];let calls=0,fail=false,slow=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{const url=route.request().url();if(url.includes('/api/report')){calls++;const {matchId,locale}=route.request().postDataJSON();if(fail)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"busy"}'});if(slow&&matchId===second)await new Promise(r=>setTimeout(r,400));return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(matchId,locale))});}return url.startsWith('http://127.0.0.1:')?route.continue():route.abort();});
  const file=locale==='ko'?'index.html':'index.en.html',base='http://127.0.0.1:'+s.address().port+'/'+file;
  await page.goto(base+'#preview='+encodeURIComponent(first),{waitUntil:'domcontentloaded'});const report=page.locator('#match-ai-report');await report.locator('.match-report-verdict').waitFor();
  assert.match(await report.innerText(),/60\.9%/);assert.match(await report.locator('.match-report-verdict').innerText(),/Arsenal/);assert.equal(calls,1);
  const overflow=await report.evaluate(e=>e.scrollWidth>e.clientWidth+1||e.getBoundingClientRect().right>innerWidth);assert.equal(overflow,false);
  await page.reload({waitUntil:'domcontentloaded'});await report.locator('.match-report-verdict').waitFor();assert.equal(calls,1,'session cache should avoid another API request');
  // Render an already retrieved live report for the Korean screenshot; fixture otherwise.
  if(locale==='ko'&&fs.existsSync(path.resolve(__dirname,'../../private/report-0.25.0/live-report-verified.json'))){const live=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../private/report-0.25.0/live-report-verified.json')));await page.evaluate(r=>{const k=Object.keys(sessionStorage).find(k=>k.includes('matchlab-report-0.25.0:'));sessionStorage.setItem(k,JSON.stringify(r));},live);await page.reload({waitUntil:'domcontentloaded'});await report.locator('.match-report-news-item').first().waitFor();}
  if((locale==='ko'&&width===390)||(locale==='en'&&width===1440))await report.screenshot({path:path.join(__dirname,`report-${locale}-${width}.png`)});
  const innerOverflow=await report.evaluate(e=>[...e.querySelectorAll('h2,h3,h4,p,strong,a')].filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.tagName));assert.deepEqual(innerOverflow,[]);
  slow=true;await page.evaluate(id=>{location.hash='preview='+encodeURIComponent(id);},second);await page.waitForFunction(()=>document.getElementById('match-ai-report')?.dataset.match==='understat:31231');await page.evaluate(id=>{location.hash='preview='+encodeURIComponent(id);},la);await report.locator('.match-report-verdict').waitFor();await page.waitForFunction(id=>document.querySelector('#match-ai-report[data-match="'+id+'"] .match-report-verdict'),la);await page.waitForTimeout(450);assert.equal(await report.getAttribute('data-match'),la);assert.equal(await report.locator('.match-report-subtitle').innerText(),data.teams[data.scheduled.find(m=>m.id===la).home].name+' vs '+data.teams[data.scheduled.find(m=>m.id===la).away].name+' · '+data.scheduled.find(m=>m.id===la).date);
  fail=true;const other=data.scheduled.find(m=>m.league==='La_liga'&&m.id!==la).id;await page.evaluate(id=>{location.hash='preview='+encodeURIComponent(id);},other);await report.getByRole('button').waitFor();assert.equal(await page.locator('#prediction-simulation-v22').count(),1);fail=false;await report.getByRole('button').click();await report.locator('.match-report-verdict').waitFor();
  await report.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await report.locator('details').getAttribute('open'),'');assert.deepEqual(errors,[]);
  results.push({locale,width,automatic:true,probabilitiesMatch:true,sessionCache:true,staleResponseIgnored:true,retry:true,keyboard:true,overflow:false,errors});await page.close();
 }
 fs.writeFileSync(path.join(__dirname,'browser-checks.json'),JSON.stringify({testedAt:new Date().toISOString(),method:'isolated local HTTP server, browser API fixtures; Korean screenshot renders previously retrieved live response; no new AI calls',results},null,2)+'\n');console.log(JSON.stringify(results));
 }finally{if(browser)await browser.close();s.closeAllConnections();await new Promise(r=>s.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
