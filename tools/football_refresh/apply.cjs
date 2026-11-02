/* 0.27.0 result refresh, JavaScript mirror of validate_refresh() and apply_refresh() in refresh.py
   (used by server/check.cjs). v50 data object + refresh.json -> refreshed data object. Pure; no file writes.
   0.27.1 adds the archive xG mirror at the end of this file.
   Review R1: the content rules are checked here too, not only when refresh.json is built. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const REFRESH=path.join(__dirname,'0.27.0','refresh.json');
const ALIASES=path.join(__dirname,'..','..','modeling','odds-0.24.0','team-aliases.json');
const PROVIDER='football-data.co.uk',PREVIOUS_LAST_DATE='2026-09-20',SEASON='2026/27';
const FIELDS={hg:'FTHG',ag:'FTAG',hs:'HS',as:'AS',hst:'HST',ast:'AST'};
const ROW_COLUMNS=['Div','Date','Time','HomeTeam','AwayTeam','FTHG','FTAG','FTR','HS','AS','HST','AST'];
const DIVISION={EPL:'E0',La_liga:'SP1'};
function loadRefresh(){return JSON.parse(fs.readFileSync(REFRESH,'utf8'))}
// Same text as Python json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(',', ':')).
function canonicalRow(row){return '{'+Object.keys(row).sort().map(k=>JSON.stringify(k)+':'+JSON.stringify(row[k])).join(',')+'}'}
function rowSha256(row){return crypto.createHash('sha256').update(canonicalRow(row),'utf8').digest('hex')}
function iso(day){const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(day);if(!m)throw new Error('Bad provider date '+day);return m[3]+'-'+m[2]+'-'+m[1]}
function check(condition,message){if(!condition)throw new Error(message)}
function validateRefresh(data,refresh){
 const aliases=JSON.parse(fs.readFileSync(ALIASES,'utf8')),names=Object.fromEntries(Object.entries(data.teams).map(([k,v])=>[k,aliases[v.name]||v.name]));
 const byId=new Map(data.scheduled.map(m=>[m.id,m])),results=refresh.results;
 check(refresh.provider===PROVIDER&&refresh.previous_last_date===PREVIOUS_LAST_DATE&&data.last_date===PREVIOUS_LAST_DATE,'Refresh header differs');
 check(results.length&&new Set(results.map(r=>r.id)).size===results.length,'Empty or duplicate refresh results');
 check(results.every((r,i)=>!i||results[i-1].date<r.date||(results[i-1].date===r.date&&results[i-1].id<r.id)),'Refresh results not in date order');
 check(refresh.as_of===results.map(r=>r.date).sort().at(-1),'as_of is not the last result date');
 for(const r of results){
  const m=byId.get(r.id);
  check(m&&m.league===r.league&&m.season===SEASON&&m.hg===null,'Not a stored scheduled fixture: '+r.id);
  check(/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date>PREVIOUS_LAST_DATE&&r.date<=refresh.as_of,'Result date outside (previous cutoff, as_of]: '+r.id);
  for(const field of Object.keys(FIELDS))check(Number.isInteger(r[field])&&r[field]>=0,'Value is not a non-negative integer: '+r.id+' '+field);
  check(r.hst<=r.hs&&r.ast<=r.as,'Shots on target exceed shots: '+r.id);
  const row=r.provider_row;
  check(row&&JSON.stringify(Object.keys(row))===JSON.stringify(ROW_COLUMNS)&&Object.values(row).every(v=>typeof v==='string'),'Provider row columns differ: '+r.id);
  check(rowSha256(row)===r.row_sha256,'Provider row fingerprint differs: '+r.id);
  check(row.Div===DIVISION[r.league]&&row.Div===r.provider_file,'Provider division differs: '+r.id);
  check(iso(row.Date)===r.date,'Provider date differs: '+r.id);
  check(row.HomeTeam===names[m.home]&&row.AwayTeam===names[m.away],'Provider teams differ from the fixture: '+r.id);
  check(Object.entries(FIELDS).every(([field,column])=>row[column]===String(r[field])),'Provider values differ from the result: '+r.id);
  check(row.FTR===(r.hg>r.ag?'H':r.hg===r.ag?'D':'A'),'Result letter differs from score: '+r.id);
  check(/^[0-9a-f]{64}$/.test(r.line_sha256),'Raw line fingerprint missing: '+r.id);
 }
}
function applyRefresh(base,refresh){
 const data=structuredClone(base);validateRefresh(data,refresh);
 const byId=new Map(data.scheduled.map(m=>[m.id,m])),url=Object.fromEntries(refresh.files.map(f=>[f.league,f.url])),moved=new Set();
 for(const r of refresh.results){
  const m=byId.get(r.id);
  data.completed.push({id:m.id,league:m.league,season:m.season,date:r.date,home:m.home,away:m.away,hg:r.hg,ag:r.ag,hx:null,ax:null,source:url[m.league],provider:refresh.provider,hs:r.hs,as:r.as,hst:r.hst,ast:r.ast});
  moved.add(m.id);
 }
 data.scheduled=data.scheduled.filter(m=>!moved.has(m.id));
 data.last_date=refresh.as_of;
 data.refresh={version:refresh.version,provider:refresh.provider,terms_url:refresh.terms_url,previous_last_date:refresh.previous_last_date,as_of:refresh.as_of,results:refresh.results.length,fields:['hg','ag','hs','as','hst','ast'],source_urls:refresh.files.map(f=>f.url),fetched_at:refresh.files.map(f=>f.fetched_at).sort().at(-1)};
 return data;
}
// 0.27.1: xG for a few refreshed matches from Internet Archive copies of understat.com. Mirror of
// validate_archive_xg() and apply_archive_xg() in refresh.py; the evidence is 0.27.1/archive-xg.json.
const XG=path.join(__dirname,'0.27.1','archive-xg.json');
const XG_VERSION='0.27.1',XG_SOURCE='Internet Archive (web.archive.org) copies of understat.com';
const XG_METHODS={match_info:'https://understat.com/match/',shot_sum:'https://understat.com/getMatchData/'};
const XG_REQUIRED=['id','date','method','hx','ax','archive_url','original_url','archived_at','bytes','sha256','archive_match','shots'];
// 0.27.1 review R4: no keys beyond these (same lists in refresh.py).
const XG_TOP_KEYS=['version','source','reason','refresh','methods','sha256_of','matches'];
const XG_METHOD_KEYS={match_info:['h_xg','a_xg'],shot_sum:['shot_xg']};
const XG_MATCH_KEYS={match_info:['date','home','away','home_id','away_id','score'],shot_sum:['date','home','away','score']};
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sameKeys=(x,keys)=>isObject(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const DECIMAL=/^[0-9]+(?:\.[0-9]+)?$/;
function loadArchiveXg(){return JSON.parse(fs.readFileSync(XG,'utf8'))}
function originalUrl(id,method){return XG_METHODS[method]+id.slice(id.indexOf(':')+1)}
// Per-shot xG strings added left to right, rounded to 6 decimals. Same arithmetic as shot_sum() in refresh.py.
function shotSum(values){let total=0;for(const value of values)total+=Number(value);return Number(total.toFixed(6))}
function validateArchiveXg(data,refresh,xg){
 check(isObject(xg)&&Object.keys(xg).every(k=>XG_TOP_KEYS.includes(k)),'Archive xG file has unknown keys');
 check(xg.version===XG_VERSION&&xg.source===XG_SOURCE,'Archive xG header differs');
 const results=new Map(refresh.results.map(r=>[r.id,r])),matches=xg.matches,rows=new Map(data.completed.map(m=>[m.id,m]));
 check(Array.isArray(matches)&&matches.length&&new Set(matches.map(e=>e.id)).size===matches.length&&matches.length<=results.size,'Empty, duplicate or too many archive xG entries');
 for(const e of matches){
  const missing=XG_REQUIRED.filter(k=>!Object.hasOwn(e,k));
  check(!missing.length,'Archive xG entry is missing '+missing.join(', ')+': '+e.id);
  const r=results.get(e.id),m=rows.get(e.id);
  check(r&&m,'Archive xG match is not a refreshed result: '+e.id);
  check(m.provider===PROVIDER&&m.hx===null&&m.ax===null,'Archive xG target is not a refreshed match without xG: '+e.id);
  const method=e.method;
  check(Object.hasOwn(XG_METHODS,method)&&Object.keys(e).every(k=>XG_REQUIRED.includes(k)||XG_METHOD_KEYS[method].includes(k)),'Archive xG entry has unknown keys: '+e.id);
  check(sameKeys(e.archive_match,XG_MATCH_KEYS[method]),'Archive match keys differ: '+e.id);
  check(sameKeys(e.shots,['archive','football_data']),'Archive shots keys differ: '+e.id);
  check(e.original_url===originalUrl(e.id,method),'Archive xG method or original URL differs: '+e.id);
  check(typeof e.archived_at==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(e.archived_at),'Archive capture time malformed: '+e.id);
  check(e.archive_url==='https://web.archive.org/web/'+e.archived_at.replace(/\D/g,'')+'id_/'+e.original_url,'Archive URL differs: '+e.id);
  check(Number.isInteger(e.bytes)&&e.bytes>0&&typeof e.sha256==='string'&&/^[0-9a-f]{64}$/.test(e.sha256),'Archive fingerprint missing: '+e.id);
  const a=e.archive_match;
  check(e.date===a.date&&a.date===r.date,'Archive date differs from the result: '+e.id);
  check(Array.isArray(a.score)&&a.score.length===2&&a.score.every(Number.isInteger)&&a.score[0]===r.hg&&a.score[1]===r.ag,'Archive score differs from the result: '+e.id);
  check(a.home===data.teams[m.home].name&&a.away===data.teams[m.away].name,'Archive teams differ: '+e.id);
  if(method==='match_info')check(a.home_id===m.home&&a.away_id===m.away,'Archive team ids differ: '+e.id);
  const shots=e.shots;
  check(Array.isArray(shots.football_data)&&shots.football_data.length===2&&shots.football_data[0]===r.hs&&shots.football_data[1]===r.as,'Recorded football-data shots differ from refresh.json: '+e.id);
  check(Array.isArray(shots.archive)&&shots.archive.length===2&&shots.archive.every(v=>Number.isInteger(v)&&v>=0),'Archive shot counts malformed: '+e.id);
  for(const v of [e.hx,e.ax])check(typeof v==='number'&&Number.isFinite(v)&&v>=0,'xG is not a non-negative finite number: '+e.id);
  let expected;
  if(method==='match_info'){
   check(!Object.hasOwn(e,'shot_xg')&&['h_xg','a_xg'].every(k=>typeof e[k]==='string'&&DECIMAL.test(e[k])),'match_info xG strings malformed: '+e.id);
   expected=[Number(e.h_xg),Number(e.a_xg)];
  }else{
   const sx=e.shot_xg;
   check(!Object.hasOwn(e,'h_xg')&&!Object.hasOwn(e,'a_xg')&&sx&&JSON.stringify(Object.keys(sx))==='["h","a"]','shot_sum evidence malformed: '+e.id);
   check(['h','a'].every(side=>Array.isArray(sx[side])&&sx[side].every(v=>typeof v==='string'&&DECIMAL.test(v))),'Shot xG strings malformed: '+e.id);
   check(shots.archive[0]===sx.h.length&&shots.archive[1]===sx.a.length,'Archive shot count differs from the shot list: '+e.id);
   expected=[shotSum(sx.h),shotSum(sx.a)];
  }
  check(e.hx===expected[0]&&e.ax===expected[1],'Stored xG differs from the archived values: '+e.id);
 }
}
function applyArchiveXg(refreshed,refresh,xg){
 const data=structuredClone(refreshed);validateArchiveXg(data,refresh,xg);
 const rows=new Map(data.completed.map(m=>[m.id,m]));
 for(const e of xg.matches){const m=rows.get(e.id);m.hx=e.hx;m.ax=e.ax;m.xg_source=e.archive_url;m.xg_method=e.method;}
 return data;
}
// v50 data object -> the published data object (0.27.0 refresh, then 0.27.1 archive xG).
function applyRelease(base,refresh=loadRefresh(),xg=loadArchiveXg()){return applyArchiveXg(applyRefresh(base,refresh),refresh,xg)}
module.exports={REFRESH,XG,loadRefresh,loadArchiveXg,validateRefresh,applyRefresh,validateArchiveXg,applyArchiveXg,applyRelease,rowSha256,shotSum};
