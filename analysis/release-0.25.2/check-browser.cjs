const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {createServer}=require('../../server/gemini.cjs');
(async()=>{let calls=0;const plan={tool:'team',teams:['understat:83'],league:'EPL',season:'2026/27',last:5,venue:'all',metric:'xg',perMatch:true,compareGoals:false,order:'desc'};
 const server=createServer({key:'test-fixture-only',fetchImpl:async(url,options)=>{if(JSON.parse(options.body).tools?.some(t=>t.name==='analyze_records'))calls++;return {ok:true,status:200,json:async()=>({steps:[{type:'function_call',name:'analyze_records',arguments:plan}]})};}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),checks=[];
 try{const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const noForm=async()=>{assert.equal(await p.locator('[data-plan-apply],[data-plan-field],.ml-plan-review').count(),0,'No mandatory conditions form');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);};
 for(const lang of ['ko','en'])for(const width of [390,1440]){
  await p.setViewportSize({width,height:1000});await p.goto(base+'/'+(lang==='ko'?'index.html':'index.en.html'));await p.locator('#analystmode').selectOption('local');
  const ask=async q=>{await p.locator('#analystquery').fill(q);await p.locator('#analystsubmit').click();};
  await ask(lang==='ko'?'첼시 최근 5경기 득점':'Chelsea last 5 matches goals');await p.locator('#analystresult .ml-analysis-context').waitFor();assert((await p.locator('#analystresult').innerText()).includes('Chelsea'));await noForm();
  await ask(lang==='ko'?'10경기로 바꿔줘':'Change to 10 matches');assert((await p.locator('.ml-analysis-context').innerText()).includes('10'));assert((await p.locator('.ml-analysis-context').innerText()).includes('Chelsea'));
  await ask(lang==='ko'?'라리가로 바꿔줘':'Change to LaLiga');assert((await p.locator('.ml-analysis-context').innerText()).includes('LaLiga'));assert(!(await p.locator('#analystresult').innerText()).includes('Chelsea'));
  await ask(lang==='ko'?'바르셀로나 최근 5경기 승점':'Barcelona last 5 matches points');assert((await p.locator('.ml-analysis-context').innerText()).includes('Barcelona'));
  await p.locator('[data-query-reset]').click();assert.equal(await p.locator('#analystquery').inputValue(),'');assert.equal((await p.locator('#analystresult').innerText()).trim(),'');
  await ask(lang==='ko'?'잘한 팀 보여줘':'Show good teams');assert.equal((await p.locator('#analystresult').innerText()).trim(),'');assert.equal(await p.locator('[data-clarify]').count(),3);await p.locator('[data-clarify]').first().click();await p.locator('#analystresult .ml-analysis-context').waitFor();assert((await p.locator('#analystresult').innerText()).length>100);await noForm();
  await ask(lang==='ko'?'첼시 최근 5경기 득점':'Chelsea last 5 matches goals');await p.locator('#analystresult').screenshot({path:__dirname+'/football-'+lang+'-'+width+'.png'});
  await ask(lang==='ko'?'첼시 최근 100경기 득점':'Chelsea last 100 matches goals');assert.equal((await p.locator('#analystresult').innerText()).trim(),'');assert((await p.locator('#analyststatus').innerText()).length>0);
  checks.push({sport:'football',lang,width,immediate:true,followup:true,leagueSwitch:true,clarificationOnlyWhenNeeded:true,reset:true,invalidClearsResult:true});
  await p.goto(base+'/f1/index.html?year=2026&lang='+lang+'#race=11234');await p.locator('[data-analysis-open]').click();
  const fask=async q=>{await p.locator('#f1-question').fill(q);await p.locator('.nl-form button[type=submit]').click();};
  await fask(lang==='ko'?'노리스 최근 5경기 포인트':'Norris last 5 races points');await p.locator('.nl-output .ml-analysis-context').waitFor();assert((await p.locator('.nl-output').innerText()).includes('1/5'));await noForm();
  await fask(lang==='ko'?'작년으로 바꿔줘':'Change to last year');assert((await p.locator('.nl-output').innerText()).includes('5/5'));
  await fask(lang==='ko'?'10경기로 바꿔줘':'Change to 10 races');assert((await p.locator('.nl-output').innerText()).includes('10/10'));assert((await p.locator('.ml-analysis-context').innerText()).includes('2025'));
  await fask(lang==='ko'?'피아스트리도 추가해줘':'Add Piastri');assert((await p.locator('.ml-analysis-context').innerText()).includes(lang==='ko'?'피아스트리':'PIASTRI'));await p.locator('.nl-output').screenshot({path:__dirname+'/f1-'+lang+'-'+width+'.png'});
  await p.locator('[data-query-reset]').click();await fask(lang==='ko'?'잘한 선수 보여줘':'Show good drivers');assert.equal(await p.locator('[data-clarify]').count(),3);await p.locator('[data-clarify]').first().click();await p.locator('.nl-output .ml-analysis-context').waitFor();await noForm();
  await fask(lang==='ko'?'2025년 노리스 평균 랩타임':'2025 Norris mean lap time');assert.equal((await p.locator('.nl-output').innerText()).trim(),'');assert((await p.locator('.nl-status').innerText()).includes(lang==='ko'?'미확보':'not recorded'));
  await fask(lang==='ko'?'2024년과 2025년 노리스 포인트 비교해줘':'Compare Norris points in 2024 and 2025');await p.locator('.nl-output .ml-analysis-context').waitFor();assert((await p.locator('.nl-output').innerText()).includes('2024'));await noForm();checks.push({sport:'F1',lang,width,immediate:true,followupYearAndCount:true,comparison:true,clarification:true,noData:true,history:true});
 }
 // AI returns only a validated plan; the page must immediately compute, without a second button/call.
 await p.goto(base+'/');await p.locator('#analystmode').selectOption('gemini');await p.locator('#analystquery').fill('아스널 최근 5경기 평균 기대 득점');await p.locator('#analystsubmit').click();await p.locator('#analystresult .ml-analysis-context').waitFor();assert.equal(calls,1);assert((await p.locator('#analystresult').innerText()).includes('Arsenal'));await noForm();checks.push({sport:'football',mode:'mocked Gemini',immediate:true,providerCalls:calls});
 assert.deepEqual(errors,[]);fs.writeFileSync(__dirname+'/browser-result.json',JSON.stringify({status:'PASS',checks,pageErrors:errors,provider:'mocked; no external AI calls'},null,2));console.log('PASS',checks.length,'direct-analysis browser groups');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
