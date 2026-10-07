const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),engine=require('../record-engine.cjs'),{loadData,createServer}=require('../../server/gemini.cjs');
const data=loadData(),analyst=engine.create(data),defaults={league:'EPL',season:'2025/26'};
const tests=[];function test(name,fn){fn();tests.push(name);console.log('PASS '+name)}
const ascending=analyst.parse('프리미어리그 2025/26 경기당 실점이 적은 팀부터 순서대로 보여줘',defaults);
test('original failing question resolves ascending ranking',()=>{assert.equal(ascending.tool,'ranking');assert.equal(ascending.order,'asc');assert.equal(ascending.metric,'ga');assert.equal(ascending.perMatch,true)});
const rows=analyst.execute(ascending).rows;
test('all club values agree with independently counted scores',()=>{for(const r of rows){const matches=data.completed.filter(m=>m.season==='2025/26'&&(m.home===r.id||m.away===r.id));assert.equal(r.value,matches.reduce((s,m)=>s+(m.home===r.id?m.ag:m.hg),0)/matches.length)}assert(rows.every((r,i)=>!i||rows[i-1].value<=r.value))});
test('English and Korean numeric ranks agree',()=>{assert.deepEqual(analyst.execute(analyst.parse('Premier League 2025/26 goals conceded per match lowest first',defaults)).rows,rows)});
test('reverse retains league metric season and recent count',()=>{const p=analyst.parse('반대로 보여줘',defaults,ascending);assert.equal(p.order,'desc');for(const k of ['league','metric','season','last','venue','perMatch'])assert.equal(p[k],ascending[k]);const r=analyst.execute(p).rows;assert(r.every((x,i)=>!i||r[i-1].value>=x.value));assert.deepEqual(r.map(x=>x.value),rows.map(x=>x.value).reverse())});
test('direction conflict and reverse without context are refused',()=>{assert(analyst.parse('반대로 보여줘',defaults).error);assert(analyst.parse('EPL 실점 오름차순 내림차순',defaults).error)});
const context={console};context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'f1/release-0.7.1/replay/metrics.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'f1/release-0.8.5/natural-analysis.js'),'utf8'),context);
const natural=context.MatchLabF1Natural;
const fhtml=fs.readFileSync(path.join(root,'f1/index.html'),'utf8');const dataset=JSON.parse(fhtml.match(/<script id="dataset" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const race=Object.values(dataset.races).find(r=>r.state==='completed'&&r.session.session_key===11234)||Object.values(dataset.races).find(r=>r.state==='completed');
const fplan=natural.parse('최고 속도 낮은 순으로 보여줘',race,null);
test('F1 natural direction synonyms and numeric values',()=>{assert(!fplan.error,JSON.stringify(fplan));assert.equal(fplan.conditions.order,'asc');const a=natural.execute(fplan,race,null).rows.filter(r=>r.value!==null);assert(a.length>1);assert(a.every((r,i)=>!i||a[i-1].value<=r.value));const values=(race.records.laps||[]).filter(x=>Number.isFinite(x.st_speed)&&x.st_speed>0);for(const r of a){const d=race.records.drivers.find(d=>(d.full_name||d.name)===r.name);const expected=Math.max(...values.filter(l=>l.driver_number===d.driver_number).map(l=>l.st_speed));assert.equal(r.value,expected)}});
test('F1 fast and slow lap-time order reverses',()=>{for(const [q,order] of [['평균 랩타임 빠른 순으로 보여줘','asc'],['Mean lap time slowest first','desc']]){const p=natural.parse(q,race,null);assert(!p.error,JSON.stringify(p));assert.equal(p.conditions.order,order)}});
test('F1 follow-up retains scope and excludes other race context',()=>{const p=natural.parse('반대로 보여줘',race,null,fplan);assert.equal(p.conditions.order,'desc');assert.equal(p.metric,fplan.metric);const a=natural.execute(p,race,null).rows.filter(r=>r.value!==null);assert(a.every((r,i)=>!i||a[i-1].value>=r.value));assert(natural.parse('반대로 보여줘',{...race,session:{...race.session,session_key:-1}},null,fplan).error)});
test('F1 contradictory sort and unsupported conditions are refused',()=>{assert(natural.parse('최고 속도 오름차순 내림차순',race,null).error);assert(natural.parse('최고 속도 비 오는 날만',race,null).error)});
async function main(){
 const {question,...parameters}=ascending;
 const mock=()=>({ok:true,status:200,json:async()=>({steps:[{type:'function_call',name:'analyze_records',arguments:{...parameters,last:0,order:'desc'}}]})});
 const server=createServer({key:'mock-only',fetchImpl:mock});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:ascending.question,defaults})});const result=await response.json();assert.equal(result.plan.order,'asc');assert.deepEqual(result.rows,rows);tests.push('Server enforces explicit order even if provider reverses it');console.log('PASS '+tests.at(-1));}finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
 fs.writeFileSync(path.join(__dirname,'check-result.json'),JSON.stringify({checks:tests.length,tests,failures:0,scope:'Real saved data, independent score/speed calculation; mocked planner safeguard'},null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1});
