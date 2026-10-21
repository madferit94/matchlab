'use strict';
/* 0.26.3 browser check (F1 circuit replay: prediction vs recorded race).
   1. Recorded GP (Chinese GP 11245), ko/en x 390/1440: play at 0.25x, 1x, 10x and 60x for a few seconds
      each. While playing, the phase the page last drew is read from the seek bar and the predicted P1
      lap progress and the recorded leader lap progress are computed with the page's own shipped modules
      (window.MatchLabF1MapComparison / MatchLabF1Replay) at that phase. They must be equal, their
      completed-lap counters must advance together, and the playback rate must match the chosen speed
      against recorded seconds. The 60x run starts 100 recorded seconds before the real leader finishes,
      so it crosses the line.
      Paused at fixed phases: the predicted P1 car is drawn where the module puts it (canvas pixel = team
      colour, only that car shown), and the recorded canvas, clock, coverage line, recorded selection
      line, driver dashboard and table are identical to 0.26.2 (git base commit).
      Speed tooltip text, page errors 0, no horizontal overflow (documentElement.clientWidth).
   2. Upcoming GP (Singapore GP 11388), ko/en x 390/1440: tooltip, predicted canvas at fixed phases and
      10x playback rate (180-second illustration) are the same as 0.26.2.
   Playwright is not a project dependency: run with NODE_PATH pointing at a separate install, e.g.
   NODE_PATH=/path/to/pw/node_modules CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     node design/release-0.26.3/check-browser.cjs
   Optional: OLD_REF (default ee48f51 = 0.26.2). */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),oldRef=process.env.OLD_REF||'ee48f51';
const RECORDED=11245,UPCOMING=11388;
const TOOLTIP={recorded:{ko:'1배속은 실제 기록 시간과 같고, 예측 차도 실제 선두의 랩 진행에 맞춰 움직입니다.',en:'1× follows recorded elapsed time, and predicted cars follow the lap progress of the recorded leader.'},
 recordedOld:{ko:'1배속은 실제 기록 시간과 같습니다.',en:'1× follows recorded elapsed time.'},
 upcoming:{ko:'1배속은 180초 예측 연출입니다.',en:'1× is a 180-second prediction illustration.'}};
const SPEEDS=[0.25,1,10,60],PLAY_MS=3200,FIXED_PHASES=[0,0.05,0.2,0.37,0.5,0.81,0.97,1];
function extractOld(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'matchlab-0.26.3-old-'));
 const tar=execFileSync('git',['archive','--format=tar',oldRef,'index.html','index.en.html','f1/index.html','server','analysis/record-engine.cjs','reports/release-0.25.0','data/football'],{cwd:root,maxBuffer:256*1024*1024});
 execFileSync('tar',['-x','-C',dir],{input:tar,maxBuffer:256*1024*1024});
 return dir;
}
const listen=server=>new Promise(r=>server.listen(0,'127.0.0.1',()=>r('http://127.0.0.1:'+server.address().port)));
// Page-side helpers, installed once per page load. They only read the page's own data blocks and modules.
const INSTALL=`(key)=>{const read=id=>JSON.parse(document.getElementById(id).textContent);const D=read('dataset'),M=read('maps'),H=read('historical'),F=read('forecasts');
 const race=D.races.find(r=>r.session.session_key===key),api=window.MatchLabF1MapComparison,completed=race.state==='completed';
 const prediction=completed?H.races[String(key)]:F.races[String(key)],map=api.prepareMap(M.races[String(key)],race.session.circuit_key),count=api.raceLapCount(race);
 const timeline=completed?window.MatchLabF1Replay.timeline(race):null,sync=completed&&api.leaderSync?api.leaderSync(timeline,count,prediction.drivers.length):null,root=document.querySelector('.f1-map-comparison');
 window.__sync={race,prediction,map,count,timeline,sync,root,
  phase:()=>Number(root.querySelector('[data-map-seek]').value),
  at(phase){const pred=api.predictedMarkers(prediction,phase,map,count,sync);if(!completed)return {phase,pred:pred.map(d=>[d.driver_number,d.lap_progress])};const act=api.actualMarkers(race,timeline,map,phase),leader=act.reduce((a,b)=>b.progress>a.progress?b:a);
   return {phase,seconds:phase*timeline.duration,p1:pred[0].driver_number,p1_lap_progress:pred[0].lap_progress,leader:leader.driver.driver_number,leader_lap_progress:leader.progress,leader_lap_field:leader.lap,p1_completed_laps:Math.floor(pred[0].lap_progress+1e-9),leader_completed_laps:Math.floor(leader.progress+1e-9)}},
  seek(phase){const s=root.querySelector('[data-map-seek]');s.value=String(phase);s.dispatchEvent(new Event('input'))},
  snapshot(){const q=s=>root.querySelector(s);return {clock:q('[data-map-clock]').textContent,coverage:q('[data-map-coverage]').textContent,actSelected:q('[data-map-actual-selected]')?.textContent??null,predSelected:q('[data-map-pred-selected]').textContent,dashboard:q('[data-driver-dashboard]').innerHTML,table:q('[data-map-table]').textContent,actCanvas:q('[data-map-actual]')?.toDataURL()??null,predCanvas:q('[data-map-pred]').toDataURL()}}};
 return {duration:timeline?.duration??null,count,gap:sync?.gap??null,finish:sync?.finish??null}}`;
async function open(page,base,key,lang){
 await page.goto(base+'/f1/index.html?year=2026&lang='+lang+'#race='+key,{waitUntil:'load',timeout:120000});
 await page.waitForSelector('.f1-map-comparison [data-map-play]',{timeout:120000});
 return page.evaluate(`(${INSTALL})(${key})`);
}
// External fonts and logos are blocked (same as 0.26.2); both versions get the same treatment.
let browser=null;const blocked=new Set();
async function newContext(width){const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.route(url=>!/^http:\/\/127\.0\.0\.1:/.test(String(url)),route=>{blocked.add(new URL(route.request().url()).host);return route.abort()});return ctx}
// Pause only while playing (a click at the end would restart from 0).
const PAUSE=()=>{const b=window.__sync.root.querySelector('[data-map-play]');if(['일시정지','Pause'].includes(b.textContent))b.click()};
const overflow=page=>page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
(async()=>{
 const oldDir=extractOld();
 const servers={old:require(path.join(oldDir,'server/gemini.cjs')).createServer({key:''}),new:require(path.join(root,'server/gemini.cjs')).createServer({key:''})};
 const base={old:await listen(servers.old),new:await listen(servers.new)};
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const result={status:'FAIL',release:'0.26.3',old_ref:oldRef,browser:browser.version(),recorded_gp:RECORDED,upcoming_gp:UPCOMING,runs:[],upcoming:[],screenshots:[]};
 const checks=[];const ok=(cond,msg)=>{assert(cond,msg);checks.push(msg)};
 try{
  for(const lang of ['ko','en'])for(const width of [390,1440]){
   const ctx=await newContext(width),page=await ctx.newPage(),oldPage=await ctx.newPage(),errors=[],oldErrors=[];
   page.on('pageerror',e=>errors.push(e.message));oldPage.on('pageerror',e=>oldErrors.push(e.message));
   const info=await open(page,base.new,RECORDED,lang);await open(oldPage,base.old,RECORDED,lang);
   const run={lang,width,duration_seconds:info.duration,laps:info.count,gap_seconds_per_rank:info.gap,leader_finish_seconds:info.finish,speeds:[],fixed_phases:[]};
   const tip=await page.$eval('[data-map-speed]',s=>s.title),tipOld=await oldPage.$eval('[data-map-speed]',s=>s.title);
   ok(tip===TOOLTIP.recorded[lang]&&tipOld===TOOLTIP.recordedOld[lang],`recorded tooltip ${lang}`);run.tooltip=tip;
   for(const speed of SPEEDS){
    const startPhase=speed===60?(info.finish-100)/info.duration:0.3+SPEEDS.indexOf(speed)*0.1;
    await page.evaluate(([p,s])=>{const r=window.__sync.root;r.querySelector('[data-map-speed]').value=String(s);window.__sync.seek(p);r.querySelector('[data-map-play]').click()},[startPhase,speed]);
    const samples=[];const t0=Date.now();
    while(Date.now()-t0<(speed===60?2500:PLAY_MS)){await page.waitForTimeout(200);samples.push(await page.evaluate(()=>({wall:performance.now(),...window.__sync.at(window.__sync.phase())})))}
    await page.evaluate(PAUSE);
    const first=samples[0],last=samples.at(-1),rate=(last.seconds-first.seconds)/((last.wall-first.wall)/1000);
    const maxDiff=Math.max(...samples.map(s=>Math.abs(s.p1_lap_progress-s.leader_lap_progress))),counterMismatch=samples.filter(s=>s.p1_completed_laps!==s.leader_completed_laps).length;
    const entry={speed,start_phase:+startPhase.toFixed(5),samples:samples.length,recorded_seconds_advanced:+(last.seconds-first.seconds).toFixed(3),wall_seconds:+((last.wall-first.wall)/1000).toFixed(3),measured_rate:+rate.toFixed(3),
     max_abs_diff_laps:maxDiff,counter_mismatches:counterMismatch,p1_lap_progress:[+first.p1_lap_progress.toFixed(4),+last.p1_lap_progress.toFixed(4)],leader_lap_progress:[+first.leader_lap_progress.toFixed(4),+last.leader_lap_progress.toFixed(4)],
     completed_laps:[first.p1_completed_laps,last.p1_completed_laps],leader_lap_field:[first.leader_lap_field,last.leader_lap_field]};
    if(speed===60)entry.crossed_finish={p1_reached:samples.some(s=>s.p1_lap_progress===info.count),leader_reached:samples.some(s=>s.leader_lap_progress===info.count),same_sample:samples.every(s=>(s.p1_lap_progress===info.count)===(s.leader_lap_progress===info.count))};
    run.speeds.push(entry);
    ok(maxDiff<=1e-9&&counterMismatch===0,`P1 = recorded leader while playing ${speed}x ${lang} ${width}`);
    ok(last.seconds>first.seconds&&Math.abs(rate/speed-1)<0.2,`playback rate ${rate.toFixed(3)} matches ${speed}x ${lang} ${width}`);
    if(speed===60)ok(entry.crossed_finish.p1_reached&&entry.crossed_finish.leader_reached&&entry.crossed_finish.same_sample,`P1 and leader cross the line together at 60x ${lang} ${width}`);
   }
   // Paused at fixed phases: drawn P1 position and 0.26.2 identity of everything recorded.
   for(const phase of FIXED_PHASES){
    const [a,b]=await Promise.all([page.evaluate(p=>{window.__sync.seek(p);return window.__sync.snapshot()},phase),oldPage.evaluate(p=>{window.__sync.seek(p);return window.__sync.snapshot()},phase)]);
    const same={actCanvas:a.actCanvas===b.actCanvas,clock:a.clock===b.clock,coverage:a.coverage===b.coverage,actSelected:a.actSelected===b.actSelected,predSelected:a.predSelected===b.predSelected,dashboard:a.dashboard===b.dashboard,table:a.table===b.table,predCanvas:a.predCanvas===b.predCanvas};
    // Only the predicted P1 car on the prediction canvas: its centre pixel must be its team colour.
    const pixel=await page.evaluate(p=>{const s=window.__sync,r=s.root,api=window.MatchLabF1MapComparison,at=s.at(p),pred=api.predictedMarkers(s.prediction,p,s.map,s.count,s.sync)[0];
     const select=r.querySelector('[data-map-driver]'),view=r.querySelector('[data-map-view]'),keep=[select.value,view.value];select.value=String(pred.driver_number);view.value='selected';view.dispatchEvent(new Event('change'));
     const q=api.fit(s.map)(pred),ctx=r.querySelector('[data-map-pred]').getContext('2d'),px=[...ctx.getImageData(Math.round(q.x),Math.round(q.y),1,1).data];
     const colour=(s.race.records.drivers.find(d=>d.driver_number===pred.driver_number)?.team_colour)||pred.team_colour;
     select.value=keep[0];view.value=keep[1];view.dispatchEvent(new Event('change'));
     return {driver:pred.driver_number,lap_progress:pred.lap_progress,leader_lap_progress:at.leader_lap_progress,x:+q.x.toFixed(2),y:+q.y.toFixed(2),pixel:px.slice(0,3),colour}},phase);
    const expected=/^[a-f\d]{6}$/i.test(pixel.colour||'')?[0,2,4].map(i=>parseInt(pixel.colour.slice(i,i+2),16)):null;
    const pixelOk=!!expected&&pixel.pixel.every((v,i)=>Math.abs(v-expected[i])<=2);
    run.fixed_phases.push({phase,same_as_0_26_2:same,p1_drawn:pixel,p1_pixel_matches_team_colour:pixelOk});
    ok(same.actCanvas&&same.clock&&same.coverage&&same.actSelected&&same.predSelected&&same.dashboard&&same.table,`recorded pane, clock, dashboard and table equal 0.26.2 at phase ${phase} ${lang} ${width}`);
    ok(pixelOk&&Math.abs(pixel.lap_progress-pixel.leader_lap_progress)<=1e-9,`predicted P1 drawn at the recorded leader lap progress, phase ${phase} ${lang} ${width}`);
   }
   run.predicted_canvas_differs_from_0_26_2=run.fixed_phases.filter(f=>!f.same_as_0_26_2.predCanvas).map(f=>f.phase);
   await page.evaluate(()=>window.__sync.seek(0.37));
   const shot=`recorded-${lang}-${width}.png`;await page.locator('.f1-map-comparison').screenshot({path:path.join(__dirname,shot)});result.screenshots.push(shot);
   const of=await overflow(page);run.overflow=of;ok(of.scrollWidth<=of.clientWidth,`no horizontal overflow ${lang} ${width}`);
   run.page_errors=errors;run.old_page_errors=oldErrors;ok(errors.length===0,`page errors 0 ${lang} ${width}`);
   result.runs.push(run);await ctx.close();
  }
  for(const lang of ['ko','en'])for(const width of [390,1440]){
   const ctx=await newContext(width),page=await ctx.newPage(),oldPage=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await open(page,base.new,UPCOMING,lang);await open(oldPage,base.old,UPCOMING,lang);
   const entry={lang,width,phases:[]};
   const tips=[await page.$eval('[data-map-speed]',s=>s.title),await oldPage.$eval('[data-map-speed]',s=>s.title)];
   ok(tips[0]===TOOLTIP.upcoming[lang]&&tips[1]===tips[0],`upcoming tooltip unchanged ${lang} ${width}`);entry.tooltip=tips[0];
   for(const phase of FIXED_PHASES){const [a,b]=await Promise.all([page.evaluate(p=>{window.__sync.seek(p);return window.__sync.snapshot()},phase),oldPage.evaluate(p=>{window.__sync.seek(p);return window.__sync.snapshot()},phase)]);
    const same=Object.keys(a).every(k=>a[k]===b[k]);entry.phases.push({phase,identical_to_0_26_2:same});ok(same,`upcoming GP view identical to 0.26.2 at phase ${phase} ${lang} ${width}`)}
   const host=[await page.$eval('#futuremaphost',e=>e.innerText),await oldPage.$eval('#futuremaphost',e=>e.innerText)];
   ok(host[0]===host[1],`upcoming map text identical ${lang} ${width}`);
   const rates=[];
   for(const p of [page,oldPage]){await p.evaluate(()=>{const r=window.__sync.root;window.__sync.seek(0.1);r.querySelector('[data-map-speed]').value='10';r.querySelector('[data-map-play]').click()});
    const a=await p.evaluate(()=>({w:performance.now(),ph:window.__sync.phase()}));await p.waitForTimeout(2500);const b=await p.evaluate(()=>({w:performance.now(),ph:window.__sync.phase()}));
    await p.evaluate(PAUSE);rates.push((b.ph-a.ph)*180/((b.w-a.w)/1000))}
   entry.rate_10x={new:+rates[0].toFixed(3),old:+rates[1].toFixed(3)};
   ok(Math.abs(rates[0]/10-1)<0.2&&Math.abs(rates[1]/10-1)<0.2,`upcoming GP 10x over a 180-second illustration ${lang} ${width}`);
   if(lang==='ko'&&width===390||lang==='en'&&width===1440){const shot=`upcoming-${lang}-${width}.png`;await page.evaluate(()=>window.__sync.seek(0.5));await page.locator('.f1-map-comparison').screenshot({path:path.join(__dirname,shot)});result.screenshots.push(shot)}
   const of=await overflow(page);entry.overflow=of;ok(of.scrollWidth<=of.clientWidth,`no horizontal overflow upcoming ${lang} ${width}`);
   entry.page_errors=errors;ok(errors.length===0,`page errors 0 upcoming ${lang} ${width}`);
   result.upcoming.push(entry);await ctx.close();
  }
  result.status='PASS';
 }catch(error){result.error=String(error&&error.stack||error);process.exitCode=1}
 finally{
  result.checks=checks.length;result.blocked_external_hosts=[...blocked].sort();result.checked_at=new Date().toISOString();
  fs.writeFileSync(path.join(__dirname,'browser-result.json'),JSON.stringify(result,null,1)+'\n');
  await browser.close();servers.old.close();servers.new.close();fs.rmSync(oldDir,{recursive:true,force:true});
  console.log(JSON.stringify({status:result.status,checks:checks.length,error:result.error?.split('\n')[0]}));
 }
})();
