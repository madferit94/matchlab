/* 0.27.0 result refresh, JavaScript mirror of apply_refresh() in refresh.py (used by server/check.cjs).
   v50 data object + refresh.json -> refreshed data object. Pure; no file writes. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const REFRESH=path.join(__dirname,'0.27.0','refresh.json');
function loadRefresh(){return JSON.parse(fs.readFileSync(REFRESH,'utf8'))}
function applyRefresh(base,refresh){
 const data=structuredClone(base),byId=new Map(data.scheduled.map(m=>[m.id,m])),url=Object.fromEntries(refresh.files.map(f=>[f.league,f.url])),moved=new Set();
 for(const r of refresh.results){
  const m=byId.get(r.id);
  if(!m||m.league!==r.league||m.season!=='2026/27'||m.hg!==null)throw new Error('Refresh result is not a stored scheduled fixture: '+r.id);
  data.completed.push({id:m.id,league:m.league,season:m.season,date:r.date,home:m.home,away:m.away,hg:r.hg,ag:r.ag,hx:null,ax:null,source:url[m.league],provider:refresh.provider,hs:r.hs,as:r.as,hst:r.hst,ast:r.ast});
  moved.add(m.id);
 }
 data.scheduled=data.scheduled.filter(m=>!moved.has(m.id));
 data.last_date=refresh.as_of;
 data.refresh={version:refresh.version,provider:refresh.provider,terms_url:refresh.terms_url,previous_last_date:refresh.previous_last_date,as_of:refresh.as_of,results:refresh.results.length,fields:['hg','ag','hs','as','hst','ast'],source_urls:refresh.files.map(f=>f.url),fetched_at:refresh.files.map(f=>f.fetched_at).sort().at(-1)};
 return data;
}
module.exports={REFRESH,loadRefresh,applyRefresh};
