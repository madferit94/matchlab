'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {predict,probability}=require('./predict.cjs');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const model=read('stats_plus_odds-model.json'),rows=read('training-inputs.json');
const inputs=new Map(rows.map(r=>[r.match_key,r]));
const odds=new Map(read('matched-all.json').filter(r=>r.eligible).map(r=>[r.match_key,r.closing_odds]));
const expected=read('evaluation-predictions.json');let maximum=0;
for(const r of expected){
 const p=predict(model,inputs.get(r.match_key).features,odds.get(r.match_key));
 p.forEach((v,i)=>maximum=Math.max(maximum,Math.abs(v-r.stats_plus_odds[i])));
 assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-10);
}
assert.equal(expected.length,877);assert.ok(maximum<1e-10);
const sample=inputs.get(expected[0].match_key),price=odds.get(expected[0].match_key);
assert.throws(()=>predict(model,sample.features,undefined),/invalid_odds/);
assert.throws(()=>predict(model,sample.features,[0,3,4]),/invalid_odds/);
assert.throws(()=>predict(model,sample.features,[2,NaN,4]),/invalid_odds/);
assert.throws(()=>predict(model,Array(110).fill(0),price),/invalid_features/);
assert.throws(()=>predict(model,Array(111).fill('0'),price),/invalid_features/);
assert.throws(()=>predict(model,Array(111).fill(Infinity),price),/invalid_features/);
assert.ok(Math.abs(probability(price).reduce((a,b)=>a+b,0)-1)<1e-12);
const swapped=model.swap.slice(0,111).map(i=>sample.features[i]);
const a=predict(model,sample.features,price),b=predict(model,swapped,[price[2],price[1],price[0]]).reverse();
a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-12));
const display=read('display-data.json');assert.equal(display.records.length,877);
assert.ok(display.records.every(r=>r.date>display.parameter_training_last_date));
assert.equal(display.future_odds_available,false);
console.log(JSON.stringify({status:'PASS',evaluated:877,maxDifference:maximum,invalidInputChecks:6,swap:true,missingOddsRejected:true}));
