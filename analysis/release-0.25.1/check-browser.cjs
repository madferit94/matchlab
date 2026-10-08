const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const {createServer}=require('../../server/gemini.cjs');
const data=JSON.parse(fs.readFileSync(__dirname+'/../../index.html','utf8').match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const checks=[];
(async()=>{
 const server=createServer({key:''});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const selected=key=>page.locator('input[data-plan-field="'+key+'"]:checked').evaluateAll(es=>es.map(e=>e.value));
 const options=key=>page.locator('input[data-plan-field="'+key+'"]').evaluateAll(es=>es.map(e=>e.value));
 for(const lang of ['ko','en'])for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/'+(lang==='ko'?'index.html':'index.en.html'));
  await page.locator('#analystmode').selectOption('local');
  const ask=async q=>{await page.locator('#analystquery').fill(q);await page.locator('#analystsubmit').click();await page.locator('[data-plan-apply]').waitFor();};
  await ask(lang==='ko'?'첼시 최근 5경기 득점':'Chelsea last 5 matches goals');
  const chelsea=Object.keys(data.teams).find(id=>data.teams[id].name==='Chelsea');
  assert.deepEqual(await selected('teams'),[chelsea],'Explicit question overrides dashboard team');
  await page.locator('[data-plan-apply]').click();assert((await page.locator('#analystresult').innerText()).includes('Chelsea'));
  await page.locator('[data-plan-field=league]').selectOption('La_liga');assert.equal((await page.locator('#analystresult').innerText()).trim(),'','Changed filters invalidate old result');
  assert.deepEqual(await selected('teams'),[]);let ids=await options('teams');assert.equal(ids.length,20);assert(ids.every(id=>data.teams[id].league==='La_liga'));
  const barca=Object.keys(data.teams).find(id=>data.teams[id].name==='Barcelona');
  await page.locator('[data-plan-search=teams]').fill('Barcelona');assert.equal(await page.locator('[data-plan-control=teams] .ml-option:visible').count(),1);
  await page.locator('input[data-plan-field=teams][value="'+barca+'"]').check();await page.locator('[data-plan-apply]').click();assert((await page.locator('#analystresult').innerText()).includes('Barcelona'));
  await page.locator('[data-plan-field=season]').selectOption('2023/24');await page.locator('[data-plan-apply]').click();
  assert((await page.locator('#analystresult').innerText()).includes('2023/24'));
  await page.locator('[data-plan-field=league]').selectOption('EPL');await page.locator('[data-plan-field=season]').selectOption('2024/25');ids=await options('teams');
  const burnley=Object.keys(data.teams).find(id=>data.teams[id].name==='Burnley');assert(!ids.includes(burnley),'Season roster excludes relegated club');
  await page.locator('[data-plan-apply]').click();assert((await page.locator('#analystresult').innerText()).length>100,'Empty team selection produces league ranking');
  await ask(lang==='ko'?'바르셀로나 최근 5경기 득점':'Barcelona last 5 matches goals');assert.deepEqual(await selected('teams'),[barca]);await page.locator('[data-plan-apply]').click();assert((await page.locator('#analystresult').innerText()).includes('Barcelona'));
  await ask(lang==='ko'?'첼시 최근 5경기 득점':'Chelsea last 5 matches goals');await page.locator('[data-plan-apply]').click();await ask(lang==='ko'?'라리가로 바꿔줘':'Change to LaLiga');assert.deepEqual(await selected('teams'),[]);await page.locator('[data-plan-apply]').click();assert((await page.locator('#analystresult').innerText()).includes('LaLiga'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.ml-plan-review').screenshot({path:__dirname+'/football-'+lang+'-'+width+'.png'});checks.push({sport:'football',lang,width,explicitTeam:true,leagueAndSeasonRoster:true,search:true,ranking:true,followup:true});
  await page.goto(base+'/f1/index.html?year=2026&lang='+lang+'#race=11234');await page.locator('[data-analysis-open]').click();
  const fask=async q=>{await page.locator('#f1-question').fill(q);await page.locator('.nl-form button[type=submit]').click();await page.locator('[data-plan-apply]').waitFor();};
  await fask(lang==='ko'?'노리스 최근 5경기 포인트 보여줘':'Norris last 5 races points');await page.locator('[data-plan-apply]').click();assert((await page.locator('.nl-output').innerText()).includes('1/5'));
  await page.locator('[data-plan-field=year]').selectOption('2025');assert.equal((await page.locator('.nl-output').innerText()).trim(),'');await page.locator('[data-plan-apply]').click();assert((await page.locator('.nl-output').innerText()).includes('5/5'));
  assert(!(await options('metrics')).includes('mean_lap'),'Uncollected archived laps are not offered');
  await page.locator('[data-plan-field=period]').selectOption('gp');assert.equal(await page.locator('[data-plan-field=count]').isDisabled(),true);assert.equal(await page.locator('[data-plan-field=race]').isDisabled(),false);
  const raceOptions=await page.locator('[data-plan-field=race] option').evaluateAll(es=>es.map(e=>e.value).filter(x=>x!=='0'));
  assert(raceOptions.length>1);await page.locator('[data-plan-field=race]').selectOption(raceOptions[0]);await page.locator('[data-plan-apply]').click();assert((await page.locator('.nl-output').innerText()).toLowerCase().includes(lang==='ko'?'포인트':'points'),await page.locator('.nl-status').innerText());
  await page.locator('[data-plan-field=year]').selectOption('2024');const names24=await options('drivers');assert(!names24.some(n=>/BORTOLETO|HADJAR|ANTONELLI/i.test(n)),'Historical roster excludes later rookies');
  await page.locator('[data-plan-field=year]').selectOption('2026');await page.locator('[data-plan-field=race]').selectOption('11234');
  // Previous numeric/lap restrictions must not invalidate a manually changed metric.
  await fask(lang==='ko'?'노리스 1~20랩 평균 랩타임':'Norris mean lap time laps 1-20');await page.locator('input[data-plan-field=metrics][value=mean_lap]').uncheck();await page.locator('input[data-plan-field=metrics][value=points]').check();await page.locator('[data-plan-apply]').click();assert((await page.locator('.nl-output').innerText()).toLowerCase().includes(lang==='ko'?'포인트':'points'));
  await fask(lang==='ko'?'노리스 최근 5경기 평균 랩타임':'Norris last 5 races mean lap time');await page.locator('[data-plan-field=year]').selectOption('2025');await page.locator('[data-plan-apply]').click();assert.equal((await page.locator('.nl-output').innerText()).trim(),'');assert((await page.locator('.nl-status').innerText()).includes(lang==='ko'?'미확보':'not recorded'));
  await page.locator('input[data-plan-field=metrics][value=mean_lap]').uncheck();await page.locator('input[data-plan-field=metrics][value=points]').check();await page.locator('[data-plan-apply]').click();assert((await page.locator('.nl-output').innerText()).includes('5/5'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('.ml-plan-review').screenshot({path:__dirname+'/f1-'+lang+'-'+width+'.png'});
  checks.push({sport:'F1',lang,width,periodRoster:true,metricCoverage:true,gpSelection:true,staleConditionsCleared:true,missingDataExplained:true});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(__dirname+'/browser-result.json',JSON.stringify({status:'PASS',checks,pageErrors:errors},null,2));console.log('PASS',checks.length,'football/F1 KO/EN desktop/mobile groups');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
