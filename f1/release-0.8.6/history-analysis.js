/* Saved historical GP query adapter. No provider calls and no invented records. */
(function(g){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const year=r=>Number(r.session.year||String(r.session.date_start).slice(0,4));
const gp=r=>normalize(r.meeting?.meeting_name);
const key=r=>Number(r.session.session_key);
const venue=r=>r.venue?.circuit||r.meeting?.circuit_short_name||r.session.circuit_short_name;
const circuit=r=>Number(r.venue?.circuit_key??r.session.circuit_key);
const needs={best_lap:'laps',mean_lap:'laps',valid_laps:'laps',lap_std:'laps',sector_1:'laps',sector_2:'laps',sector_3:'laps',top_speed:'laps',laps:'laps',pit_entries:'pit',mean_pit_lane:'pit',mean_stop:'pit',stint_count:'stints',grid_position:'starting_grid',position_change:'starting_grid'};
function select(question,current,history){
 let text=question.toLowerCase().trim(),years=[];
 const explicit=[...text.matchAll(/\b(20\d{2})\s*년?/g)].map(m=>Number(m[1]));years.push(...explicit);text=text.replace(/\b20\d{2}\s*년?/g,' ');
 const ago=text.match(/(\d+)\s*년\s*전/);if(ago){years.push(year(current)-Number(ago[1]));text=text.replace(ago[0],' ');}
 if(/재작년|지지난\s*해|year before last/.test(text)){years.push(year(current)-2);text=text.replace(/재작년|지지난\s*해|year before last/g,' ');}
 if(/작년|지난\s*해|지난\s*시즌|last year|previous year|previous season/.test(text)){years.push(year(current)-1);text=text.replace(/작년|지난\s*해|지난\s*시즌|last year|previous year|previous season/g,' ');}
 if(!years.length)return null;
 if(/올해|이번\s*해|이번\s*시즌|this year|current year|current season/.test(text)){years.push(year(current));text=text.replace(/올해|이번\s*해|이번\s*시즌|this year|current year|current season/g,' ');}
 const comparing=/비교|compare|comparison|versus|\bvs\b/.test(text);if(comparing&&years.length===1)years.push(year(current));
 years=[...new Set(years)].sort((a,b)=>a-b);if(years.length>4)return {error:'history_scope'};
 const scope=/같은\s*(?:서킷|트랙)|same\s*(?:circuit|track)/.test(text)?'circuit':'gp';
 text=text.replace(/(?:해당|이|현재|선택한|같은)\s*(?:그랑프리|그랜드\s*프리|gp|경기|서킷|트랙)|(?:this|selected|same|current)\s*(?:grand prix|gp|race|circuit|track)|그랑프리|grand prix|서킷|circuit|기록(?:도)?|성적|records?|results?|까지/gi,' ');
 const catalogue=[...(history?.races||[]),current];
 const selected=[],missing=[];
 for(const y of years){
  const candidates=catalogue.filter(r=>year(r)===y&&r.session.session_name==='Race'&&r.state==='completed');
  let matches=scope==='circuit'?candidates.filter(r=>circuit(r)===circuit(current)):candidates.filter(r=>gp(r)&&gp(r)===gp(current));
  let basis=scope==='circuit'?'circuit_key':'meeting_name';
  // Explicit rename evidence: Barcelona GP and Spanish GP at Catalunya.
  // Never merge the new Spanish GP in Madrid, or other races in the same country.
  if(!matches.length&&scope==='gp'&&['barcelonagrandprix','spanishgrandprix'].includes(gp(current))&&circuit(current)===15){matches=candidates.filter(r=>['barcelonagrandprix','spanishgrandprix'].includes(gp(r))&&circuit(r)===15);basis='Barcelona / Spanish GP · Catalunya';}
  const unique=[...new Map(matches.map(r=>[key(r),r])).values()];
  if(unique.length===1)selected.push({race:unique[0],basis});else missing.push({year:y,reason:unique.length?'ambiguous':'not_collected'});
 }
 return {text,years,scope,selected,missing};
}
function onlyConnectors(s){return !s.replace(/보여\s*줘(?:요)?|보여\s*주세요|알려\s*줘(?:요)?|알려\s*주세요|비교(?:해\s*줘(?:요)?)?|해\s*줘(?:요)?|compare|comparison|show|please|with|and|versus|\bvs\b|the|me|of|[\s,?!·.&와과을를은는이가의인]+/gi,'');}
function parse(question,current,prediction,previous,history){
 if(typeof question!=='string'||!question.trim()||question.length>500)return {error:'question'};
 const core=g.MatchLabF1Natural;
 if(previous?.history&&/반대로|역순|reverse|opposite/i.test(question)){
  if(previous.current_key!==key(current)||previous.overview)return {error:'conditions'};
  const plans=previous.plans.map(item=>({key:item.key,plan:core.parse(question,lookup(item.key,current,history),null,item.plan)}));
  if(plans.some(x=>x.plan.error))return {error:'conditions'};
  return {...previous,plans,conditions:plans[0]?.plan.conditions||{}};
 }
 const scope=select(question,current,history);if(!scope)return core.parse(question,current,prediction,previous);
 if(scope.error)return scope;
 const overview=onlyConnectors(scope.text),plans=[];
 for(const {race} of scope.selected){
  const plan=core.parse(overview?'최종 순위':scope.text,race,key(race)===key(current)?prediction:null);
  if(plan.error)return plan;
  plans.push({key:key(race),plan});
 }
 if(!scope.selected.length&&!overview){
  const syntax=core.parse(scope.text,{...current,state:'completed'},prediction);
  if(syntax.error)return syntax;
 }
 return {history:true,current_key:key(current),scope:scope.scope,years:scope.years,missing:scope.missing,selected:scope.selected.map(x=>({key:key(x.race),basis:x.basis})),plans,overview,metric:plans[0]?.plan.metric||'final_position',conditions:plans[0]?.plan.conditions||{}};
}
function lookup(session,current,history){return key(current)===session?current:(history?.races||[]).find(r=>key(r)===session);}
function execute(plan,current,prediction,history){
 if(!plan.history)return g.MatchLabF1Natural.execute(plan,current,prediction);
 const results=plan.selected.map(item=>{
  const r=lookup(item.key,current,history),p=plan.plans.find(x=>x.key===item.key).plan;
  if(plan.overview){
   const roster=new Map((r.records.drivers||[]).map(d=>[d.driver_number,d]));
   return {year:year(r),name:r.meeting.meeting_name,date:r.session.date_start.slice(0,10),venue:venue(r),basis:item.basis,kind:'overview',rows:(r.records.session_result||[]).slice().sort((a,b)=>(a.position||999)-(b.position||999)).map(x=>({name:roster.get(x.driver_number)?.full_name||String(x.driver_number),team:roster.get(x.driver_number)?.team_name||'',position:x.position??null,points:x.points??null,laps:x.number_of_laps??null,status:x.dsq?'DSQ':x.dns?'DNS':x.dnf?'DNF':'FINISHED'}))};
  }
  const metrics=p.metrics||[p.metric],missing=metrics.filter(m=>(needs[m]&&!Object.hasOwn(r.records,needs[m]))||(g.MatchLabF1Metrics.registry[m]?.category==='prediction'&&key(r)!==key(current)));
  const supported=metrics.filter(m=>!missing.includes(m));
  return {year:year(r),name:r.meeting.meeting_name,date:r.session.date_start.slice(0,10),venue:venue(r),basis:item.basis,kind:'metrics',missing,result:supported.length?g.MatchLabF1Natural.execute({...p,metric:supported[0],metrics:supported},r,key(r)===key(current)?prediction:null):null};
 });
 return {kind:'history',scope:plan.scope,results,missing:plan.missing,years:plan.years};
}
function draw(result,en){
 if(result.kind!=='history')return g.MatchLabF1Natural.draw(result,en);
 const absent=result.missing.map(x=>`<p class="nl-history-missing">${x.year} · ${en?(x.reason==='ambiguous'?'Multiple matching races; specify a circuit.':'No collected completed race matches this scope.'):(x.reason==='ambiguous'?'일치하는 경기가 여러 개라 특정할 수 없습니다. 서킷 기준으로 요청해 주세요.':'이 범위에 해당하는 종료 경기 기록이 수집돼 있지 않습니다.')}</p>`).join('');
 return `<div class="nl-history"><p>${en?'Match by: ':'조회 기준: '}${result.scope==='circuit'?(en?'Same circuit':'같은 서킷'):(en?'Same Grand Prix':'같은 그랑프리')}</p>${absent}${result.results.map(r=>{
  const title=`<h4>${r.year} · ${esc(r.name)}</h4><p class="muted">${esc(r.date)} · ${esc(r.venue)}</p>`;
  if(r.kind==='overview')return `<section class="nl-history-season">${title}<div class="nl-history-table"><table><thead><tr>${(en?['Driver','Team','Position','Points','Laps','Status']:['드라이버','팀','순위','포인트','완료 랩','상태']).map(x=>'<th>'+x+'</th>').join('')}</tr></thead><tbody>${r.rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.team)}</td><td>${x.position??'—'}</td><td>${x.points??'—'}</td><td>${x.laps??'—'}</td><td>${en?x.status:({FINISHED:'완주',DNF:'리타이어',DNS:'미출발',DSQ:'실격'})[x.status]}</td></tr>`).join('')}</tbody></table></div></section>`;
  return `<section class="nl-history-season">${title}${r.missing.map(m=>`<p class="nl-history-missing">${esc(g.MatchLabF1Metrics.registry[m]?.[en?'en':'ko']||m)} · ${en?'Historical data for this metric was not collected.':'해당 연도의 이 지표는 수집되지 않았습니다.'}</p>`).join('')}${r.result?g.MatchLabF1Natural.draw(r.result,en):''}</section>`;
 }).join('')}</div>`;
}
g.MatchLabF1History={select,parse,execute,draw};
})(typeof window==='undefined'?globalThis:window);
