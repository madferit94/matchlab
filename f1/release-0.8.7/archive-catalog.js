/* Browsable saved GP seasons. Never rewrite the current dataset. */
(function(g){'use strict';
function create(current,history){
 const races=[...current.races.map(r=>({...r,is_archive:false})),...(history.races||[]).map(r=>({...r,is_archive:true}))];
 const unique=[...new Map(races.map(r=>[Number(r.session.session_key),r])).values()].sort((a,b)=>a.session.date_start.localeCompare(b.session.date_start));
 const seasons=[...new Set(unique.map(r=>Number(r.session.year)))].sort((a,b)=>b-a);
 return {races:unique,seasons,find(key){return unique.find(r=>Number(r.session.session_key)===Number(key))},list(year,status='all'){return unique.filter(r=>Number(r.session.year)===Number(year)&&(status==='all'||r.state===status))},tabs(race){return race.is_archive?['result','analysis','metrics']:race.state==='completed'?['map','analysis','metrics','comparison','result','laps','tyres','events']:race.state==='scheduled'?['prediction','analysis']:['result']}};
}
g.MatchLabF1Archive={create};
})(typeof window==='undefined'?globalThis:window);
