const fs=require('node:fs'),assert=require('node:assert/strict');
require('../release-0.7.1/replay/metrics.js');require('./driver-names.js');require('./natural-analysis.js');
const names=globalThis.MatchLabF1Names,engine=globalThis.MatchLabF1Natural;
const drivers=names.entries.map((e,i)=>({full_name:e.en,driver_number:i+100}));
const race={state:'completed',session:{session_key:1},records:{drivers}};let checks=[];
for(const [i,e] of names.entries.entries())for(const alias of e.aliases){const plan=engine.parse(alias+' 포인트 보여줘',race,null);assert(!plan.error,JSON.stringify({alias,plan}));assert.deepEqual(plan.drivers,[i+100],alias);checks.push(alias);}
for(const e of names.entries){assert.equal(names.display(e.en.toUpperCase(),false),e.ko);assert.equal(names.display(e.en,true),e.en);const html=engine.draw({kind:'bar',metric:'points',unit:'',rows:[{name:e.en,value:10}]},false);assert(html.includes(e.ko));assert(!html.includes('페르스타펜'));}
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),old=fs.readFileSync(__dirname+'/index-before.html','utf8');let payloads=0;
for(const m of old.matchAll(/<script[^>]*type="application\/json"[^>]*>[\s\S]*?<\/script>/g)){assert(html.includes(m[0]),'recorded JSON changed');payloads++;}
fs.writeFileSync(__dirname+'/name-test-result.json',JSON.stringify({status:'PASS',drivers:28,aliasQueries:checks.length,unchangedPayloads:payloads,queries:checks},null,2));console.log('PASS: 28 drivers, '+checks.length+' full/surname/legacy aliases; Korean display, English preserved, JSON unchanged');
