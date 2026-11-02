(function(){
'use strict';
const text={source:'results after {date}: football-data.co.uk (no xG or detailed stats)',reviewTitle:'Finished matches · pre-match prediction vs result',reviewNote:'Predictions are the stored values made from records through {date}; they were not changed. A prediction counts as a hit when its most likely outcome is the actual outcome.',summary:'Hits {hit} / {n} matches ({rate})',empty:'No finished matches to compare in this league.',date:'Date',match:'Match',actual:'Result',predicted:'Prediction (home · draw · away)',verdict:'Verdict',hit:'Hit',miss:'Miss',tie:'Tie',home:'Home win',draw:'Draw',away:'Away win',more:'Show more',open:'View match →',detailTitle:'Pre-match prediction vs result',detailInput:'Prediction input records through {date} · stored prediction (unchanged)',pick:'predicted',outcome:'actual',statsTitle:'Match record · football-data.co.uk',shots:'Shots',shotsOnTarget:'Shots on target',statsNote:'xG, PPDA, deep completions and other detailed metrics are not in this source and are not shown. They are not mixed with earlier (Understat) matches.',noResult:'No result in the data · postponement not confirmed',snapshot:'2026/27 detailed metrics (StatMuse season totals) are values through {date} and were not refreshed.'};
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
