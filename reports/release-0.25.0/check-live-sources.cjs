'use strict';
const fs=require('node:fs'),path=require('node:path');const {verifyNews}=require('./report.cjs');
(async()=>{
 const base=path.resolve(__dirname,'../../private/report-0.25.0'),input=path.join(base,'live-report.json');
 const r=JSON.parse(fs.readFileSync(input,'utf8'));const news=await verifyNews(r.news,fetch);
 const checked={...r,news};fs.writeFileSync(path.join(base,'live-report-verified.json'),JSON.stringify(checked,null,2));
 const summary={testedAt:new Date().toISOString(),method:'publisher metadata verification of previously retrieved live Gemini search response; no additional AI calls',status:news.status,items:news.items.map(i=>({date:i.reportedDate,status:i.dateStatus,sources:i.sources.map(s=>s.resolvedUrl)}))};
 fs.writeFileSync(path.join(__dirname,'live-sources-check.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
})().catch(e=>{console.error(e.name);process.exitCode=1;});
