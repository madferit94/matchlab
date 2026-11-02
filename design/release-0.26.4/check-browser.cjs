'use strict';
/* 0.26.4 browser check: the three GPs added as completed races (Singapore 11388, United States 11396,
   Mexico City 11404), ko/en x 390/1440.
   - Catalogue: 2026 shows 19 completed and 4 scheduled GPs.
   - Each added GP opens on the circuit tab (map) with recorded and predicted panes, the speed tooltip of
     recorded GPs, and the comparison note "published before the race" in the lane tab; the result tab
     lists 22 drivers with the recorded winner first.
   - Mexico City: circuit tab plays at 1x for 4 s; at every sample the predicted P1 lap progress equals the
     recorded leader lap progress computed by the page's own modules at the drawn phase (seek bar), and the
     rate is 1 recorded second per second. Inside the red flag (from the leader's stop to the restart, 60x, 4 s) the predicted
     canvas does not change. Lane tab at 1x: the predicted P1 lane equals the front recorded lane in every sample.
   - Page errors 0, no horizontal overflow (documentElement.clientWidth).
   Playwright is not a project dependency: NODE_PATH=<pw>/node_modules CHROME_PATH=<chrome> node design/release-0.26.4/check-browser.cjs */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),ADDED={11388:'Max VERSTAPPEN',11396:'Kimi ANTONELLI',11404:'Max VERSTAPPEN'},RED=11404;
const NOTE={ko:'경기 전에 공개한 예측입니다(자료 기준 2026-10-07, 경기 결과는 쓰지 않음).',en:'Forecast published before this race (data as of 2026-10-07; the race result is not used).'};
const TIP={ko:'1배속은 실제 기록 시간과 같고, 예측 차도 실제 선두의 랩 진행에 맞춰 움직입니다.',en:'1× follows recorded elapsed time, and predicted cars follow the lap progress of the recorded leader.'};
const INSTALL=`(key)=>{const read=id=>JSON.parse(document.getElementById(id).textContent),D=read('dataset'),M=read('maps'),H=read('historical'),F=read('forecasts');
 const race=D.races.find(r=>r.session.session_key===key),api=window.MatchLabF1MapComparison,prediction=H.races[String(key)]??F.races[String(key)],map=api.prepareMap(M.races[String(key)],race.session.circuit_key),count=api.raceLapCount(race);
 const timeline=window.MatchLabF1Replay.timeline(race),sync=api.leaderSync(timeline,count,prediction.drivers.length,race),root=document.querySelector('.f1-map-comparison');
 window.__s={race,prediction,map,count,timeline,sync,root,phase:()=>Number(root.querySelector('[data-map-seek]').value),
  at(p){const pred=api.predictedMarkers(prediction,p,map,count,sync),act=api.actualMarkers(race,timeline,map,p);return {seconds:p*timeline.duration,p1:pred[0].lap_progress,leader:Math.max(...act.map(d=>d.progress))}},
  seek(p){const s=root.querySelector('[data-map-seek]');s.value=String(p);s.dispatchEvent(new Event('input'))}};
 return {duration:timeline.duration,suspensions:sync.suspensions,held:sync.held.length,core:sync.held.length?[Math.min(...sync.held.filter(h=>h.number===Math.max(...sync.held.map(x=>x.number))).map(h=>h.stops[0][0])),sync.suspensions[0][1]]:null}}`;
const PAUSE=sel=>`(()=>{const b=document.querySelector('${sel}');if(['일시정지','Pause'].includes(b.textContent))b.click()})()`;
(async()=>{
 const server=require(path.join(root,'server/gemini.cjs')).createServer({key:''});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const result={status:'FAIL',release:'0.26.4',browser:browser.version(),runs:[],screenshots:[]},checks=[],ok=(c,m)=>{assert(c,m);checks.push(m)},blocked=new Set();
 try{
  for(const lang of ['ko','en'])for(const width of [390,1440]){
   const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.route(u=>!/^http:\/\/127\.0\.0\.1:/.test(String(u)),r=>{blocked.add(new URL(r.request().url()).host);return r.abort()});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const run={lang,width,gps:[]};
   await page.goto(base+'/f1/index.html?year=2026&lang='+lang,{waitUntil:'load',timeout:120000});await page.waitForSelector('#catalog .card',{timeout:120000});
   run.catalog=await page.$$eval('#catalog .card .badge',b=>b.map(x=>x.className.split(' ').pop()).reduce((a,s)=>(a[s]=(a[s]||0)+1,a),{}));
   ok(run.catalog.completed===19&&run.catalog.scheduled===4,`catalogue 19 completed / 4 scheduled ${lang} ${width}`);
   for(const [key,winner] of Object.entries(ADDED)){
    await page.goto(base+'/f1/index.html?year=2026&lang='+lang+'#race='+key,{waitUntil:'load',timeout:120000});await page.waitForSelector('[data-tab="map"]',{timeout:120000});await page.click('[data-tab="map"]');await page.waitForSelector('.f1-map-comparison [data-map-play]',{timeout:120000});
    const gp={key:+key};gp.tooltip=await page.$eval('[data-map-speed]',s=>s.title);gp.panes=await page.$$eval('.f1-map-comparison canvas',c=>c.length);
    ok(gp.tooltip===TIP[lang]&&gp.panes===2,`circuit tab with recorded and predicted panes ${key} ${lang} ${width}`);
    const info=await page.evaluate(`(${INSTALL})(${key})`);gp.suspensions=info.suspensions;gp.held_laps=info.held;
    if(+key===RED&&lang==='ko'&&width===1440||+key===RED&&lang==='en'&&width===390){
     await page.evaluate(([p])=>{const r=window.__s.root;r.querySelector('[data-map-speed]').value='1';window.__s.seek(p);r.querySelector('[data-map-play]').click()},[0.3]);
     const s=[];const t0=Date.now();while(Date.now()-t0<4000){await page.waitForTimeout(250);s.push(await page.evaluate(()=>({w:performance.now(),...window.__s.at(window.__s.phase())})))}
     await page.evaluate(PAUSE('.f1-map-comparison [data-map-play]'));
     gp.play_1x={samples:s.length,max_abs_diff_laps:Math.max(...s.map(x=>Math.abs(x.p1-x.leader))),rate:+((s.at(-1).seconds-s[0].seconds)/((s.at(-1).w-s[0].w)/1000)).toFixed(3),p1:[s[0].p1,s.at(-1).p1]};
     ok(gp.play_1x.max_abs_diff_laps<=1e-9&&Math.abs(gp.play_1x.rate-1)<0.2,`1x play: predicted P1 = recorded leader, 1 recorded s per s ${key} ${lang} ${width}`);
     ok(info.held>0&&info.core,`red flag found and held ${key}`);
     await page.evaluate(([p])=>{const r=window.__s.root;r.querySelector('[data-map-speed]').value='60';window.__s.seek(p);r.querySelector('[data-map-play]').click()},[(info.core[0]+20)/info.duration]);
     const c=[];const t1=Date.now();while(Date.now()-t1<4000){await page.waitForTimeout(250);c.push(await page.evaluate(()=>({seconds:window.__s.phase()*window.__s.timeline.duration,canvas:window.__s.root.querySelector('[data-map-pred]').toDataURL(),...window.__s.at(window.__s.phase())})))}
     await page.evaluate(PAUSE('.f1-map-comparison [data-map-play]'));
     gp.red_flag={core_stop_seconds:info.core.map(v=>+v.toFixed(1)),recorded_seconds:[+c[0].seconds.toFixed(1),+c.at(-1).seconds.toFixed(1)],predicted_canvas_unchanged:c.every(x=>x.canvas===c[0].canvas),p1:[c[0].p1,c.at(-1).p1],leader:[c[0].leader,c.at(-1).leader]};
     ok(c.at(-1).seconds<info.core[1]&&c.at(-1).seconds-c[0].seconds>150&&gp.red_flag.predicted_canvas_unchanged&&c.every(x=>x.p1===x.leader),`red flag: predicted cars still, P1 = leader ${key} ${lang} ${width}`);
     const shot=`circuit-${key}-${lang}-${width}.png`;await page.evaluate(()=>window.__s.seek(0.5));await page.locator('.f1-map-comparison').screenshot({path:path.join(__dirname,shot)});result.screenshots.push(shot);
    }
    await page.click('[data-tab="comparison"]');await page.waitForSelector('.f1-comparison [data-compare-play]',{timeout:60000});
    gp.note=await page.$eval('#body > p.muted',e=>e.textContent);ok(gp.note===NOTE[lang],`lane tab says pre-race forecast ${key} ${lang} ${width}`);
    await page.evaluate(()=>{const r=document.querySelector('.f1-comparison'),s=r.querySelector('[data-compare-seek]');s.value='0.4';s.dispatchEvent(new Event('input'));r.querySelector('[data-compare-play]').click()});
    const lanes=[];const t2=Date.now();while(Date.now()-t2<2500){await page.waitForTimeout(250);lanes.push(await page.evaluate(()=>{const r=document.querySelector('.f1-comparison'),pred=[...r.querySelectorAll('[data-predicted-lanes] .f1-lane')],rec=[...r.querySelectorAll('[data-recorded-lanes] .f1-lane')],p1=pred.find(x=>/^(예측|Pred) 1( ·|$)/.test(x.querySelector('.f1-lane-status').textContent)),lefts=rec.map(x=>x.querySelector('.f1-lane-car').style.left);return {p1:p1.querySelector('.f1-lane-car').style.left,front:lefts.reduce((a,b)=>parseFloat(b)>parseFloat(a)?b:a)}}))}
    await page.evaluate(PAUSE('.f1-comparison [data-compare-play]'));
    gp.lane_samples=lanes.length;gp.lane_mismatch=lanes.filter(x=>x.p1!==x.front).length;ok(gp.lane_mismatch===0,`lane tab: predicted P1 lane = front recorded lane ${key} ${lang} ${width}`);
    if(+key===RED&&(lang==='ko'&&width===390||lang==='en'&&width===1440)){const shot=`lanes-${key}-${lang}-${width}.png`;await page.locator('.f1-comparison').screenshot({path:path.join(__dirname,shot)});result.screenshots.push(shot)}
    await page.click('[data-tab="result"]');await page.waitForSelector('#body table tbody tr');
    gp.result_rows=await page.$$eval('#body table tbody tr',r=>r.length);gp.result_first=await page.$eval('#body table tbody tr td:nth-child(2)',e=>e.textContent.trim());
    ok(gp.result_rows===22&&gp.result_first===winner,`result table 22 rows, winner ${winner} ${key} ${lang} ${width}`);
    if(+key===RED&&lang==='ko'&&width===390){const shot=`result-${key}-${lang}-${width}.png`;await page.locator('#detail').screenshot({path:path.join(__dirname,shot)});result.screenshots.push(shot)}
    run.gps.push(gp);
   }
   const of=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));run.overflow=of;ok(of.scrollWidth<=of.clientWidth,`no horizontal overflow ${lang} ${width}`);
   run.page_errors=errors;ok(errors.length===0,`page errors 0 ${lang} ${width}`);result.runs.push(run);await ctx.close();
  }
  result.status='PASS';
 }catch(e){result.error=String(e&&e.stack||e);process.exitCode=1}
 finally{result.checks=checks.length;result.blocked_external_hosts=[...blocked].sort();result.checked_at=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'browser-result.json'),JSON.stringify(result,null,1)+'\n');await browser.close();server.close();console.log(JSON.stringify({status:result.status,checks:checks.length,error:result.error?.split('\n')[0]}))}
})();
