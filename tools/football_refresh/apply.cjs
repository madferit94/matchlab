/* 0.27.0 result refresh, JavaScript mirror of validate_refresh() and apply_refresh() in refresh.py
   (used by server/check.cjs). v50 data object + refresh.json -> refreshed data object. Pure; no file writes.
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
module.exports={REFRESH,loadRefresh,validateRefresh,applyRefresh,rowSha256};
