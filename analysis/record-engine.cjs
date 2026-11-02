/* Browser-native recorded-data analysis. No model, SQL interpreter or Python runtime. */
(function(root){
 'use strict';
 const aliases={Arsenal:['아스널','아스날'],Barcelona:['바르셀로나','바르샤'],Liverpool:['리버풀'],'Manchester City':['맨체스터 시티','맨시티','man city'],'Manchester United':['맨체스터 유나이티드','맨유','man united','man utd'],'Real Madrid':['레알 마드리드','레알마드리드'],Chelsea:['첼시'],Tottenham:['토트넘','스퍼스','spurs'],'Atletico Madrid':['아틀레티코 마드리드','아틀레티코'],Valencia:['발렌시아'],Sevilla:['세비야'],Leeds:['리즈'],
  // 0.27.1 review R7: every Premier League and LaLiga club in the data has a Korean name (no silent default team).
  'Aston Villa':['애스턴 빌라','아스톤 빌라','애스턴빌라'],Bournemouth:['본머스'],Brentford:['브렌트퍼드','브렌트포드'],Brighton:['브라이턴','브라이튼'],Burnley:['번리'],Coventry:['코번트리','코벤트리'],'Crystal Palace':['크리스털 팰리스','크리스탈 팰리스','팰리스'],Everton:['에버턴','에버튼'],Fulham:['풀럼'],Hull:['헐 시티','헐시티','hull city'],Ipswich:['입스위치'],Leicester:['레스터'],Luton:['루턴','루톤'],'Newcastle United':['뉴캐슬','newcastle'],'Nottingham Forest':['노팅엄 포레스트','노팅엄','노팅햄','forest'],'Sheffield United':['셰필드 유나이티드','셰필드','sheffield utd'],Southampton:['사우샘프턴','사우스햄튼','사우스햄프턴'],Sunderland:['선덜랜드'],'West Ham':['웨스트햄'],'Wolverhampton Wanderers':['울버햄튼','울버햄프턴','울브스','wolves','wolverhampton'],
  Alaves:['알라베스','alavés'],Almeria:['알메리아','almería'],'Athletic Club':['아틀레틱 클루브','아틀레틱 빌바오','빌바오','athletic bilbao'],Cadiz:['카디스','cádiz'],'Celta Vigo':['셀타 비고','셀타','celta'],'Deportivo La Coruna':['데포르티보','라코루냐','라 코루냐','deportivo'],Elche:['엘체'],Espanyol:['에스파뇰'],Getafe:['헤타페'],Girona:['지로나'],Granada:['그라나다'],'Las Palmas':['라스팔마스','라스 팔마스'],Leganes:['레가네스','leganés'],Levante:['레반테'],Malaga:['말라가','málaga'],Mallorca:['마요르카'],Osasuna:['오사수나'],'Racing Santander':['라싱 산탄데르','라싱'],'Rayo Vallecano':['라요 바예카노','라요','rayo'],'Real Betis':['레알 베티스','베티스','betis'],'Real Oviedo':['레알 오비에도','오비에도','oviedo'],'Real Sociedad':['레알 소시에다드','소시에다드','sociedad'],'Real Valladolid':['레알 바야돌리드','바야돌리드','valladolid'],Villarreal:['비야레알','비야 레알']};
 // Clubs outside the two recorded leagues: answer "team not found" instead of falling back to the selected team.
 const otherClubs=/바이에른|뮌헨|도르트문트|레버쿠젠|라이프치히|유벤투스|인테르|인터 ?밀란|ac ?밀란|나폴리|파리 ?생제르맹|아약스|벤피카|포르투(?!갈)|셀틱|마르세유|아탈란타|라치오|bayern|munich|dortmund|leverkusen|leipzig|juventus|inter milan|internazionale|ac milan|napoli|\bpsg\b|paris saint|\bajax\b|benfica|\bporto\b|celtic|marseille|atalanta|\blazio\b/;
 const metrics={xg:{ko:'기대 득점',en:'Expected goals',keys:['기대 득점','기대득점','xg','expected goals']},xga:{ko:'기대 실점',en:'Expected goals against',keys:['기대 실점','기대실점','xga','expected goals against']},gf:{ko:'득점',en:'Goals scored',keys:['득점','goals scored','goals']},ga:{ko:'실점',en:'Goals conceded',keys:['실점','goals conceded']},p:{ko:'승점',en:'Points',keys:['승점','points']},w:{ko:'승률',en:'Win rate',keys:['승률','win rate']}};
 const normalize=s=>String(s).toLowerCase().replace(/\s+/g,' ').trim();
 function sortOrder(question,previous=null){
  const q=normalize(question);
  const asc=/오름차순|적은\s*(?:팀|선수|드라이버)?\s*(?:부터|순)|낮은\s*(?:팀|선수|드라이버)?\s*(?:부터|순)|작은\s*(?:값)?\s*(?:부터|순)|ascending|fewest|lowest|least|smallest|low(?:est)? to high(?:est)?/.test(q);
  const desc=/내림차순|많은\s*(?:팀|선수|드라이버)?\s*(?:부터|순)|높은\s*(?:팀|선수|드라이버)?\s*(?:부터|순)|큰\s*(?:값)?\s*(?:부터|순)|descending|most|highest|largest|high(?:est)? to low(?:est)?/.test(q);
  if(asc&&desc)return 'conflict';
  if(asc||desc)return asc?'asc':'desc';
  if(/반대로|역순|reverse|opposite/.test(q))return previous?(previous==='asc'?'desc':'asc'):'missing';
  return null;
 }
 function summary(id,ms){const s={n:ms.length,gf:0,ga:0,xg:0,xga:0,p:0,w:0,d:0,l:0};let nx=0;for(const m of ms){const h=m.home===id,f=h?m.hg:m.ag,a=h?m.ag:m.hg;s.gf+=f;s.ga+=a;if(Number.isFinite(m.hx)&&Number.isFinite(m.ax)){nx++;s.xg+=h?m.hx:m.ax;s.xga+=h?m.ax:m.hx}s.w+=f>a;s.d+=f===a;s.l+=f<a;s.p+=f>a?3:f===a?1:0}if(nx<s.n){s.xg=null;s.xga=null}return s}
 function create(data){
  const registry=new Map(),resolvers=[],teams=Object.entries(data.teams).map(([id,t])=>({...t,id}));
  function parse(question,defaults={},previous=null){
   const q=normalize(question);if(!q||q.length>500)return {error:'empty'};
   for(const resolver of resolvers){const args=resolver.match(question,defaults,previous);if(args)return {...args,question,tool:resolver.name}}
   if(/확률|예측|배당|probabilit|predict|odds/.test(q))return {tool:'prediction',question};
   const recognized=teams.filter(t=>[t.name,...(aliases[t.name]||[])].some(name=>q.includes(normalize(name))));
   if(/챔피언|champions|nfl|분데스|bundesliga|세리에|serie a|k리그|k-league/.test(q))return {error:'league'};
   if(otherClubs.test(q))return {error:'team_not_found'};
   const explicitLeague=/라리가|la\s?liga/.test(q)?'La_liga':/프리미어|\bpl\b|\bepl\b|premier/.test(q)?'EPL':null;
   if(explicitLeague&&recognized.some(t=>t.league!==explicitLeague))return {error:'league_mismatch'};
   const seasonMatch=q.match(/(20\d{2})\s*[/\-]\s*(\d{2}|20\d{2})/);
   const baseYear=Number((defaults.season||'2026/27').slice(0,4));
   const relativeSeason=/재작년|지지난\s?시즌|year before last/.test(q)?baseYear-2:/작년|지난\s?시즌|last season|previous season/.test(q)?baseYear-1:null;
   let season=seasonMatch?seasonMatch[1]+'/'+seasonMatch[2].slice(-2):/이번\s?시즌|this season|current season/.test(q)?'2026/27':null;
   if(relativeSeason!==null)season=relativeSeason+'/'+String(relativeSeason+1).slice(-2);
   if(season&&!['2023/24','2024/25','2025/26','2026/27'].includes(season))return {error:'season'};
   const rankingAsked=/순위|높은 팀|상위|많은 순|적은 순|부터 순|오름차순|내림차순|ranking|rank|top teams|highest|fewest|lowest/.test(q),metricNamed=Object.values(metrics).some(m=>m.keys.some(k=>q.includes(k)));
   const recent=q.match(/(?:최근|last|recent)\s*(\d+)\s*(?:경기|matches|games)?/),follow=/다시|이 결과|그 결과|이것|다른|대신|반대로|역순|reverse|opposite|그 비교|추가|바꿔|변경|제거|빼\s?줘|최근|작년|시즌|again|instead|same|those|only|add|change|remove|last season|recent/.test(q)&&previous;
   const plan=follow?{...previous}:{tool:'team',teams:[],league:explicitLeague||defaults.league||'EPL',season:defaults.season||'2026/27',last:null,venue:'all',metric:'xg',perMatch:false,order:'desc'};
   const order=sortOrder(q,follow?(previous.order||'desc'):null);if(['conflict','missing'].includes(order))return {error:'unsupported'};if(order)plan.order=order;
   if(recognized.length){const ids=recognized.map(t=>t.id);plan.teams=follow&&/추가|더해|\badd\b/.test(q)?[...new Set([...plan.teams,...ids])]:follow&&/제거|빼\s?줘|\bremove\b/.test(q)?plan.teams.filter(id=>!ids.includes(id)):ids;if(!explicitLeague)plan.league=recognized[0].league}
   if(explicitLeague)plan.league=explicitLeague;if(season)plan.season=season;
   if(!recognized.length){if(explicitLeague&&follow&&explicitLeague!==previous.league)plan.teams=[];else if(!follow&&defaults.team&&data.teams[defaults.team]?.league===plan.league)plan.teams=[defaults.team];}
   if(plan.teams.length>4)return {error:'too_many'};
   if(plan.teams.some(id=>data.teams[id]?.league!==plan.league))return {error:'league_mismatch'};
   if(recent){plan.last=Number(recent[1]);if(plan.last<1||plan.last>38)return {error:'range'}}
   else if(/시즌\s?전체|full season|all matches/.test(q))plan.last=null;
   if(/홈.*원정|원정.*홈|home.*away|away.*home/.test(q))plan.tool='venue';
   else if((order&&!follow)||rankingAsked)plan.tool='ranking';
   else if(plan.teams.length>1||/비교|compare|comparison/.test(q))plan.tool='comparison';
   else if(recognized.length||!follow)plan.tool='team';
   if(plan.tool!=='venue'){if(/원정|\baway\b/.test(q))plan.venue='away';else if(/홈|\bhome\b/.test(q))plan.venue='home';else if(/전체\s?장소|all venues/.test(q))plan.venue='all'}
   const matches=Object.entries(metrics).sort((a,b)=>Math.max(...b[1].keys.map(k=>k.length))-Math.max(...a[1].keys.map(k=>k.length))).filter(([,m])=>m.keys.some(k=>q.includes(k)));
   if(matches.length)plan.metric=matches[0][0];
   // 0.27.1 review R1 (recheck-2): a follow-up keeps every earlier condition it does not name. The goals-vs-xG mode
   // carries over unless the follow-up asks a ranking or names another metric; naming xG or xGA with a switch word
   // ("기대 실점으로 바꿔", "change to xGA") switches the compared metric. It compares xG with goals scored, or xGA
   // with goals conceded.
   const switchWord=/바꿔|변경|대신|change|instead|switch/.test(q);
   const carry=!!follow&&!!previous.compareGoals&&!rankingAsked&&(!metricNamed||(switchWord&&['xg','xga'].includes(plan.metric)));
   const asked=plan.metric==='xg'?/xg|기대\s?득점|expected goals/.test(q)&&/실제\s?득점|득점과|득점.*비교|actual goals|goals.*compar|compare.*goals.*xg|goals.*(?:and|vs).*xg|xg.*(?:and|vs).*goals/.test(q):plan.metric==='xga'&&/실제\s?실점|실점과|실점.*비교|goals conceded.*(?:and|vs|compar)|compar.*goals conceded|xga.*(?:and|vs).*(?:goals|conceded)/.test(q);
   plan.compareGoals=plan.teams.length===1&&!['venue','ranking'].includes(plan.tool)&&(carry||asked)&&['xg','xga'].includes(plan.metric);
   if(plan.compareGoals)plan.tool='trend';else if(plan.tool==='trend')plan.tool=plan.teams.length>1?'comparison':'team';
   plan.perMatch=/경기당|per match|per game|평균|average/.test(q)?true:/합계|total/.test(q)?false:plan.perMatch;
   if(/슈팅|점유|패스|선수|포메이션|부상|시장|날씨|shot|possession|pass|player|formation|injur|weather|npxg|페널티 제외|20\d{2}-\d{2}-\d{2}|승리한 경기|패배한 경기|무승부 경기|won matches|lost matches|drop table|delete from/.test(q))return {error:'metric'};
   if(!recognized.length&&!follow&&!/xg|기대|득점|실점|승점|승률|최근|시즌|홈|원정|리그|순위|goals|points|rate|matches|season|home|away|rank|league/.test(q))return {error:'unsupported'};
   if(!plan.teams.length&&explicitLeague)plan.tool='ranking';
   if(plan.tool==='ranking')plan.teams=[];
   if(plan.tool!=='ranking'&&!plan.teams.length)return {error:'team'};
   plan.question=question;return plan;
  }
  function records(id,plan,venue=plan.venue){let ms=data.completed.filter(m=>m.season===plan.season&&(m.home===id||m.away===id)&&(venue==='all'||(venue==='home'?m.home===id:m.away===id))).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));return plan.last?ms.slice(-plan.last):ms}
  function value(s,plan){return !s.n||s[plan.metric]===null?null:plan.metric==='w'?s.w/s.n*100:plan.perMatch?s[plan.metric]/s.n:s[plan.metric]}
  const base=(plan,rows)=>({status:rows.some(r=>r.n>0)?'ok':'empty',tool:plan.tool,plan,rows,engine:'JavaScript',datasetThrough:data.completed.map(m=>m.date).sort().at(-1),metric:plan.metric,perMatch:plan.perMatch,unit:plan.metric==='w'?'%':'',verification:{finite:rows.every(r=>r.value===null||Number.isFinite(r.value)),matches:rows.reduce((n,r)=>n+r.n,0)},formula:plan.metric==='w'?'wins / matches × 100':plan.perMatch?plan.metric+' / matches':'sum('+plan.metric+')'});
  // 0.27.1: shotSum marks an xG value that includes an archive shot-sum match (xg_method 'shot_sum').
  const shotSum=(ms,plan,v)=>['xg','xga'].includes(plan.metric)&&v!==null&&ms.some(m=>m.xg_method==='shot_sum');
  function clubRows(plan){return plan.teams.map(id=>{const ms=records(id,plan),s=summary(id,ms),v=value(s,plan);return {id,label:data.teams[id].name,...s,value:v,dates:ms.map(m=>m.date),shotSum:shotSum(ms,plan,v)}})}
  registry.set('team',plan=>base(plan,clubRows(plan)));
  registry.set('comparison',plan=>base(plan,clubRows(plan)));
  registry.set('ranking',plan=>{const ids=teams.filter(t=>t.league===plan.league).map(t=>t.id);const r=clubRows({...plan,teams:ids}).filter(r=>r.n);r.sort((a,b)=>a.value===null&&b.value===null?a.label.localeCompare(b.label):a.value===null?1:b.value===null?-1:(a.value-b.value)*(plan.order==='asc'?1:-1)||a.label.localeCompare(b.label));return base(plan,r)});
  registry.set('venue',plan=>{const id=plan.teams[0];return base(plan,['home','away'].map(venue=>{const ms=records(id,plan,venue),s=summary(id,ms);const v=value(s,plan);return {label:venue,...s,value:v,dates:ms.map(m=>m.date),shotSum:shotSum(ms,plan,v)}}))});
  // 0.27.1 review R1: the trend plots the asked metric: xG with goals scored, or xGA with goals conceded.
  registry.set('trend',plan=>{const id=plan.teams[0],against=plan.metric==='xga',ms=records(id,plan);return base(plan,ms.map(m=>{const h=m.home===id,x=against?(h?m.ax:m.hx):(h?m.hx:m.ax),v=Number.isFinite(x)?x:null;return {id:m.id,label:m.date,n:1,value:v,actual:against?(h?m.ag:m.hg):(h?m.hg:m.ag),opponent:data.teams[h?m.away:m.home].name,shotSum:v!==null&&m.xg_method==='shot_sum'}}))});
  function execute(plan){if(plan.error)return {status:'unsupported',reason:plan.error};const tool=registry.get(plan.tool);if(!tool)return {status:'unavailable',reason:plan.tool};return tool(plan)}
  return {parse,execute,records,register(name,handler,match){if(typeof handler!=='function')throw new TypeError('Handler required');if(match&&typeof match!=='function')throw new TypeError('Matcher must be a function');registry.set(name,handler);if(match)resolvers.push({name,match})},capabilities(){return [...registry.keys()]}};
 }
 const api={create,metrics,summary,sortOrder};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MatchDeskAnalysis=api;
})(globalThis);
