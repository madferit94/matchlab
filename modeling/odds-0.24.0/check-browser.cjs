'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),bundle=JSON.parse(fs.readFileSync(path.join(__dirname,'display-data.json'),'utf8'));
const ko=fs.readFileSync(path.join(root,'index.html'),'utf8');
const original=JSON.parse(ko.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const scheduled=original.scheduled[0],held='understat:29386';
const pages={'/index.html':ko,'/index.en.html':fs.readFileSync(path.join(root,'index.en.html'),'utf8')};
const result=[];
(async()=>{
 const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname==='/api/health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({configured:false}));}if(pages[u.pathname]){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(pages[u.pathname]);}res.writeHead(404);res.end();});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  for(const locale of ['ko','en'])for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];let apiCalls=0;
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/analyze'))apiCalls++;});
   const file=locale==='ko'?'index.html':'index.en.html',prefix=`http://127.0.0.1:${server.address().port}/${file}`;
   for(const league of ['EPL','La_liga']){
    const r=bundle.records.find(r=>r.league===league);
    await page.goto(prefix+'#match='+encodeURIComponent(r.match_key),{waitUntil:'domcontentloaded'});
    const panel=page.locator('#football-odds-review');await panel.waitFor();await panel.scrollIntoViewIfNeeded();
    assert.equal(await panel.locator('.odds-tabs button').count(),4);
    assert.equal(await panel.locator('.odds-tabs button[aria-pressed=true]').innerText(),locale==='ko'?'지표 + 배당':'Stats + odds');
    const keys=['stats_plus_odds','stats_only','odds_only','market_probability'];
    for(let i=0;i<keys.length;i++){
     await panel.locator('.odds-tabs button').nth(i).click();
     assert.equal(await panel.locator('.odds-tabs button').nth(i).evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');
     assert.deepEqual(await panel.locator('.odds-probabilities strong').allTextContents(),r[keys[i]].map(p=>(p*100).toFixed(1)+'%'));
    }
    await panel.locator('summary').click();assert.equal(await panel.locator('details').getAttribute('open'),'');
    const bounds=await panel.evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert.ok(bounds.scroll<=bounds.width+1,JSON.stringify(bounds));
    const label=await panel.innerText();if(locale==='en')assert.ok(!/[가-힣]/.test(label));
    if(league==='EPL'&&((locale==='ko'&&width===390)||(locale==='en'&&width===1440)))await panel.screenshot({path:path.join(__dirname,`panel-${locale}-${width}.png`)});
   }
   await page.goto(prefix+'#match='+encodeURIComponent(held),{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#football-odds-review .odds-tabs').count(),0);
   await page.goto(prefix+'#match='+encodeURIComponent(original.completed.find(r=>r.season==='2023/24').id),{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#football-odds-review .odds-tabs').count(),0);
   await page.goto(prefix+'#preview='+encodeURIComponent(scheduled.id),{waitUntil:'domcontentloaded'});
   await page.locator('#football-odds-fallback').waitFor();assert.equal(await page.locator('#football-odds-fallback').count(),1);
   assert.equal(await page.locator('#football-odds-review').count(),0);
   assert.ok(await page.locator('#prediction-simulation-v22 canvas').count()>0);
   assert.deepEqual(errors,[]);assert.equal(apiCalls,0);
   result.push({locale,width,leagues:2,probabilitySwitches:8,heldHidden:true,trainingHidden:true,futureFallback:true,panelOverflow:false,pageErrors:errors,apiCalls});await page.close();
  }
  fs.writeFileSync(path.join(__dirname,'browser-checks.json'),JSON.stringify({status:'PASS',checks:result},null,2));console.log(JSON.stringify(result));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
