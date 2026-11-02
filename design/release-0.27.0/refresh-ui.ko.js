(function(){
'use strict';
const text={source:'{date} 이후 경기 결과: football-data.co.uk (xG·상세 지표 없음)',reviewTitle:'끝난 경기 · 경기 전 예측과 실제',reviewNote:'예측은 {date} 자료로 만든 저장값이며 바꾸지 않았습니다. 가장 높은 확률의 결과가 실제 결과와 같으면 적중입니다.',summary:'적중 {hit} / {n}경기 ({rate})',empty:'이 리그에서 비교할 끝난 경기가 없습니다.',date:'날짜',match:'경기',actual:'실제',predicted:'예측 (홈·무·원정)',verdict:'판정',hit:'적중',miss:'빗나감',tie:'동률',home:'홈 승',draw:'무승부',away:'원정 승',more:'더 보기',open:'경기 보기 →',detailTitle:'경기 전 예측과 실제 결과',detailInput:'예측 입력 자료 기준 {date} · 저장된 예측(변경 없음)',pick:'예측 결과',outcome:'실제 결과',statsTitle:'경기 기록 · football-data.co.uk',shots:'슈팅',shotsOnTarget:'유효 슈팅',statsNote:'xG·PPDA·위험 지역 패스 등 상세 지표는 이 출처에 없어 표시하지 않습니다. 이전 경기(Understat)와 섞지 않습니다.',noResult:'결과 자료 없음 · 연기 여부 미확인',snapshot:'2026/27 상세 지표(StatMuse 시즌 누적)는 {date}까지의 값이며 갱신하지 않았습니다.'};
const store=window.MatchLabData||{},data=store.data,bundle=store.predictions;
if(!data||!data.refresh||!Array.isArray(data.completed))return;
const info=data.refresh,outcomes=['home','draw','away'],shown=new Map();
const predictions=new Map((bundle&&Array.isArray(bundle.predictions)?bundle.predictions:[]).map(p=>[p.match_key,p]));
const fill=(s,v)=>s.replace(/\{(\w+)\}/g,(m,k)=>v[k]);
const node=(tag,cls,content)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e;};
const teamName=id=>data.teams[id]?data.teams[id].name:id;
const pct=v=>(v*100).toFixed(1)+'%';
const inputDate=()=>{const p=bundle&&Array.isArray(bundle.predictions)?bundle.predictions[0]:null;return p&&p.training_last_date?p.training_last_date:info.previous_last_date;};
function review(m){
 const p=predictions.get(m.id);
 if(!p||p.home_team_key!==m.home||p.away_team_key!==m.away||!p.probabilities)return null;
 if(!outcomes.every(k=>typeof p.probabilities[k]==='number'&&Number.isFinite(p.probabilities[k])))return null;
 if(typeof m.hg!=='number'||typeof m.ag!=='number')return null;
 const actual=m.hg>m.ag?'home':m.hg===m.ag?'draw':'away',top=Math.max(...outcomes.map(k=>p.probabilities[k])),best=outcomes.filter(k=>p.probabilities[k]===top),pick=best.length===1?best[0]:null;
 return {p,actual,pick,hit:pick===actual};
}
const refreshed=()=>data.completed.filter(m=>m.provider===info.provider).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
function source(){
 const date=document.getElementById('lastdate');
 if(!date||document.getElementById('refresh-source-0270'))return;
 const span=node('span',null,' · '+fill(text.source,{date:info.previous_last_date}));span.id='refresh-source-0270';
 date.parentNode.appendChild(span);
}
function league(){const select=document.getElementById('league');return select?select.value:'EPL';}
function reviewPanel(){
 const matches=document.getElementById('matches'),anchor=document.getElementById('fixturepagination');
 let host=document.getElementById('prediction-review-0270');
 if(!matches||!anchor)return;
 if(!host){host=node('article','panel');host.id='prediction-review-0270';anchor.after(host);}
 const lg=league(),rows=refreshed().filter(m=>m.league===lg).map(m=>({m,r:review(m)})).filter(x=>x.r),limit=shown.get(lg)||5;
 host.replaceChildren();
 const head=node('div','toolbar'),title=node('h2',null,text.reviewTitle);title.style.margin='0';head.appendChild(title);
 const hits=rows.filter(x=>x.r.hit).length;
 if(rows.length)head.appendChild(node('span','status',fill(text.summary,{hit:hits,n:rows.length,rate:(hits/rows.length*100).toFixed(1)+'%'})));
 host.appendChild(head);
 host.appendChild(node('p','muted',fill(text.reviewNote,{date:inputDate()})));
 if(!rows.length){host.appendChild(node('p','muted',text.empty));return;}
 const wrap=node('div','tablewrap'),table=node('table'),thead=node('thead'),tr=node('tr');
 [text.match,text.actual,text.predicted,text.verdict].forEach(h=>tr.appendChild(node('th',null,h)));thead.appendChild(tr);table.appendChild(thead);
 const body=node('tbody');
 rows.slice(0,limit).forEach(({m,r})=>{
  const row=node('tr');row.dataset.review=m.id;
  const cell=node('td');cell.appendChild(node('span',null,teamName(m.home)+' vs '+teamName(m.away)));cell.appendChild(node('br'));cell.appendChild(node('small','muted',m.date));
  const link=node('a','match-link',text.open);link.href='#match='+encodeURIComponent(m.id);cell.appendChild(link);row.appendChild(cell);
  row.appendChild(node('td',null,m.hg+' : '+m.ag+' · '+text[r.actual]));
  row.appendChild(node('td',null,outcomes.map(k=>pct(r.p.probabilities[k])).join(' · ')));
  row.appendChild(node('td',null,r.pick===null?text.tie:r.hit?text.hit:text.miss));
  body.appendChild(row);
 });
 table.appendChild(body);wrap.appendChild(table);host.appendChild(wrap);
 if(rows.length>limit){const more=node('button','schedule-more',text.more+' ('+Math.min(limit,rows.length)+' / '+rows.length+')');more.type='button';more.onclick=()=>{shown.set(lg,limit+10);reviewPanel();};host.appendChild(more);}
}
function overdue(){
 document.querySelectorAll('#fixtures .fixture').forEach(card=>{
  const button=card.querySelector('[data-id]');if(!button||card.querySelector('.refresh-overdue-0270'))return;
  const m=data.scheduled.find(x=>x.id===button.dataset.id);
  if(m&&m.date<=info.as_of)card.appendChild(node('span','status refresh-overdue-0270',text.noResult));
 });
}
function detail(){
 const host=document.getElementById('matchdetail'),m=typeof completedSelection!=='undefined'?completedSelection:null;
 if(!host||!m||host.hidden)return;
 const first=host.querySelector('article.panel');if(!first)return;
 if(m.provider===info.provider&&!document.getElementById('refresh-stats-0270')){
  const panel=node('article','panel');panel.id='refresh-stats-0270';panel.appendChild(node('h2',null,text.statsTitle));
  [[text.shots,m.hs,m.as],[text.shotsOnTarget,m.hst,m.ast]].forEach(([label,h,a])=>{const s=node('div','stat');s.appendChild(node('strong',null,String(h)));const mid=node('div');mid.appendChild(node('label',null,label));s.appendChild(mid);s.appendChild(node('strong',null,String(a)));panel.appendChild(s);});
  panel.appendChild(node('p','note',text.statsNote));first.after(panel);
 }
 const r=review(m);
 if(r&&!document.getElementById('refresh-review-0270')){
  const panel=node('article','panel');panel.id='refresh-review-0270';
  const head=node('div','toolbar'),title=node('h2',null,text.detailTitle);title.style.margin='0';head.appendChild(title);head.appendChild(node('span','status',r.pick===null?text.tie:r.hit?text.hit:text.miss));panel.appendChild(head);
  outcomes.forEach(k=>{const s=node('div','stat');s.appendChild(node('strong',null,pct(r.p.probabilities[k])));const mid=node('div');mid.appendChild(node('label',null,text[k]+(k===r.actual?' · '+text.outcome:'')+(k===r.pick?' · '+text.pick:'')));s.appendChild(mid);s.appendChild(node('span'));panel.appendChild(s);});
  panel.appendChild(node('p','muted',fill(text.detailInput,{date:inputDate()})));
  first.after(panel);
 }
}
function snapshotNote(){
 const stats=document.getElementById('snapshotstats'),season=document.getElementById('season');
 if(!stats)return;
 let note=document.getElementById('refresh-snapshot-0270');
 if(!note){note=node('p','note',fill(text.snapshot,{date:info.previous_last_date}));note.id='refresh-snapshot-0270';stats.after(note);}
 note.hidden=!(season&&season.value==='2026/27');
}
function update(){source();if(typeof V!=='undefined'&&V==='matches'){reviewPanel();overdue();}detail();snapshotNote();}
const previousMatches=renderMatches;renderMatches=function(){previousMatches();update();};
const previousDetail=renderCompletedMatch;renderCompletedMatch=function(){previousDetail();update();};
const previousRender=render;render=function(){previousRender();update();};
document.addEventListener('change',event=>{if(event.target&&(event.target.id==='season'||event.target.id==='teamselect'))snapshotNote();});
update();
})();
