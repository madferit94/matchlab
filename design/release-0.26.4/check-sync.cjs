// 0.26.4 check: the 0.26.3 replay sync rules (leaderSync, redFlagHold) on every completed 2026 GP,
// including the GPs added in 0.26.4. Runs the module code shipped in f1/index.html; the 0.26.3 page
// (git BASE, default 5a653c7 = main 0.26.3) is the reference for the GPs that already existed.
// Usage: node design/release-0.26.4/check-sync.cjs [base-commit]
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),BASE=process.argv[2]||'5a653c7',ADDED=[11388,11396,11404];
const live=fs.readFileSync(path.join(root,'f1/index.html'),'utf8');
const before=execFileSync('git',['show',BASE+':f1/index.html'],{cwd:root,maxBuffer:64*1024*1024}).toString('utf8');
const json=(html,id)=>JSON.parse(html.match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)</script>'))[1]);
function load(html){
 const all=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]),pick=marker=>{const found=all.filter(s=>s.includes(marker));assert.equal(found.length,1,marker);return found[0]};
 const ctx=vm.createContext({console}),code={replay:pick('global.MatchLabF1Replay={'),comparison:pick('global.MatchLabF1Comparison={'),map:pick('global.MatchLabF1MapComparison=')};
 for(const k of ['replay','comparison','map'])vm.runInContext(code[k],ctx);
 return {code,replay:ctx.MatchLabF1Replay,cmp:ctx.MatchLabF1Comparison,map:ctx.MatchLabF1MapComparison};
}
const NEW=load(live),OLD=load(before),checks=[],ok=(c,m)=>{assert(c,m);checks.push(m)};
ok(NEW.code.replay===OLD.code.replay,'replay module unchanged from 0.26.3');
ok(NEW.code.comparison===fs.readFileSync(path.join(root,'f1/release-0.26.4/comparison.js'),'utf8')&&NEW.code.map===fs.readFileSync(path.join(root,'f1/release-0.26.4/map-comparison.js'),'utf8'),'shipped modules = f1/release-0.26.4 sources (review R2 hold rule, R4 wording)');
const D=json(live,'dataset'),Dold=json(before,'dataset'),maps=json(live,'maps').races,mapsOld=json(before,'maps').races,H=json(live,'historical').races,F=json(live,'forecasts').races;
ok(JSON.stringify(json(live,'historical'))===JSON.stringify(json(before,'historical'))&&JSON.stringify(json(live,'forecasts'))===JSON.stringify(json(before,'forecasts')),'historical and forecast predictions unchanged');
const SAMPLES=2000,EPS=1e-9,clamp=x=>Math.max(0,Math.min(1,x));
const view=d=>[d.driver.driver_number,d.progress,d.lap,d.status,d.rank,d.rank_source,d.x,d.y,d.coordinate_source];
const races=[];
for(const race of D.races.filter(r=>r.state==='completed'&&(!process.env.ONLY||process.env.ONLY.split(',').includes(String(r.session.session_key))))){
 const key=race.session.session_key,added=ADDED.includes(key),prediction=H[String(key)]??F[String(key)],source=H[String(key)]?'historical (retrospective)':'forecast (published before the race)';
 if(!H[String(key)])ok(Date.parse(F[String(key)].as_of)<Date.parse(race.session.date_start),'forecast made before the race '+key);
 const map=NEW.map.prepareMap(maps[String(key)],race.session.circuit_key),timeline=NEW.replay.timeline(race),count=NEW.map.raceLapCount(race),n=prediction.drivers.length;
 const sync=NEW.map.leaderSync(timeline,count,n,race),laneSync=NEW.cmp.leaderSync(timeline,null,n,race),maxLaps=Math.max(1,...race.records.session_result.map(r=>r.number_of_laps||0));
 ok(sync&&laneSync&&laneSync.count===sync.count&&laneSync.finish===sync.finish&&laneSync.gap===sync.gap,'leader clock available and shared '+key);
 const oldRace=added?null:Dold.races.find(r=>r.session.session_key===key);
 const oldParts=oldRace?(()=>{const tl=OLD.replay.timeline(oldRace),c=OLD.map.raceLapCount(oldRace),m=OLD.map.prepareMap(mapsOld[String(key)],oldRace.session.circuit_key);return {tl,c,m,s:OLD.map.leaderSync(tl,c,n,oldRace)}})():null;
 const phases=new Set([0,1]);for(let i=0;i<=SAMPLES;i++)phases.add(i/SAMPLES);
 for(let r=1;r<=n;r++){const t=(sync.finish+(r-1)*sync.gap)/timeline.duration;for(const d of [-1e-4,0,1e-4])if(t+d>=0&&t+d<=1)phases.add(t+d)}
 const ordered=[...phases].sort((a,b)=>a-b);
 let maxDiff=0,laneMax=0,overtakes=0,backward=0,leftFinish=0,regress=0,prev=null;
 for(const phase of ordered){
  const pred=NEW.map.predictedMarkers(prediction,phase,map,count,sync),actual=NEW.map.actualMarkers(race,timeline,map,phase);
  maxDiff=Math.max(maxDiff,Math.abs(pred[0].lap_progress-Math.max(0,...actual.map(d=>d.progress))));
  for(let i=1;i<pred.length;i++)if(pred[i].lap_progress>pred[i-1].lap_progress+EPS)overtakes++;
  if(prev)for(let i=0;i<pred.length;i++){if(pred[i].lap_progress<prev[i].lap_progress-EPS)backward++;if(prev[i].lap_progress>=count&&pred[i].lap_progress!==count)leftFinish++}
  prev=pred;
  const lp=NEW.cmp.syncedState(prediction,phase,laneSync),lr=NEW.cmp.recordedState(race,timeline,phase);
  laneMax=Math.max(laneMax,Math.abs(clamp(lp[0].lap_progress/maxLaps)-Math.max(0,...lr.map(d=>clamp(d.progress/maxLaps)))));
  if(oldParts){const po=OLD.map.predictedMarkers(prediction,phase,oldParts.m,oldParts.c,oldParts.s),ao=OLD.map.actualMarkers(oldRace,oldParts.tl,oldParts.m,phase);if(JSON.stringify(po)!==JSON.stringify(pred)||JSON.stringify(ao.map(view))!==JSON.stringify(actual.map(view)))regress++}
 }
 const firstReach=(f,target)=>{let lo=0,hi=1;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(f(mid)>=target-EPS)hi=mid;else lo=mid}return hi};
 const realFinish=firstReach(p=>Math.max(0,...NEW.map.actualMarkers(race,timeline,map,p).map(d=>d.progress)),count),predFinish=firstReach(p=>NEW.map.predictedMarkers(prediction,p,map,count,sync)[0].lap_progress,count);
 const end=NEW.map.predictedMarkers(prediction,1,map,count,sync);
 // Red flags: from the last held-lap stop start until the restart, predicted cars and recorded cars drawn from lap progress stand still.
 const stops=sync.suspensions.map(([a,b])=>{const held=sync.held.filter(h=>h.stops.some(([p,q])=>q>a&&p<b));if(!held.length)return {window_seconds:[a,b],held_laps:0};
  // core starts 0.5 s after the last car entered its held lap (laps can overlap by a few ms at the line)
  const lapNo=Math.max(...held.map(h=>h.number)),core=Math.max(a,...held.filter(h=>h.number===lapNo).map(h=>h.stops[0][0]))+0.5,leaderStop=Math.max(a,Math.min(...held.filter(h=>h.number===lapNo).map(h=>h.stops[0][0])))+0.5;let predMove=0,recMove=0,p1Move=0;
  {let lo=Infinity,hi=-Infinity;for(let i=0;i<=400;i++){const t=leaderStop+(b-leaderStop)*i/400-1e-6*(i===400),v=NEW.map.predictedMarkers(prediction,t/timeline.duration,map,count,sync)[0].lap_progress;lo=Math.min(lo,v);hi=Math.max(hi,v)}p1Move=hi-lo}
  for(let r=1;r<=n;r++){let lo=Infinity,hi=-Infinity;for(let i=0;i<=100;i++){const t=core+(r-1)*sync.gap+(b-core)*i/100-1e-6*(i===100),v=NEW.map.predictedMarkers(prediction,t/timeline.duration,map,count,sync)[r-1].lap_progress;lo=Math.min(lo,v);hi=Math.max(hi,v)}predMove=Math.max(predMove,hi-lo)}
  // Recorded side: every held car keeps its lap progress (what the lane tab and the circuit reconstruction draw) from its own stop start until the restart.
  let cars=0,zeroMoving=0;for(const h of held){if(!(h.moving>1e-9))zeroMoving++;const [p,q]=h.stops.find(([x,y])=>y>a&&x<b),t0=p+0.5,t1=Math.min(q,b)-1e-6;if(t1<=t0)continue;cars++;let lo=Infinity,hi=-Infinity;
   for(let i=0;i<=20;i++){const t=t0+(t1-t0)*i/20,d=NEW.cmp.recordedState(race,timeline,t/timeline.duration).find(x=>x.driver.driver_number===h.driver_number);lo=Math.min(lo,d.progress);hi=Math.max(hi,d.progress)}recMove=Math.max(recMove,hi-lo)}
  return {window_seconds:[+a.toFixed(1),+b.toFixed(1)],held_laps:sync.held.length,leader_stop_seconds:[+leaderStop.toFixed(1),+b.toFixed(1)],p1_movement_laps:p1Move,all_cars_stop_seconds:[+core.toFixed(1),+b.toFixed(1)],predicted_movement_laps:predMove,recorded_held_cars:cars,laps_wholly_inside_suspension:zeroMoving,recorded_held_movement_laps:recMove}});
 const result={session_key:key,name:race.meeting.meeting_name,added_in_0_26_4:added,prediction_source:source,laps:count,predicted_cars:n,recorded_cars:timeline.drivers.length,recorded_seconds:+timeline.duration.toFixed(1),gap_seconds_per_rank:+sync.gap.toFixed(4),samples:ordered.length,
  max_abs_diff_laps:maxDiff,lane_max_abs_diff_fraction:laneMax,p1_finish_minus_recorded_leader_finish_seconds:+((predFinish-realFinish)*timeline.duration).toFixed(6),overtakes,backward_moves:backward,left_finish:leftFinish,all_stopped_on_line_at_phase1:end.every(d=>d.lap_progress===count),
  red_flag_suspensions:stops,samples_differing_from_0_26_3:added?null:regress,
  predicted_without_recorded:prediction.drivers.map(d=>d.driver_number).filter(x=>!race.records.drivers.some(d=>d.driver_number===x)),recorded_without_prediction:race.records.drivers.map(d=>d.driver_number).filter(x=>!prediction.drivers.some(d=>d.driver_number===x))};
 ok(maxDiff<=EPS&&laneMax<=1e-12,'P1 = recorded leader in both tabs '+key);
 ok(Math.abs(result.p1_finish_minus_recorded_leader_finish_seconds)<1e-6,'P1 finishes with the recorded leader '+key);
 ok(overtakes===0&&backward===0&&leftFinish===0&&result.all_stopped_on_line_at_phase1,'no overtakes, all predicted cars stop on the line '+key);
 ok(stops.every(s=>!s.held_laps||s.predicted_movement_laps<=EPS&&s.p1_movement_laps<=EPS&&s.recorded_held_movement_laps<=EPS&&s.recorded_held_cars>0),'red-flag stop holds predicted and recorded (lap-progress) cars '+key);
 if(!added)ok(regress===0,'existing GP markers identical to 0.26.3 '+key);
 races.push(result);console.log(JSON.stringify({key,added,source:source.split(' ')[0],max:maxDiff,lane:laneMax,gap:result.gap_seconds_per_rank,overtakes,stops:stops.map(s=>s.held_laps)}));
}
const upcoming=[];
for(const race of D.races.filter(r=>r.state==='scheduled')){
 const key=race.session.session_key,prediction=F[String(key)],map=NEW.map.prepareMap(maps[String(key)],race.session.circuit_key),mapOld=OLD.map.prepareMap(mapsOld[String(key)],race.session.circuit_key);let diff=0;
 for(let i=0;i<=SAMPLES;i++){const p=i/SAMPLES;if(JSON.stringify(NEW.map.predictedMarkers(prediction,p,map,3))!==JSON.stringify(OLD.map.predictedMarkers(prediction,p,mapOld,3)))diff++}
 ok(diff===0,'upcoming GP illustration identical to 0.26.3 '+key);upcoming.push({session_key:key,name:race.meeting.meeting_name,marker_differences:diff});
}
ok(!!process.env.ONLY||races.length===19&&races.filter(r=>r.added_in_0_26_4).length===3&&upcoming.length===4,'19 completed (3 added) and 4 upcoming GPs');
const out={status:'PASS',release:'0.26.4',base_commit:BASE,checked_at:new Date().toISOString(),races,upcoming,checks:checks.length};
fs.writeFileSync(path.join(__dirname,'sync-result.json'),JSON.stringify(out,null,1)+'\n');
console.log(JSON.stringify({status:'PASS',checks:checks.length,completed:races.length,upcoming:upcoming.length}));
