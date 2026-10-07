const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const html=fs.readFileSync('f1/index.html','utf8'),get=id=>JSON.parse(html.match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)<\\/script>'))[1]);
const D=get('dataset'),F=get('forecasts'),P=get('profile-data');vm.runInThisContext(fs.readFileSync('f1/profiles/profiles.js','utf8'));
const m=MatchLabF1Profiles.createModel(D,F,P);assert.equal(m.drivers.length,23);assert.equal(m.teams.length,11);assert.equal(m.drivers.filter(x=>x.current_roster).length,22);
for(const pack of [P.current.championship_drivers,P.current.championship_teams]){assert.equal(pack.status,'ok');assert(pack.rows.every(x=>Number.isFinite(x.points_current)&&Number.isInteger(x.position_current)));}
assert.equal(new Set(P.current.championship_drivers.rows.map(x=>x.driver_number)).size,23);
assert.equal([...m.standings.values()].reduce((s,x)=>s+x.points_current,0),[...m.teamStandings.values()].reduce((s,x)=>s+x.points_current,0));
assert.equal([...m.scenario.values()].reduce((s,x)=>s+x.added,0),101*m.future.length);assert.equal([...m.teamScenario.values()].reduce((s,x)=>s+x.added,0),101*m.future.length);
for(const d of m.drivers){assert(m.standings.has(d.driver_number));const history=m.history(d);assert(history.every(h=>MatchLabF1Profiles.key(h.driver.full_name)===d.id));}
const max=m.drivers.find(d=>d.id==='max-verstappen'),years=m.seasons(max);assert.equal(max.driver_number,3);assert(years.filter(x=>+x.year<2026).every(x=>x.row&&x.row.driver_number===1));
for(const team of m.teams){const expected=D.races.filter(r=>r.state==='completed').flatMap(r=>{const ids=r.records.drivers.filter(d=>MatchLabF1Profiles.key(d.team_name)===team.id).map(d=>d.driver_number);return r.records.session_result.filter(x=>ids.includes(x.driver_number))});assert.equal(m.teamHistory(team).flatMap(h=>h.rows).length,expected.length)}
const before=cp.execFileSync('git',['-c','safe.directory=*','show','HEAD:f1/index.html'],{maxBuffer:40*1024*1024,encoding:'utf8'});
for(const id of ['dataset','forecasts','historical','maps','tracks']){const rx=new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)<\\/script>');assert.equal(html.match(rx)[1],before.match(rx)[1])}
console.log('PASS 23 driver / 11 team coverage, championship totals, scenario point conservation, cross-season number changes, team aggregation and five original JSON payloads');
