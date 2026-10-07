const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createServer}=require('../../server/gemini.cjs');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const evidence=[];
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const name of ['index.html','index.en.html']){
  await page.goto(base+'/'+name);await page.locator('#analystmode').selectOption('local');
  await page.locator('#analystquery').fill('프리미어리그 2025/26 경기당 실점이 적은 팀부터 순서대로 보여줘');await page.locator('#analystsubmit').click();
  const asc=await page.locator('#analystresult tbody tr').allTextContents();assert.equal(asc.length,20);assert(await page.locator('#analystresult').textContent().then(t=>/Lowest first|작은 값부터/.test(t)));
  await page.locator('#analystquery').fill('반대로 보여줘');await page.locator('#analystsubmit').click();const desc=await page.locator('#analystresult tbody tr').allTextContents();assert.notEqual(desc[0],asc[0]);
  evidence.push({page:name,mode:'local',ascending:asc[0],descending:desc[0]});console.log('PASS football browser ordering '+name);
 }
 await page.goto(base+'/f1/index.html#race=11234');await page.getByRole('button',{name:'자연어 분석',exact:true}).click();
 await page.locator('#f1-question').fill('최고 속도 낮은 순으로 보여줘');await page.locator('.nl-form button[type=submit]').click();
 assert((await page.locator('.nl-condition').textContent()).includes('오름차순'));const asc=await page.locator('.nl-bar-row').allTextContents();assert(asc.length>1);
 await page.locator('#f1-question').fill('반대로 보여줘');await page.locator('.nl-form button[type=submit]').click();assert((await page.locator('.nl-condition').textContent()).includes('내림차순'));const desc=await page.locator('.nl-bar-row').allTextContents();assert.notEqual(asc[0],desc[0]);evidence.push({page:'f1',ascending:asc[0],descending:desc[0]});
 for(const width of [390,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
 console.log('PASS F1 browser order, reversal and overflow');assert.deepEqual(errors,[]);
 // Actual provider requests use .env via Node, never copying a key into output.
 if(process.env.GEMINI_API_KEY){let previous;for(const question of ['프리미어리그 2025/26 경기당 실점이 적은 팀부터 순서대로 보여줘','반대로 보여줘']){
  await new Promise(r=>setTimeout(r,1050));const r=await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,defaults:{league:'EPL',season:'2025/26'},previous})});const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));assert.equal(result.status,'ok');assert.equal(result.plan.order,previous?'desc':'asc');assert.equal(result.plan.metric,'ga');assert.equal(result.plan.season,'2025/26');assert.equal(result.rows.length,20);assert(result.rows.every((x,i)=>!i||(previous?result.rows[i-1].value>=x.value:result.rows[i-1].value<=x.value)));evidence.push({question,method:'live Gemini',plan:result.plan,first:result.rows[0],last:result.rows.at(-1)});previous=result.plan;console.log('PASS live Gemini '+question);
 }}else evidence.push({live:'not run; key unavailable'});
 fs.writeFileSync(__dirname+'/browser-result.json',JSON.stringify({status:'PASS',evidence,errors},null,2)+'\n');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
