const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),Engine=require('../record-engine.cjs');
require('../../f1/release-0.7.1/replay/metrics.js');require('../../f1/release-0.9.2/driver-names.js');require('../release-0.23.0/f1-natural-analysis.js');require('../../f1/release-0.9.2/history-analysis.js');
const Workbench=require('./workbench.js'),checks=[];
const html=name=>fs.readFileSync(path.join(root,name),'utf8'),json=(name,id)=>JSON.parse(html(name).match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)</script>'))[1]);
const data=json('index.html','data'),e=Engine.create(data),defaults={team:'understat:83',league:'EPL',season:'2026/27'};
for(const [q,name] of [['첼시 최근 5경기 득점','Chelsea'],['Barcelona last 5 matches goals','Barcelona']]){
 const p=e.parse(q,defaults),r=e.execute(p),id=Object.keys(data.teams).find(id=>data.teams[id].name===name);
 assert.deepEqual(p.teams,[id]);const games=data.completed.filter(m=>m.season===p.season&&(m.home===id||m.away===id)).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)).slice(-5);
 assert.equal(r.rows[0].value,games.reduce((sum,m)=>sum+(m.home===id?m.hg:m.ag),0));
}
checks.push('Explicit Chelsea/Barcelona questions retain named club and equal independently summed goals');
const prior=e.parse('Chelsea last 5 matches goals',defaults),changed=e.parse('Change to LaLiga',defaults,prior);assert.equal(changed.tool,'ranking');assert.deepEqual(changed.teams,[]);assert(e.execute(changed).rows.every(r=>data.teams[r.id].league==='La_liga'));checks.push('Cross-league follow-up clears inherited clubs and computes correct league');
const main=json('f1/index.html','dataset'),history={races:[...json('f1/index.html','f1-history-2024').races,...json('f1/index.html','f1-query-history').races,...main.races]};
const race=main.races.find(r=>r.session.session_key===11234),planner=Workbench.f1Planner({race,history,core:globalThis.MatchLabF1Natural,legacy:globalThis.MatchLabF1History});
let p=planner.prepare('노리스 최근 5경기 포인트'),r=planner.execute(p);assert.equal(r.races.length,1,'Opening GP must not use later races');
p=planner.prepare('작년으로 바꿔줘',p);r=planner.execute(p);assert.equal(r.races.length,5);let sum=0;for(const gp of r.races){const n=gp.records.drivers.find(d=>/NORRIS/i.test(d.full_name)).driver_number;sum+=gp.records.session_result.find(x=>x.driver_number===n).points;}assert.equal(r.result.rows[0].value,sum);checks.push('Historical points equal raw results; current opening GP excludes later races');
p=planner.prepare('노리스 최근 5경기 평균 랩타임');p=planner.prepare('작년으로 바꿔줘',p);assert.equal(planner.execute(p).error,'no_data');assert(!planner.metricsFor(p).includes('mean_lap'));checks.push('Uncollected archived laps are unavailable, not a successful empty analysis');
p=planner.prepare('노리스 포인트');p.period.sessionKey=11234;p=planner.prepare('2025년 포인트',p);assert(!p.period.sessionKey);assert.equal(planner.execute(p).kind,'single');checks.push('GP-year follow-up clears previous session identifier');
for(const name of ['index.html','index.en.html','f1/index.html']){
 const before=execFileSync('git',['show','db3962a:'+name],{cwd:root,encoding:'utf8',maxBuffer:60*1024*1024});
 const blocks=h=>[...h.replaceAll('\r\n','\n').matchAll(/<script[^>]*type="application\/json"[^>]*>[\s\S]*?<\/script>/g)].map(m=>m[0]);assert.deepEqual(blocks(html(name)),blocks(before),name+' source or prediction data changed');
}
checks.push('All embedded football/F1 source and prediction JSON remains identical after LF normalization');
fs.writeFileSync(__dirname+'/core-result.json',JSON.stringify({status:'PASS',checks},null,2));console.log('PASS',checks.length,'core regression groups');
