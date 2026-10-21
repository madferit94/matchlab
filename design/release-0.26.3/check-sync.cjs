// 0.26.3 check: predicted cars follow the recorded leader's lap progress in both replays
// (circuit map tab and lane comparison tab, which share MatchLabF1Comparison.leaderSync).
// Runs the module code shipped in f1/index.html (and the 0.26.2 page from git)
// in separate VM contexts, samples phase 0..1 densely for every GP with
// recorded lap data and writes design/release-0.26.3/sync-result.json.
// Usage: node design/release-0.26.3/check-sync.cjs [base-commit]
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),BASE=process.argv[2]||'ee48f51';
const live=fs.readFileSync(path.join(root,'f1/index.html'),'utf8');
const before=execFileSync('git',['show',BASE+':f1/index.html'],{cwd:root,maxBuffer:64*1024*1024}).toString('utf8');
const json=(html,id)=>JSON.parse(html.match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)</script>'))[1]);
const scripts=html=>[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function load(html){
 const all=scripts(html),pick=marker=>{const found=all.filter(s=>s.includes(marker));assert.equal(found.length,1,'one module with '+marker);return found[0]};
 const ctx=vm.createContext({console});
 const code={replay:pick('global.MatchLabF1Replay={'),comparison:pick('global.MatchLabF1Comparison={'),map:pick('global.MatchLabF1MapComparison=')};
 for(const k of ['replay','comparison','map'])vm.runInContext(code[k],ctx);
 return {ctx,code,replay:ctx.MatchLabF1Replay,cmp:ctx.MatchLabF1Comparison,map:ctx.MatchLabF1MapComparison};
}
const NEW=load(live),OLD=load(before);
const checks=[];const ok=(cond,msg)=>{assert(cond,msg);checks.push(msg)};
// Source identity: the shipped map and comparison modules equal the versioned source
// files, the stored 0.26.2 copies equal the modules in the base commit, and the replay
// module (recorded timeline) did not change.
ok(NEW.code.map===fs.readFileSync(path.join(root,'f1/release-0.26.3/map-comparison.js'),'utf8'),'shipped map module = f1/release-0.26.3/map-comparison.js');
ok(OLD.code.map===fs.readFileSync(path.join(root,'f1/release-0.26.3/map-comparison-0.26.2.js'),'utf8'),'stored 0.26.2 map module = module in '+BASE);
ok(NEW.code.comparison===fs.readFileSync(path.join(root,'f1/release-0.26.3/comparison.js'),'utf8'),'shipped comparison module = f1/release-0.26.3/comparison.js');
ok(OLD.code.comparison===fs.readFileSync(path.join(root,'f1/release-0.8.4/comparison.js'),'utf8'),'0.26.2 comparison module = f1/release-0.8.4/comparison.js');
ok(NEW.code.replay===OLD.code.replay,'replay module unchanged from 0.26.2');
ok(NEW.code.comparison.split('function leaderSync(').length===2&&!NEW.code.map.includes('function leaderSync(')&&!NEW.code.map.includes('SYNC_GAP_SECONDS')&&NEW.code.map.includes('global.MatchLabF1Comparison.syncedState(prediction,phase,sync)'),'one shared leader clock (comparison module) used by the map module');
ok(NEW.code.comparison.includes(',sync=leaderSync(recorded,null,predicted.length);')&&NEW.code.comparison.includes('const pred=sync?syncedState(prediction,phase,sync):predictedState(prediction,phase);'),'lane comparison draws predicted lanes from the shared leader clock');
for(const id of ['dataset','maps','forecasts','historical','tracks','f1-history-2024','f1-predictions-2025','f1-query-history','profile-data'])ok(json(live,id)!==null&&live.match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)</script>'))[1]===before.match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)</script>'))[1],'data block unchanged: '+id);
ok(NEW.code.map.includes("tr('1배속은 180초 예측 연출입니다.','1× is a 180-second prediction illustration.')"),'prediction-only tooltip unchanged');
ok(NEW.code.map.includes("tr('1배속은 실제 기록 시간과 같고, 예측 차도 실제 선두의 랩 진행에 맞춰 움직입니다.','1× follows recorded elapsed time, and predicted cars follow the lap progress of the recorded leader.')"),'recorded-GP tooltip updated (ko/en)');
ok(NEW.code.map.includes('sync=predictionOnly?null:global.MatchLabF1Comparison.leaderSync(timeline,lapCount,predicted.length)')&&NEW.code.map.includes('predictedMarkers(prediction,phase,map,lapCount,sync)'),'renderer passes the leader clock only on recorded GPs');

const dataset=json(live,'dataset'),maps=json(live,'maps').races,historical=json(live,'historical').races,forecasts=json(live,'forecasts').races;
const archive2025=json(live,'f1-query-history').races,archive2024=json(live,'f1-history-2024').races;
const SAMPLES=2000,EPS=1e-9;
// Everything the recorded pane draws or prints for a car (driver objects carry whole lap lists).
const laneView=(d,maxLaps)=>[d.driver.driver_number,Math.max(0,Math.min(1,d.progress/maxLaps)),d.rank,d.rank_source,d.position_timestamp,d.invalid_position_sample,d.lap,d.status,d.moving];
const view=d=>[d.driver.driver_number,d.progress,d.lap,d.status,d.rank,d.rank_source,d.position_timestamp,d.invalid_position_sample,d.moving,d.compound,d.inPit,d.x,d.y,d.coordinate_source,d.record_time,d.sample_before??null,d.sample_after??null];
const races=[];
for(const race of dataset.races.filter(r=>r.state==='completed'&&(r.records?.laps||[]).length)){
 const key=race.session.session_key,prediction=historical[String(key)],map=NEW.map.prepareMap(maps[String(key)],race.session.circuit_key),mapOld=OLD.map.prepareMap(maps[String(key)],race.session.circuit_key);
 assert(prediction&&map,'prediction and map for '+key);
 const timeline=NEW.replay.timeline(race),timelineOld=OLD.replay.timeline(race),count=NEW.map.raceLapCount(race);
 ok(count===OLD.map.raceLapCount(race)&&timeline.duration===timelineOld.duration&&timeline.start===timelineOld.start,'recorded clock unchanged '+key);
 const n=prediction.drivers.length,sync=NEW.map.leaderSync(timeline,count,n);
 assert(sync,'leader clock available '+key);
 // Lane comparison tab: same shared function, lap count derived from the timeline, lane scale = session_result laps.
 const laneSync=NEW.cmp.leaderSync(timeline,null,n),maxLaps=Math.max(1,...(race.records.session_result||[]).map(r=>r.number_of_laps||0));
 ok(laneSync&&laneSync.count===count&&laneSync.finish===sync.finish&&laneSync.gap===sync.gap&&laneSync.duration===sync.duration,'lane tab leader clock equals circuit tab clock '+key);
 const laneAt=phase=>NEW.cmp.syncedState(prediction,phase,laneSync);
 const recordedLeader=phase=>{const actual=NEW.map.actualMarkers(race,timeline,map,phase);return Math.max(0,...actual.map(d=>d.progress))};
 const predictedAt=phase=>NEW.map.predictedMarkers(prediction,phase,map,count,sync);
 // Real finish of the recorded leader: bisection on the recorded pane's lap progress.
 const firstReach=(f,target)=>{let lo=0,hi=1;if(f(hi)<target-EPS)return null;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(f(mid)>=target-EPS)hi=mid;else lo=mid}return hi};
 const realFinishPhase=firstReach(recordedLeader,count),predFinishPhase=firstReach(p=>predictedAt(p)[0].lap_progress,count),laneFinishPhase=firstReach(p=>laneAt(p)[0].lap_progress,count);
 const realStartSeconds=0; // timeline starts at the first valid lap start (first moment any recorded car moves)
 const leader0=recordedLeader(0);
 const phases=new Set([0,1]);for(let i=0;i<=SAMPLES;i++)phases.add(i/SAMPLES);
 for(let r=1;r<=n;r++){const t=(sync.finish+(r-1)*sync.gap)/timeline.duration;for(const d of [-1e-4,-1e-7,0,1e-7,1e-4])if(t+d>=0&&t+d<=1)phases.add(t+d)}
 const ordered=[...phases].sort((a,b)=>a-b);
 const lane={maxDiffLaneFraction:0,sumDiffLaneFraction:0,overtakes:0,backward:0,leftFinish:0,recordedDiffs:0,unsyncedDiffs:0,prev:null};
 let maxDiff=0,sumDiff=0,maxDiffRankOne=0,sumDiffRankOne=0,overtakes=0,backward=0,leftFinish=0,preStartMoves=0,gridHoldMoves=0,actualDiffs=0,prev=null;
 for(const phase of ordered){
  const pred=predictedAt(phase),actual=NEW.map.actualMarkers(race,timeline,map,phase),actualOld=OLD.map.actualMarkers(race,timelineOld,mapOld,phase);
  if(JSON.stringify(actual.map(view))!==JSON.stringify(actualOld.map(view)))actualDiffs++;
  const lead=Math.max(0,...actual.map(d=>d.progress)),diff=Math.abs(pred[0].lap_progress-lead);
  maxDiff=Math.max(maxDiff,diff);sumDiff+=diff;
  const rankOne=actual.find(d=>d.rank===1);if(rankOne){const d1=Math.abs(pred[0].lap_progress-rankOne.progress);maxDiffRankOne=Math.max(maxDiffRankOne,d1);sumDiffRankOne+=d1}
  assert.deepEqual(pred.map(d=>d.predicted_rank),pred.map((d,i)=>i+1),'markers in predicted order');
  for(let i=1;i<pred.length;i++)if(pred[i].lap_progress>pred[i-1].lap_progress+EPS)overtakes++;
  const seconds=phase*timeline.duration;
  if(seconds<=realStartSeconds)for(const d of pred)if(Math.abs(d.lap_progress-leader0)>EPS)preStartMoves++;
  for(const d of pred)if(seconds<(d.predicted_rank-1)*sync.gap-1e-6&&Math.abs(d.lap_progress-leader0)>EPS)gridHoldMoves++;
  if(prev)for(let i=0;i<pred.length;i++){if(pred[i].lap_progress<prev[i].lap_progress-EPS)backward++;if(prev[i].lap_progress>=count&&pred[i].lap_progress!==count)leftFinish++}
  prev=pred;
  const lp=laneAt(phase),lr=NEW.cmp.recordedState(race,timeline,phase),lrOld=OLD.cmp.recordedState(race,timelineOld,phase);
  if(JSON.stringify(lr.map(d=>laneView(d,maxLaps)))!==JSON.stringify(lrOld.map(d=>laneView(d,maxLaps))))lane.recordedDiffs++;
  if(JSON.stringify(NEW.cmp.predictedState(prediction,phase))!==JSON.stringify(OLD.cmp.predictedState(prediction,phase)))lane.unsyncedDiffs++;
  const leaderX=Math.max(0,...lr.map(d=>Math.max(0,Math.min(1,d.progress/maxLaps)))),p1X=Math.max(0,Math.min(1,lp[0].lap_progress/maxLaps)),dx=Math.abs(p1X-leaderX);
  lane.maxDiffLaneFraction=Math.max(lane.maxDiffLaneFraction,dx);lane.sumDiffLaneFraction+=dx;
  for(let i=1;i<lp.length;i++)if(lp[i].lap_progress>lp[i-1].lap_progress+EPS)lane.overtakes++;
  if(lane.prev)for(let i=0;i<lp.length;i++){if(lp[i].lap_progress<lane.prev[i].lap_progress-EPS)lane.backward++;if(lane.prev[i].lap_progress>=count&&lp[i].lap_progress!==count)lane.leftFinish++}
  lane.prev=lp;
 }
 const end=predictedAt(1),endOld=OLD.map.predictedMarkers(prediction,1,mapOld,count);
 const stopped=end.every(d=>d.lap_progress===count),finishedBy=end.map(d=>(sync.finish+(d.predicted_rank-1)*sync.gap));
 // 0.26.2 behaviour for the record: P1 crossed the line at phase 0.78 of the recorded clock.
 const oldP1Finish=firstReach(p=>OLD.map.predictedMarkers(prediction,p,mapOld,count)[0].lap_progress,count);
 const laneEnd=laneAt(1),laneOldP1Finish=firstReach(p=>OLD.cmp.predictedState(prediction,p)[0].progress,1);
 const laneResult={lane_scale_laps:maxLaps,max_abs_diff_lane_fraction:lane.maxDiffLaneFraction,mean_abs_diff_lane_fraction:lane.sumDiffLaneFraction/ordered.length,
  p1_finish_minus_recorded_leader_finish_seconds:+((laneFinishPhase-realFinishPhase)*timeline.duration).toFixed(6),overtakes:lane.overtakes,backward_moves:lane.backward,left_finish_after_reaching_it:lane.leftFinish,
  all_finished_at_phase1:laneEnd.every(d=>d.lap_progress===count),recorded_lane_differences_vs_0_26_2:lane.recordedDiffs,unsynced_predicted_state_differences_vs_0_26_2:lane.unsyncedDiffs,
  before_0_26_2:{p1_finish_seconds:+(laneOldP1Finish*timeline.duration).toFixed(1),p1_finish_phase:+laneOldP1Finish.toFixed(4)}};
 const result={session_key:key,year:race.session.year,name:race.meeting.meeting_name,laps:count,predicted_cars:n,recorded_cars:timeline.drivers.length,
  recorded_seconds:+timeline.duration.toFixed(3),recorded_leader_finish_seconds:+(realFinishPhase*timeline.duration).toFixed(3),gap_seconds_per_rank:+sync.gap.toFixed(4),
  last_predicted_finish_seconds:+Math.max(...finishedBy).toFixed(3),samples:ordered.length,
  max_abs_diff_laps:maxDiff,mean_abs_diff_laps:sumDiff/ordered.length,
  vs_position_record_p1:{max_abs_diff_laps:+maxDiffRankOne.toFixed(4),mean_abs_diff_laps:+(sumDiffRankOne/ordered.length).toFixed(5)},
  leader_progress_at_phase0:leader0,predicted_moves_before_real_start:preStartMoves,predicted_moves_during_grid_hold:gridHoldMoves,
  p1_finish_seconds:+(predFinishPhase*timeline.duration).toFixed(3),p1_finish_minus_recorded_leader_finish_seconds:+((predFinishPhase-realFinishPhase)*timeline.duration).toFixed(6),
  overtakes,backward_moves:backward,left_finish_after_reaching_it:leftFinish,all_stopped_on_line_at_phase1:stopped,
  recorded_pane_marker_differences_vs_0_26_2:actualDiffs,lane_tab:laneResult,
  before_0_26_2:{p1_finish_seconds:+(oldP1Finish*timeline.duration).toFixed(1),p1_finish_phase:+oldP1Finish.toFixed(4),all_stopped_on_line_at_phase1:endOld.every(d=>d.lap_progress===count)}};
 ok(maxDiff<=1e-9,'P1 = recorded leader lap progress at every sample '+key+' (max '+maxDiff+')');
 ok(preStartMoves===0&&gridHoldMoves===0,'predicted cars still before the real start and during their grid hold '+key);
 ok(Math.abs((predFinishPhase-realFinishPhase)*timeline.duration)<1e-6,'P1 crosses the line with the recorded leader '+key);
 ok(overtakes===0&&backward===0,'no overtakes or backward moves among predicted cars '+key);
 ok(stopped&&leftFinish===0,'all predicted cars stop on the line by phase 1 '+key);
 ok(actualDiffs===0,'recorded-pane markers identical to 0.26.2 at all samples '+key);
 ok(lane.maxDiffLaneFraction<=1e-12,'lane tab: predicted P1 lane position = recorded leader lane position '+key+' (max '+lane.maxDiffLaneFraction+')');
 ok(Math.abs(laneResult.p1_finish_minus_recorded_leader_finish_seconds)<1e-6,'lane tab: P1 finishes with the recorded leader '+key);
 ok(lane.overtakes===0&&lane.backward===0&&lane.leftFinish===0&&laneResult.all_finished_at_phase1,'lane tab: no overtakes, all predicted lanes finish and stop '+key);
 ok(lane.recordedDiffs===0&&lane.unsyncedDiffs===0,'lane tab: recorded lanes and unsynced predictedState identical to 0.26.2 '+key);
 races.push(result);console.log(JSON.stringify({lane_max:lane.maxDiffLaneFraction,lane_overtakes:lane.overtakes,key,name:result.name,max:maxDiff,mean:result.mean_abs_diff_laps,gap:result.gap_seconds_per_rank,finish_delta_s:result.p1_finish_minus_recorded_leader_finish_seconds,overtakes,stopped}));
}
// Prediction-only GPs: identical marker output to 0.26.2 (no leader clock).
const upcoming=[];
for(const race of dataset.races.filter(r=>r.state==='scheduled')){
 const key=race.session.session_key,prediction=forecasts[String(key)],mapRaw=maps[String(key)];
 if(!prediction?.drivers?.length||!mapRaw){upcoming.push({session_key:key,name:race.meeting.meeting_name,skipped:!prediction?.drivers?.length?'no forecast':'no map'});continue}
 const map=NEW.map.prepareMap(mapRaw,race.session.circuit_key),mapOld=OLD.map.prepareMap(mapRaw,race.session.circuit_key),count=NEW.map.raceLapCount(race);
 ok(count===3&&OLD.map.raceLapCount(race)===3&&NEW.map.playbackDuration(null,true)===180&&OLD.map.playbackDuration(null,true)===180,'upcoming GP keeps 3-lap 180-second illustration '+key);
 let differences=0,samples=0;
 for(let i=0;i<=SAMPLES;i++){const phase=i/SAMPLES;samples++;const a=JSON.stringify(NEW.map.predictedMarkers(prediction,phase,map,count)),b=JSON.stringify(OLD.map.predictedMarkers(prediction,phase,mapOld,count)),c=JSON.stringify(NEW.map.predictedMarkers(prediction,phase,map,count,null));if(a!==b||c!==b)differences++}
 ok(differences===0,'upcoming GP markers byte-identical to 0.26.2 '+key);
 let stateDiffs=0;for(let i=0;i<=SAMPLES;i++)if(JSON.stringify(NEW.cmp.predictedState(prediction,i/SAMPLES))!==JSON.stringify(OLD.cmp.predictedState(prediction,i/SAMPLES)))stateDiffs++;
 ok(stateDiffs===0,'upcoming GP predictedState identical to 0.26.2 '+key);
 upcoming.push({session_key:key,name:race.meeting.meeting_name,samples,marker_differences_vs_0_26_2:differences,predicted_state_differences_vs_0_26_2:stateDiffs});
}
const no_lap_data={
 2025:{gps:archive2025.length,with_lap_records:archive2025.filter(r=>(r.records?.laps||[]).length).length,note:'2025 GPs are saved results only (drivers, session_result); they have no lap records and no circuit replay tab.'},
 2024:{gps:archive2024.length,with_lap_records:archive2024.filter(r=>(r.records?.laps||[]).length).length}};
ok(no_lap_data[2025].with_lap_records===0,'no 2025 GP has recorded lap data');
const summary={max_abs_diff_laps:Math.max(...races.map(r=>r.max_abs_diff_laps)),mean_abs_diff_laps:races.reduce((a,r)=>a+r.mean_abs_diff_laps,0)/races.length,
 max_abs_finish_delta_seconds:Math.max(...races.map(r=>Math.abs(r.p1_finish_minus_recorded_leader_finish_seconds))),overtakes:races.reduce((a,r)=>a+r.overtakes,0),
 all_stopped_on_line:races.every(r=>r.all_stopped_on_line_at_phase1),recorded_pane_differences:races.reduce((a,r)=>a+r.recorded_pane_marker_differences_vs_0_26_2,0),
 lane_tab:{max_abs_diff_lane_fraction:Math.max(...races.map(r=>r.lane_tab.max_abs_diff_lane_fraction)),max_abs_finish_delta_seconds:Math.max(...races.map(r=>Math.abs(r.lane_tab.p1_finish_minus_recorded_leader_finish_seconds))),overtakes:races.reduce((a,r)=>a+r.lane_tab.overtakes,0),all_finished:races.every(r=>r.lane_tab.all_finished_at_phase1),recorded_lane_differences:races.reduce((a,r)=>a+r.lane_tab.recorded_lane_differences_vs_0_26_2,0)},
 gap_seconds_range:[Math.min(...races.map(r=>r.gap_seconds_per_rank)),Math.max(...races.map(r=>r.gap_seconds_per_rank))]};
const out={status:'PASS',release:'0.26.3',base_commit:BASE,checked_at:new Date().toISOString(),
 rule:'Leader lap progress L(t) = largest lap progress among recorded cars in MatchLabF1Replay.timeline(race).state(t), t = phase x recorded seconds. Predicted rank r lap progress = L(t - (r-1) x gap); L is held at L(0) before t=0 and at the race lap count from the recorded leader finish on. gap = min(2 s, (recorded seconds - leader finish seconds)/(predicted cars - 1)).',
 lane_tab_rule:'Lane comparison tab uses the same MatchLabF1Comparison.leaderSync (lap count = largest valid recorded lap number, equal to raceLapCount for all GPs) and draws predicted lanes at clamp(lap progress / session_result laps), the scale of the recorded lanes; Finish label when lap progress reaches the lap count. Upcoming GPs have no lane comparison tab (archive tabs: prediction, analysis).',
 samples_per_race:'2001 uniform phases plus finish instants of every predicted rank (+/-1e-4, +/-1e-7)',
 recorded_gps:races.length,races,upcoming_gps:upcoming,no_lap_data,summary,checks:checks.length};
fs.writeFileSync(path.join(__dirname,'sync-result.json'),JSON.stringify(out,null,1)+'\n');
console.log(JSON.stringify({status:'PASS',checks:checks.length,recorded_gps:races.length,upcoming:upcoming.length,summary}));
