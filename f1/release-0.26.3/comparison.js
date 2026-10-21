(function(global){
'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function predictedRows(prediction){
 const drivers=prediction?.drivers||[],order=prediction?.predicted_order;
 const listed=Array.isArray(order)?order.map(x=>typeof x==='object'?x.driver_number:x):[];
 const sorted=drivers.slice().sort((a,b)=>listed.length?(listed.indexOf(a.driver_number)<0?99:listed.indexOf(a.driver_number))-(listed.indexOf(b.driver_number)<0?99:listed.indexOf(b.driver_number)):(a.expected_rank??99)-(b.expected_rank??99));
 return sorted.map((d,i)=>({...d,predicted_rank:i+1}));
}
function predictedState(prediction,phase){
 const rows=predictedRows(prediction),p=clamp(phase);
 return rows.map(d=>({...d,progress:Math.min(1,p/(.78+.22*(d.predicted_rank-1)/Math.max(1,rows.length-1)))}));
}
// 0.26.3: shared recorded-leader clock for both replays (lane comparison and circuit map).
// Leader lap progress at t seconds = the largest lap progress among recorded cars in
// timeline.state(t) (the values the recorded side draws). Predicted rank r uses that curve
// SYNC_GAP_SECONDS*(r-1) seconds later, shortened so the last predicted car reaches the
// line by the end of the recorded clock. Without lapCount the race lap count is the
// largest valid recorded lap number in the timeline.
// Red flags: a lap that overlaps a suspension (race control "RED FLAG" until the next
// "SESSION STARTED"/"STANDING START"/"ROLLING START") and is longer than ABNORMAL_LAP_RATIO x
// that driver's median lap, or starts during the suspension, holds its lap progress during the
// suspension and spreads the lap over the moving time only. Lap numbers and lap start/end
// times stay as recorded.
const SYNC_GAP_SECONDS=2,SYNC_FINISH_TOLERANCE=1e-9,ABNORMAL_LAP_RATIO=4;
function suspensions(race,start){
 const messages=(race?.records?.race_control||[]).map(m=>({t:Date.parse(m.date),text:String(m.message||'')})).filter(m=>Number.isFinite(m.t)).sort((a,b)=>a.t-b.t),out=[];
 for(const m of messages)if(/^RED FLAG/i.test(m.text)){const resume=messages.find(x=>x.t>m.t&&/^(SESSION STARTED|STANDING START|ROLLING START)/i.test(x.text));if(resume)out.push([(m.t-start)/1000,(resume.t-start)/1000])}
 return out;
}
function heldLaps(timeline,windows){
 const held=new Map();if(!windows.length)return held;
 for(const d of timeline.drivers||[]){const durations=(d.laps||[]).map(l=>l.end-l.start).filter(Number.isFinite).sort((a,b)=>a-b);if(!durations.length)continue;const median=durations[durations.length>>1];
  for(const l of d.laps){if(!(l.end-l.start>ABNORMAL_LAP_RATIO*median)&&!windows.some(([a,b])=>l.start>a&&l.start<b))continue;const stops=windows.map(([a,b])=>[Math.max(a,l.start),Math.min(b,l.end)]).filter(([a,b])=>b>a),moving=l.end-l.start-stops.reduce((x,[a,b])=>x+b-a,0);if(stops.length&&moving>0)held.set(l,{driver_number:d.driver.driver_number,number:l.number,start:l.start,end:l.end,stops,moving})}}
 return held;
}
function heldProgress(h,t){return h.number-1+Math.max(0,Math.min(h.moving,t-h.start-h.stops.reduce((x,[a,b])=>x+Math.max(0,Math.min(b,t)-a),0)))/h.moving}
function leaderSync(timeline,lapCount,carCount,race){
 if(!timeline||typeof timeline.state!=='function'||!Number.isFinite(timeline.duration)||timeline.duration<=0)return null;
 const numbers=(timeline.drivers||[]).flatMap(d=>(d.laps||[]).map(l=>l.number).filter(n=>Number.isInteger(n)&&n>0));
 const count=Number.isInteger(lapCount)&&lapCount>0?lapCount:Math.max(0,...numbers);
 if(!count)return null;
 const finish=Math.min(...(timeline.drivers||[]).flatMap(d=>(d.laps||[]).filter(l=>l.number>=count&&Number.isFinite(l.end)).map(l=>l.end)));
 if(!Number.isFinite(finish)||finish>timeline.duration)return null;
 const gap=Math.max(0,Math.min(SYNC_GAP_SECONDS,(timeline.duration-finish)/Math.max(1,(Number.isInteger(carCount)?carCount:1)-1)));
 const windows=suspensions(race,timeline.start),held=heldLaps(timeline,windows);
 const progress=(d,t)=>{const active=held.size?(d.laps||[]).find(l=>t>=l.start&&t<l.end):null,h=active&&held.get(active);return h?heldProgress(h,t):Number.isFinite(d.progress)?d.progress:0};
 const lap=seconds=>{if(seconds>=finish-SYNC_FINISH_TOLERANCE)return count;const t=clamp(seconds,0,timeline.duration);return Math.min(count,Math.max(0,...timeline.state(t).map(d=>progress(d,t))))};
 return {count,finish,gap,duration:timeline.duration,lap,suspensions:windows,held:[...held.values()]};
}
function syncedState(prediction,phase,sync){
 const seconds=clamp(phase)*sync.duration;
 return predictedRows(prediction).map(d=>{const lap=sync.lap(seconds-(d.predicted_rank-1)*sync.gap);return {...d,progress:lap/sync.count,lap_progress:lap}});
}
function recordedState(race,model,phase){
 const p=clamp(phase),seconds=p*model.duration,epoch=model.start+seconds*1000,latest=new Map();
 for(const row of race.records.position||[]){const date=Date.parse(row.date);if(!Number.isFinite(date)||date>epoch)continue;const prev=latest.get(row.driver_number);if(!prev||date>=prev.date)latest.set(row.driver_number,{date,position:row.position});}
 return model.state(seconds).map(d=>{const sample=latest.get(d.driver.driver_number),pos=sample&&Number.isInteger(sample.position)&&sample.position>=1&&sample.position<=model.drivers.length?sample:null;return {...d,rank:p===1?d.rank:pos?.position??d.rank,rank_source:p===1?'session_result':pos?'recorded_position':'lap_inference',position_timestamp:pos?.date??null,invalid_position_sample:!!sample&&!pos};});
}
function arrangeRecordedLanes(states,lanes,pane,animate=true){
 const ordered=states.slice().sort((a,b)=>(Number.isInteger(a.rank)&&a.rank>0?a.rank:999)-(Number.isInteger(b.rank)&&b.rank>0?b.rank:999)||a.driver.driver_number-b.driver.driver_number);
 const rows=ordered.map(d=>lanes.get(d.driver.driver_number)?.row).filter(Boolean);
 if(!animate)rows.forEach(row=>row.getAnimations?.().forEach(animation=>animation.cancel()));
 if(rows.every((row,i)=>pane.children[i]===row))return;
 const before=new Map(rows.map(row=>[row,row.getBoundingClientRect().top]));
 rows.forEach(row=>{row.getAnimations?.().forEach(animation=>animation.cancel());pane.append(row)});
 if(animate)rows.forEach(row=>{const delta=before.get(row)-row.getBoundingClientRect().top;if(Math.abs(delta)>.5&&row.animate)row.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:480,easing:'cubic-bezier(.22,.61,.36,1)'});});
}
function mount(container,race,prediction,{locale='ko'}={}){
 const en=locale==='en',tr=(a,b)=>en?b:a;
 if(race.state!=='completed'||!prediction?.drivers?.length){container.textContent=tr('종료 레이스의 경기 전 예측 자료가 아직 없습니다.','Pre-race predictions for this completed race are not available.');return {destroy(){container.replaceChildren()}}}
 if(!global.MatchLabF1Replay)throw new Error('Load replay.js before comparison.js');
 const recorded=global.MatchLabF1Replay.timeline(race),predicted=predictedRows(prediction),byNumber=new Map(predicted.map(d=>[d.driver_number,d])),identity=(race.records.drivers||[]).slice().sort((a,b)=>a.driver_number-b.driver_number),maxLaps=Math.max(1,...(race.records.session_result||[]).map(r=>r.number_of_laps||0)),sync=leaderSync(recorded,null,predicted.length,race);
 const root=document.createElement('section');root.className='f1-comparison';
 root.innerHTML=`<style>.f1-comparison{background:#fff9e6;border:3px solid #284535;padding:16px;color:#193442;font-family:Arial,sans-serif}.f1-comparison h3,.f1-comparison h4{margin:8px 0 12px}.f1-comparison-explanation{margin-top:14px}.f1-comparison-explanation summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-size:14px;font-weight:bold}.f1-comparison-explanation summary:before{content:'▸';margin-right:8px}.f1-comparison-explanation[open] summary:before{content:'▾'}.f1-comparison-note{font-size:14px;line-height:1.65;margin:8px 0}.f1-board-pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}.f1-board{min-width:0}.f1-lanes{max-height:650px;overflow-y:auto}.f1-lane{display:grid;grid-template-columns:82px minmax(60px,1fr) 112px;gap:7px;align-items:center;margin:5px 0;min-height:36px;font-size:14px;line-height:1.5}.f1-lane-track{background:#d5e4b8;border-top:1px dashed #829579;border-bottom:1px dashed #829579;height:23px;position:relative}.f1-lane-track:after{content:'';position:absolute;right:0;top:0;width:9px;height:23px;background:repeating-conic-gradient(#213932 0 25%,#fff 0 50%) 0/6px 6px}.f1-lane-car{position:absolute;top:6px;width:17px;height:11px;transform:translateX(-50%);box-shadow:3px -3px #213932,3px 3px #213932;z-index:1}.f1-lane-name{font-weight:bold;white-space:nowrap}.f1-lane-status{text-align:right;overflow-wrap:anywhere}.f1-comparison-controls{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:14px 0}.f1-comparison-controls button,.f1-comparison-controls select{font:inherit;padding:8px;min-height:44px}.f1-comparison-controls input{width:100%}.f1-comparison-table-wrap{overflow:auto;margin-top:15px}.f1-comparison-table{width:100%;border-collapse:collapse;font-size:14px;white-space:nowrap}.f1-comparison-table th,.f1-comparison-table td{padding:9px 10px;text-align:left;border-bottom:1px solid #c4ceb2}.f1-comparison-table th{background:#dce5c7}.f1-lane-car.is-stopped{opacity:.45}@media(max-width:760px){.f1-board-pair{grid-template-columns:1fr}.f1-lane{grid-template-columns:70px minmax(60px,1fr) 106px}}</style><h3>${tr('경기 전 예측 vs 실제 기록','Pre-race prediction vs recorded race')}</h3><p class="f1-comparison-note">${sync?tr('예측은 경기 전 예상 순위대로 실제 선두의 랩 진행을 따라가는 연출 · 실제는 기록 기반 진행','Prediction follows the lap progress of the recorded leader in pre-race order · Actual progress uses recorded data'):tr('예측은 경기 전 예상 최종순위 연출 · 실제는 기록 기반 진행','Prediction illustrates pre-race finishing order · Actual progress uses recorded data')}</p>${sync?`<p class="f1-comparison-note" data-compare-speed-note>${tr('이 탭의 1×는 경기 전체를 60초로 줄인 속도이며, 예측과 실제 줄은 같은 시계로 움직입니다. 서킷 탭의 1×는 실제 기록 시간과 같습니다.','In this tab 1× plays the whole race in 60 seconds, and predicted and recorded lanes share one clock. In the circuit tab 1× is recorded elapsed time.')}</p>`:''}<div class="f1-comparison-controls"><button type="button" data-compare-play>${tr('비교 재생','Play comparison')}</button><button type="button" data-compare-reset>${tr('처음부터','Reset')}</button><label>${tr('재생 속도','Playback speed')} <select data-compare-speed><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label><span data-compare-clock></span><input data-compare-seek type="range" min="0" max="1" step="any" value="0" aria-label="${tr('예측·실제 비교 진행','Prediction and record comparison progress')}"></div><div class="f1-board-pair"><div class="f1-board"><h4>${tr('경기 전 예측 · 순위 연출','Pre-race prediction · order illustration')}</h4><div class="f1-lanes" data-predicted-lanes></div></div><div class="f1-board"><h4>${tr('실제 기록 · 순위 변화와 랩 진행','Recorded race · rank changes and lap progress')}</h4><div class="f1-lanes" data-recorded-lanes></div></div></div><div class="f1-comparison-table-wrap"><table class="f1-comparison-table"><thead><tr><th>${tr('드라이버','Driver')}</th><th>${tr('예측 순위','Predicted order')}</th><th>${tr('실제 순위','Actual order')}</th><th>${tr('최종 상태','Final status')}</th><th>${tr('순위 차이','Rank difference')}</th><th>${tr('경기 전 우승 확률','Pre-race win probability')}</th></tr></thead><tbody data-compare-table></tbody></table></div>`;
 container.replaceChildren(root);
 const play=root.querySelector('[data-compare-play]'),reset=root.querySelector('[data-compare-reset]'),speed=root.querySelector('[data-compare-speed]'),seek=root.querySelector('[data-compare-seek]'),clock=root.querySelector('[data-compare-clock]'),predPane=root.querySelector('[data-predicted-lanes]'),actPane=root.querySelector('[data-recorded-lanes]'),tbody=root.querySelector('[data-compare-table]');
 function lane(driver,pane){const row=document.createElement('div');row.className='f1-lane';const name=document.createElement('span');name.className='f1-lane-name';name.textContent=`${driver.driver_number} ${driver.name_acronym||''}`;name.title=driver.full_name||'';const track=document.createElement('div');track.className='f1-lane-track';const car=document.createElement('span');car.className='f1-lane-car';car.style.background=/^[a-f\d]{6}$/i.test(driver.team_colour||'')?'#'+driver.team_colour:'#24465d';track.append(car);const status=document.createElement('span');status.className='f1-lane-status';row.append(name,track,status);row.dataset.driver=driver.driver_number;pane.append(row);return {row,car,status}}
 const predLanes=new Map(identity.map(d=>[d.driver_number,lane(d,predPane)])),actLanes=new Map(identity.map(d=>[d.driver_number,lane(d,actPane)]));
 predicted.forEach(d=>{const result=(race.records.session_result||[]).find(r=>r.driver_number===d.driver_number),actual=result?.position??null;const row=document.createElement('tr');const vals=[d.name||identity.find(r=>r.driver_number===d.driver_number)?.full_name||d.driver_number,d.predicted_rank,actual??'—',result?.dns?tr('미출발','DNS'):result?.dsq?tr('실격','DSQ'):result?.dnf?tr('리타이어','DNF'):result?tr('완주','Finished'):tr('자료 없음','No data'),actual===null?'—':`${actual-d.predicted_rank>0?'+':''}${actual-d.predicted_rank}`,Number.isFinite(d.win_probability)?`${(d.win_probability*100).toFixed(1)}%`:'—'];vals.forEach((v,index)=>{const td=document.createElement('td');td.textContent=v;if(index===0){const profiles=JSON.parse(document.getElementById('profile-data').textContent).drivers;const normalize=n=>String(n||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const driver=identity.find(x=>x.driver_number===d.driver_number);const id=normalize(driver?.full_name||v);if(profiles[id]){const link=document.createElement('a');link.href='#driver='+encodeURIComponent(id);link.textContent=v;link.style.cssText='color:#076e86;text-decoration:underline;text-underline-offset:3px;font-weight:600;display:inline-block;padding:8px 0';td.replaceChildren(link)}}row.append(td)});tbody.append(row)});
 let phase=0,playing=false,frame=0,last=0,disposed=false;
 const reducedMotion=global.matchMedia?.('(prefers-reduced-motion: reduce)');
 const statusKo={'RACING':'주행','FINISHED':'완주','DNF':'리타이어','DNS':'미출발','DSQ':'실격','NO DATA':'자료 없음','NO LAP DATA':'기록 공백'};
 function draw(animateOrder=false){const pred=sync?syncedState(prediction,phase,sync):predictedState(prediction,phase);pred.forEach(d=>{const lane=predLanes.get(d.driver_number);if(!lane)return;lane.car.style.left=`${2+(sync?clamp(d.lap_progress/maxLaps):d.progress)*96}%`;lane.status.textContent=`${tr('예측','Pred')} ${d.predicted_rank}${(sync?d.lap_progress>=sync.count:d.progress>=1)?' · '+tr('도착','Finish'):''}`});const actual=recordedState(race,recorded,phase);arrangeRecordedLanes(actual,actLanes,actPane,animateOrder&&!reducedMotion?.matches);actual.forEach(d=>{const lane=actLanes.get(d.driver.driver_number);if(!lane)return;lane.row.dataset.rank=d.rank??'';lane.car.style.left=`${2+clamp(d.progress/maxLaps)*96}%`;lane.car.className='f1-lane-car'+(!d.moving?' is-stopped':'');lane.status.textContent=`${d.rank??'—'}${d.rank_source==='lap_inference'?'*':''} · L${d.lap} · ${en?d.status:statusKo[d.status]||d.status}`});seek.value=phase;clock.textContent=`${Math.round(phase*100)}% · ${tr('유효 랩 기록 시작 후','Since first valid lap record')} ${Math.floor(phase*recorded.duration/60)}:${String(Math.floor(phase*recorded.duration%60)).padStart(2,'0')} · ${new Date(recorded.start+phase*recorded.duration*1000).toLocaleTimeString('en-GB',{timeZone:'Asia/Seoul',hour12:false})} KST${phase===1?' · '+tr('종료','Finished'):''}`} 
 function tick(now){if(disposed||!playing)return;if(last)phase=clamp(phase+(now-last)/1000/60*Number(speed.value||1));last=now;draw(true);if(phase===1){playing=false;last=0;play.textContent=tr('비교 재생','Play comparison');return}frame=requestAnimationFrame(tick)}
 function toggle(){playing=!playing;cancelAnimationFrame(frame);last=0;if(playing){if(phase===1)phase=0;frame=requestAnimationFrame(tick)}play.textContent=playing?tr('일시정지','Pause'):tr('비교 재생','Play comparison')}
 function rewind(){playing=false;cancelAnimationFrame(frame);last=0;phase=0;play.textContent=tr('비교 재생','Play comparison');draw()}
 function move(){phase=clamp(Number(seek.value));last=0;draw()}
 function hidden(){if(document.hidden&&playing)toggle()}
 play.addEventListener('click',toggle);reset.addEventListener('click',rewind);seek.addEventListener('input',move);document.addEventListener('visibilitychange',hidden);draw();
 return {destroy(){disposed=true;playing=false;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',hidden);play.removeEventListener('click',toggle);reset.removeEventListener('click',rewind);seek.removeEventListener('input',move);container.replaceChildren()},recorded,predicted,sync};
}
global.MatchLabF1Comparison={mount,predictedRows,predictedState,recordedState,arrangeRecordedLanes,leaderSync,syncedState};
})(typeof window!=='undefined'?window:globalThis);

