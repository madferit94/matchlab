const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createServer}=require('../../server/gemini.cjs');
(async()=>{const server=createServer({key:''});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const evidence=[];
try{const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
async function open(session,en=false){await p.goto(base+'/f1/index.html'+(en?'?lang=en':'')+'#race='+session);await p.locator('[data-tab="analysis"]').click();await p.locator('#f1-question').waitFor()}
async function ask(question){await p.locator('#f1-question').fill(question);await p.locator('.nl-form button[type=submit]').click();const text=await p.locator('.nl-output').textContent();evidence.push({question,text:text.slice(0,1800)});return text}
await open(11234);
let text=await ask('해당 그랑프리 작년 기록도 보여줘');assert(text.includes('2025'));assert.equal(await p.locator('.nl-history-table tbody tr').count(),20);assert((await p.locator('.nl-history-table tbody tr').first().textContent()).includes('Lando NORRIS'));
text=await ask('작년과 올해 노리스 포인트 비교해줘');assert.equal(await p.locator('.nl-history-season').count(),2);assert(text.includes('2025'));assert(text.includes('2026'));assert(!text.includes('Max VERSTAPPEN'));assert(text.includes('25'));
text=await ask('작년 노리스 평균 랩타임 보여줘');assert(text.includes('수집되지 않았습니다'));assert.equal(await p.locator('.nl-big').count(),0);
text=await ask('재작년 기록 보여줘');assert(text.includes('2024'));assert(text.includes('수집돼 있지 않습니다'));
await open(11731);text=await ask('작년 기록 보여줘');assert(text.includes('Sakhir'));text=await ask('같은 서킷 작년 기록 보여줘');assert(text.includes('수집돼 있지 않습니다'));
await open(11307);text=await ask('작년 기록 보여줘');assert(text.includes('Spanish Grand Prix'));assert(text.includes('Catalunya'));
await open(11234,true);text=await ask('Show this Grand Prix last year records');assert(text.includes('2025'));assert(text.includes('Driver'));text=await ask('Compare Norris points last year and this year');assert.equal(await p.locator('.nl-history-season').count(),2);
await ask('Last year points highest first');await ask('Reverse order');assert((await p.locator('.nl-condition').textContent()).includes('Ascending'));
for(const width of [390,768,1440]){await p.setViewportSize({width,height:900});await ask('Show this Grand Prix last year records');const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow){console.log('Overflow',width,await p.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(x=>x.getBoundingClientRect().right>innerWidth+1).slice(0,16).map(x=>({tag:x.tagName,id:x.id,cls:x.className,width:x.getBoundingClientRect().width,right:x.getBoundingClientRect().right,display:getComputedStyle(x).display,minWidth:getComputedStyle(x).minWidth}))));}assert.equal(overflow,false);evidence.push({width,overflow:false})}
await p.screenshot({path:__dirname+'/history-query-desktop.png',fullPage:true});assert.deepEqual(errors,[]);
fs.writeFileSync(__dirname+'/browser-result.json',JSON.stringify({status:'PASS',evidence,pageErrors:errors,apiCalls:0},null,2)+'\n');console.log('PASS historical KO/EN input, result/metric comparison, missing data, moved GP, rename, reversal and 3 widths');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
