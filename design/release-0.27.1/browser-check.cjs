// 0.27.1 browser check (ko/en x 390/1440). Usage: start PORT=8831 node server/gemini.cjs, then
// node design/release-0.27.1/browser-check.cjs <path to playwright-core 1.57.0> <screenshot folder outside the repository>
// Prints JSON; design/release-0.27.1/browser-result.json is the recorded summary of one run.
const {chromium}=require(process.argv[2]);
const BASE='http://127.0.0.1:8831';
const XG={'understat:31232':['1.38','1.68','shot_sum'],'understat:31233':['1.26','1.78','shot_sum'],'understat:31239':['1.66','2.22','shot_sum'],'understat:31249':['0.97','1.14','match_info'],'understat:31256':['0.84','2.56','match_info']};
(async()=>{
 const browser=await chromium.launch();const out=[];let failures=0;
 const fail=(c,msg)=>{c.failures.push(msg);failures++;};
 for(const [lang,path] of [['ko','/'],['en','/index.en.html']])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(String(e)));
  const c={lang,width,failures:[],views:{}};
  const state=async name=>{const s=await page.evaluate(()=>({text:document.body.innerText,overflow:document.documentElement.scrollWidth-window.innerWidth,hangul:/[가-힣]/.test(document.body.innerText.replace(/한국어/g,''))}));
   if(/NaN|undefined|Infinity/.test(s.text))fail(c,name+': NaN/undefined/Infinity text');
   if(s.overflow>0)fail(c,name+': horizontal overflow '+s.overflow);
   if(lang==='en'&&s.hangul)fail(c,name+': Korean text on English page');
   return s.text;};
  await page.goto(BASE+path+'#matches');await page.waitForTimeout(800);
  let text=await state('matches');
  const header=await page.evaluate(()=>{const e=document.getElementById('lastdate');return e?e.parentNode.innerText:''});c.views.header=header;
  if(!(lang==='ko'?header.includes('xG는 60경기 중 5경기만'):header.includes('xG for 5 of 60 matches only')))fail(c,'header count missing');
  // EPL review table, expand all rows
  for(let i=0;i<10;i++){const more=await page.$('#prediction-review-0270 button.schedule-more');if(!more)break;await more.click();await page.waitForTimeout(100);}
  const rows=await page.evaluate(()=>[...document.querySelectorAll('#prediction-review-0270 tr[data-review]')].map(r=>({id:r.dataset.review,cells:[...r.children].map(td=>td.innerText),label:r.children[2]&&r.children[2].dataset.label})));
  c.views.reviewRows=rows.length;c.views.xgRows=rows.filter(r=>r.cells[2]!=='—').map(r=>r.id+' '+r.cells[2]);
  for(const r of rows){const x=XG[r.id];if(x){if(!(r.cells[2].startsWith(x[0]+' : '+x[1])))fail(c,'review xG '+r.id+' '+r.cells[2]);const note=lang==='ko'?'슈팅 합계':'shot sum';if((x[2]==='shot_sum')!==r.cells[2].includes(note))fail(c,'shot sum label '+r.id);}else if(r.cells[2]!=='—')fail(c,'unexpected xG '+r.id);}
  if(rows.length!==30||c.views.xgRows.length!==5)fail(c,'review rows '+rows.length+' xg '+c.views.xgRows.length);
  await state('matches expanded');
  // match room for each xG match
  c.views.match={};
  for(const id of Object.keys(XG)){
   await page.goto(BASE+path+'#match='+encodeURIComponent(id));await page.waitForTimeout(500);await page.evaluate(()=>window.dispatchEvent(new HashChangeEvent('hashchange')));await page.waitForTimeout(300);
   text=await state('match '+id);
   const info=await page.evaluate(()=>{const host=document.getElementById('matchdetail');const stat=host&&host.querySelector('article.panel .stat');const markShown=!!(stat&&stat.querySelector('.xg-mark'));const note=document.querySelector('#refresh-stats-0270 .note');return {stat:stat?stat.innerText.replace(/\s+/g,' '):'',markShown,note:note?note.innerText:'',link:note&&note.querySelector('a')?note.querySelector('a').href:''}});
   c.views.match[id]=info;const x=XG[id];
   if(!(info.stat.startsWith(x[0])&&info.stat.endsWith(x[1])))fail(c,'match xG '+id+' '+info.stat);
   if(info.markShown!==(x[2]==='shot_sum'))fail(c,'match room shot-sum mark '+id);
   const method=x[2]==='shot_sum'?(lang==='ko'?'슈팅 합계':'shot sum'):(lang==='ko'?'경기 xG':'match xG');
   if(!info.note.includes(method)||!info.link.startsWith('https://web.archive.org/web/'))fail(c,'match note '+id);
  }
  // a refreshed match without xG keeps the old note and dashes
  await page.goto(BASE+path+'#match=understat:31230');await page.waitForTimeout(600);await state('match 31230');
  const plain=await page.evaluate(()=>{const host=document.getElementById('matchdetail');const stat=host&&host.querySelector('article.panel .stat');const note=document.querySelector('#refresh-stats-0270 .note');return {stat:stat?stat.innerText.replace(/\s+/g,' '):'',note:note?note.innerText:'',link:!!(note&&note.querySelector('a'))}});
  c.views.match['understat:31230']=plain;if(!plain.stat.startsWith('—')||plain.link)fail(c,'no-xG match shows xG or link');
  // team view Bournemouth (2 archive-xG matches + refreshed matches without xG)
  await page.goto(BASE+path+'#team=understat:73');await page.waitForTimeout(800);text=await state('team 73');
  const team=await page.evaluate(()=>({chart:document.getElementById('teamchart')?document.getElementById('teamchart').innerText.slice(0,400):'',svgNaN:[...document.querySelectorAll('svg')].some(s=>/NaN/.test(s.outerHTML)),recent:[...document.querySelectorAll('table')].map(t=>t.innerText).filter(t=>/2026-10-25/.test(t)).map(t=>t.slice(0,300))}));
  c.views.team={svgNaN:team.svgNaN,recentHas256:team.recent.some(t=>t.includes('2.56'))};if(team.svgNaN)fail(c,'NaN in SVG (team)');if(!c.views.team.recentHas256)fail(c,'team recent table lacks 2.56 for 10-25');
  // preview Bournemouth vs Leeds
  await page.goto(BASE+path+'#preview=understat:31264');await page.waitForTimeout(800);text=await state('preview 31264');
  const preview=await page.evaluate(()=>{const host=document.getElementById('trend');return {circles:host?host.querySelectorAll('circle').length:0,svgNaN:host?/NaN/.test(host.innerHTML):false,note:host?[...host.querySelectorAll('.muted')].map(e=>e.innerText).find(t=>/xG/.test(t)&&/2026-09-20/.test(t))||'':''}});
  c.views.preview=preview;if(preview.circles<2)fail(c,'preview xG points missing');if(preview.svgNaN)fail(c,'NaN in preview SVG');if(!preview.note)fail(c,'preview note missing');
  // analysis question
  await page.goto(BASE+path+'#matches');await page.waitForTimeout(500);
  const asked=await page.evaluate(async q=>{const input=document.getElementById('analystquery'),form=document.getElementById('analystform');if(!input||!form)return 'no form';input.value=q;form.requestSubmit();await new Promise(r=>setTimeout(r,800));const out=document.getElementById('analystresult');return out?out.innerText:'';},lang==='ko'?'맨유 최근 1경기 기대 득점':'Manchester United last 1 matches xG');
  c.views.analysis=asked.slice(0,400);if(!asked.includes('0.84'))fail(c,'analysis value 0.84 missing');
  const noteOk=lang==='ko'?asked.includes('60경기 중 xG가 있는 경기는 5경기뿐'):asked.includes('only 5 of 60 matches have xG');if(!noteOk)fail(c,'analysis note missing');
  await state('analysis');
  // review R2: Chelsea team page (10-10 shot sum) marks the recent table and the chart value table
  await page.goto(BASE+path+'#team=understat:80');await page.waitForTimeout(900);await state('team 80');
  const chelsea=await page.evaluate(()=>{const rows=[...document.querySelectorAll('tr')].filter(r=>r.textContent.includes('2026-10-10'));const marked=rows.filter(r=>r.querySelector('.xg-mark'));const chart=document.querySelector('#teamchart tbody');return {rows:rows.length,marked:marked.length,chartMarked:!!(chart&&chart.querySelector('.xg-mark')),unmarkedElsewhere:[...document.querySelectorAll('.xg-mark')].filter(e=>!e.closest('tr')||!e.closest('tr').textContent.includes('2026-10-10')).length}});
  c.views.chelsea=chelsea;if(!chelsea.marked||!chelsea.chartMarked||chelsea.unmarkedElsewhere)fail(c,'chelsea marks '+JSON.stringify(chelsea));
  // review R1 sequence and R2/R7 answers in the analysis box
  await page.goto(BASE+path+'#matches');await page.waitForTimeout(500);
  const ask=async q=>{await page.fill('#analystquery',q);await page.click('#analystsubmit');await page.waitForTimeout(500);return page.evaluate(()=>({out:document.getElementById('analystresult').innerText,status:document.getElementById('analyststatus').innerText}));};
  const seq=lang==='ko'?['토트넘 최근 5경기 기대 득점과 실제 득점 비교','맨유 최근 1경기 기대 실점','EPL 이번 시즌 기대 득점 순위','본머스 최근 3경기 기대 실점과 실제 실점 비교','바이에른 최근 5경기 득점']:['Tottenham last 5 matches compare goals and xG','Manchester United last 1 matches xGA','EPL this season xG ranking','Bournemouth last 3 matches compare goals conceded and xGA','Bayern last 5 matches goals'];
  const a=[];for(const q of seq){a.push(await ask(q));await state('analysis '+q);}
  c.views.sequence=a.map(x=>(x.out.split('\n')[0]||'')+' | '+x.status.slice(0,80));
  if(!a[1].out.includes('2.56')||a[1].out.includes('0.84'))fail(c,'R1 second answer');
  if(a[2].out.includes('Manchester United\n1\n')||!a[2].out.includes(lang==='ko'?'큰 값부터':'Highest first'))fail(c,'R1 ranking answer');
  if(!a[3].out.includes(lang==='ko'?'실제 실점':'Goals conceded')||!a[3].out.includes('1.38*')||!a[3].out.includes(lang==='ko'?'슈팅 합계':'Shot sum'))fail(c,'R1/R2 xGA trend answer');
  if(!(lang==='ko'?a[4].status.includes('팀을 찾지 못했어요'):a[4].status.includes('Team not found'))||a[4].out.includes('Arsenal'))fail(c,'R7 team not found');
  await page.screenshot({path:process.argv[3]+'/'+lang+'-'+width+'.png',fullPage:false});
  c.consoleErrors=errors;if(errors.length)fail(c,'console errors '+errors.join(' | ').slice(0,300));
  out.push(c);await page.close();
 }
 await browser.close();console.log(JSON.stringify({failures,cases:out},null,1));process.exitCode=failures?1:0;
})();
