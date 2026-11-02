(function(){
'use strict';
const text={source:'{date} 이후 경기 결과: football-data.co.uk · xG는 {n}경기 중 {x}경기만 (Understat의 Internet Archive 사본)',reviewTitle:'끝난 경기 · 경기 전 예측과 실제',reviewNote:'예측은 {date} 자료로 만든 저장값이며 바꾸지 않았습니다. 가장 높은 확률의 결과가 실제 결과와 같으면 적중입니다.',summary:'적중 {hit} / {n}경기 ({rate})',empty:'이 리그에서 비교할 끝난 경기가 없습니다.',date:'날짜',match:'경기',actual:'실제',predicted:'예측 (홈·무·원정)',verdict:'판정',hit:'적중',miss:'빗나감',tie:'동률',home:'홈 승',draw:'무승부',away:'원정 승',more:'더 보기',open:'경기 보기 →',detailTitle:'경기 전 예측과 실제 결과',detailInput:'예측 입력 자료 기준 {date} · 저장된 예측(변경 없음)',pick:'예측 결과',outcome:'실제 결과',statsTitle:'경기 기록 · football-data.co.uk',shots:'슈팅',shotsOnTarget:'유효 슈팅',statsNote:'xG·PPDA·위험 지역 패스 등 상세 지표는 이 출처에 없어 표시하지 않습니다. 이전 경기(Understat)와 섞지 않습니다.',noResult:'결과 자료 없음 · 연기 여부 미확인',snapshot:'2026/27 상세 지표(StatMuse 시즌 누적)는 {date}까지의 값이며 갱신하지 않았습니다.',analysisNote:'{date} 이후 {n}경기 중 xG가 있는 경기는 {x}경기뿐입니다(Understat의 Internet Archive 사본). xG가 없는 경기가 들어간 합계·평균은 —로 표시합니다.',sourceNoXg:'{date} 이후 경기 결과: football-data.co.uk (xG·상세 지표 없음)',xg:'xG (홈 : 원정)',shotSum:'슈팅 합계',statsNoteXg:'위 xG는 Understat 자료의 Internet Archive 사본({at} 보관)에서 가져왔습니다 · {method}. PPDA·위험 지역 패스 등 다른 상세 지표는 없습니다.',methodMatchInfo:'경기 xG',methodShotSum:'슈팅 합계(슈팅별 xG를 더한 값이라 Understat 경기 xG와 조금 다를 수 있음)',archiveLink:'보관본 보기'};
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
// 0.27.1: a few refreshed matches have xG from Internet Archive copies of Understat (xg_source, xg_method).
const xgCount=()=>{const all=refreshed();return {date:info.previous_last_date,n:all.length,x:all.filter(hasXg).length};};
const xgCell=m=>hasXg(m)?xgText(m.hx)+' : '+xgText(m.ax)+(m.xg_method==='shot_sum'?' · '+text.shotSum:''):'—';
const archivedAt=m=>{const t=/^https:\/\/web\.archive\.org\/web\/(\d{4})(\d{2})(\d{2})\d{6}id_\//.exec(typeof m.xg_source==='string'?m.xg_source:'');return t?t[1]+'-'+t[2]+'-'+t[3]:'';};
// Review R3: below 650px each finished match becomes a stacked card (labels from the column headers), so the
// prediction and verdict are visible without sideways scrolling.
function style(){
 if(document.getElementById('refresh-ui-style-0270'))return;
 const css=node('style');css.id='refresh-ui-style-0270';
 css.textContent='@media (max-width:650px){#prediction-review-0270 .tablewrap{overflow:visible}#prediction-review-0270 table,#prediction-review-0270 tbody{display:block;width:100%}#prediction-review-0270 thead{display:none}#prediction-review-0270 tr{display:block;padding:10px 0;border-bottom:1px solid #e7ebf0}#prediction-review-0270 td{display:flex;justify-content:space-between;gap:12px;padding:4px 0;border:0;text-align:right;white-space:normal}#prediction-review-0270 td::before{content:attr(data-label);color:#536174;text-align:left;flex-shrink:0}#prediction-review-0270 td:first-child{display:block;text-align:left}#prediction-review-0270 td:first-child::before{content:none}}';
 document.head.appendChild(css);
}
// Review R2: an analysis of this season's xG gets one line explaining why values are "—".
const refreshedSeason=(refreshed()[0]||{}).season;
function analysisNote(){
 const out=document.getElementById('analystresult');if(!out)return;
 let plan=null;
 try{plan=(typeof footballWorkbench!=='undefined'&&footballWorkbench.previous)||(typeof analystPrevious!=='undefined'?analystPrevious:null);}catch(error){plan=null;}
 let note=document.getElementById('refresh-analysis-note-0270');
 const results=[...out.children].filter(e=>e!==note).length;
 const show=!!(plan&&results&&plan.season===refreshedSeason&&(plan.metric==='xg'||plan.metric==='xga'||plan.compareGoals));
 if(show&&!note){note=node('p','note',fill(text.analysisNote,xgCount()));note.id='refresh-analysis-note-0270';out.prepend(note);}
 else if(!show&&note)note.remove();
}
function source(){
 const date=document.getElementById('lastdate');
 if(!date||document.getElementById('refresh-source-0270'))return;
 const count=xgCount(),span=node('span',null,' · '+fill(count.x?text.source:text.sourceNoXg,count));span.id='refresh-source-0270';
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
 [text.match,text.actual,text.xg,text.predicted,text.verdict].forEach(h=>tr.appendChild(node('th',null,h)));thead.appendChild(tr);table.appendChild(thead);
 const body=node('tbody');
 rows.slice(0,limit).forEach(({m,r})=>{
  const row=node('tr');row.dataset.review=m.id;
  const cell=node('td');cell.dataset.label=text.match;cell.appendChild(node('span',null,teamName(m.home)+' vs '+teamName(m.away)));cell.appendChild(node('br'));cell.appendChild(node('small','muted',m.date));
  const link=node('a','match-link',text.open);link.href='#match='+encodeURIComponent(m.id);cell.appendChild(link);row.appendChild(cell);
  [[text.actual,m.hg+' : '+m.ag+' · '+text[r.actual]],[text.xg,xgCell(m)],[text.predicted,outcomes.map(k=>pct(r.p.probabilities[k])).join(' · ')],[text.verdict,r.pick===null?text.tie:r.hit?text.hit:text.miss]].forEach(([label,value])=>{const td=node('td',null,value);td.dataset.label=label;row.appendChild(td);});
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
  const note=node('p','note',hasXg(m)?fill(text.statsNoteXg,{at:archivedAt(m),method:m.xg_method==='shot_sum'?text.methodShotSum:text.methodMatchInfo}):text.statsNote);
  if(hasXg(m)&&archivedAt(m)){const link=node('a',null,text.archiveLink);link.href=m.xg_source;link.target='_blank';link.rel='noopener noreferrer';note.append(' ',link);}
  panel.appendChild(note);first.after(panel);
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
function update(){style();source();if(typeof V!=='undefined'&&V==='matches'){reviewPanel();overdue();}detail();snapshotNote();}
const previousMatches=renderMatches;renderMatches=function(){previousMatches();update();};
const previousDetail=renderCompletedMatch;renderCompletedMatch=function(){previousDetail();update();};
const previousRender=render;render=function(){previousRender();update();};
document.addEventListener('change',event=>{if(event.target&&(event.target.id==='season'||event.target.id==='teamselect'))snapshotNote();});
const analysisHost=document.getElementById('analystresult');
if(analysisHost&&typeof MutationObserver==='function')new MutationObserver(()=>setTimeout(analysisNote,0)).observe(analysisHost,{childList:true});
update();
})();
