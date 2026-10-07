const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs');
const {createHandler}=require('./gemini.cjs');
function request(server,route,headers={},body){return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port:server.address().port,path:route,method:body?'POST':'GET',headers},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,text}))});req.on('error',reject);req.end(body)})}
async function main(){
 const h=createHandler({key:'',publicOrigins:['https://matchlab.example']});const server=http.createServer(h);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {
  assert.equal((await request(server,'/api/health',{host:'matchlab.example',origin:'https://matchlab.example'})).status,200);
  assert.equal((await request(server,'/api/health',{host:'matchlab.example',origin:'https://evil.example'})).status,403);
  assert.equal((await request(server,'/api/health',{host:'evil.example'})).status,403);
  console.log('PASS configured HTTPS domain, foreign origin and unknown host');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
 process.env.VERCEL_URL='matchlab.example';process.env.GEMINI_API_KEY='';
 const adapter=require('../api/handler.js');const s=http.createServer((req,res)=>{req.query={action:'health'};adapter(req,res)});await new Promise(r=>s.listen(0,'127.0.0.1',r));
 try{const r=await request(s,'/api/handler?action=health',{host:'matchlab.example'});assert.equal(r.status,200);assert.equal(JSON.parse(r.text).configured,false);console.log('PASS Vercel health rewrite')}finally{s.closeAllConnections();await new Promise(r=>s.close(r))}
 assert.deepEqual(fs.readdirSync('dist').sort(),['f1','index.en.html','index.html']);assert.deepEqual(fs.readdirSync('dist/f1'),['index.html']);console.log('PASS public output allowlist');
 const data=require('./gemini.cjs').loadData();const plan={tool:'team',teams:['understat:83'],league:'EPL',season:'2023/24',last:5,venue:'all',metric:'xg',perMatch:true,compareGoals:false};
 const parsed=createHandler({key:'fixture',data,publicOrigins:['https://matchlab.example'],fetchImpl:async()=>({ok:true,status:200,json:async()=>({steps:[{type:'function_call',name:'analyze_records',arguments:plan}]})})});
 const t=http.createServer((req,res)=>{req.body={question:'Arsenal xG',defaults:{}};parsed(req,res)});await new Promise(r=>t.listen(0,'127.0.0.1',r));
 try{const r=await request(t,'/api/analyze',{host:'matchlab.example','content-type':'application/json'},'{}');assert.equal(r.status,200);assert.equal(JSON.parse(r.text).rows[0].n,5);console.log('PASS Vercel pre-parsed JSON with mocked provider')}finally{t.closeAllConnections();await new Promise(r=>t.close(r))}
}
main().catch(e=>{console.error(e);process.exitCode=1});
