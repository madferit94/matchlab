'use strict';
/* 0.26.2 simulation comparison (copy of design/release-0.26.1/check-simulation.cjs).
   0.26.2 put a guard with `return` in front of the expansion statement, so the
   statement now runs inside a function (as it does in the page), with a match data
   object present. Added: the bundle expanded by the 0.26.2 statement must be
   identical (JSON text) to the bundle expanded by the 0.26.1 statement from OLD_REF
   (default main).
   Usage: node design/release-0.26.2/check-simulation.cjs   (no packages needed) */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
// Same module source that tools/check_release.py requires to be embedded byte-for-byte in both pages.
const simulationSource=read('simulation/pixel-v2-2026-10-06-v01/pixel-simulation.js');
for(const page of ['index.html','index.en.html'])assert(read(page).includes(simulationSource.trim()),'simulation module not embedded in '+page);
const sim=require(path.join(root,'simulation/pixel-v2-2026-10-06-v01/pixel-simulation.js'));
// Original bundle: the v50 archived block (byte-identical to data/football/predictions.js on main 0.26.0).
const archived=read('archive/visualizations/visualization-design-2026-10-08-v50/index.html').match(/<script id="prematch-predictions-v22" type="application\/json">([\s\S]*?)<\/script>/)[1];
const original=JSON.parse(archived);
// Compact bundle: run the committed predictions.js and the page's own expansion statement in a sandbox.
const reader='const bundle=window.MatchLabData.predictions;';
const expansions=['index.html','index.en.html'].map(page=>{const line=read(page).split('\n').find(l=>l.includes(reader));assert(line,'reader missing in '+page);return line.slice(line.indexOf(reader)+reader.length)});
assert.equal(expansions[0],expansions[1],'expansion code differs between languages');
assert(expansions[0].includes('scoreGrid'),'expansion code missing');
function expand(statement){
 const context={window:{}};vm.createContext(context);
 vm.runInContext(read('data/football/predictions.js'),context);
 context.window.MatchLabData.data={};// the page has its match data loaded before this point
 vm.runInContext('var bundle=window.MatchLabData.predictions;(function(){'+statement+'})();',context);
 return JSON.stringify(context.bundle);
}
const expandedText=expand(expansions[0]),expanded=JSON.parse(expandedText);
const oldRef=process.env.OLD_REF||'main',oldPage=execFileSync('git',['show',oldRef+':index.html'],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024});
const oldLine=oldPage.split('\n').find(l=>l.includes(reader)),oldStatement=oldLine.slice(oldLine.indexOf(reader)+reader.length);
assert(!oldStatement.includes('return'),'OLD_REF should be 0.26.1 (expansion without guard)');
const sameAsPrevious=expand(oldStatement)===expandedText;
assert(sameAsPrevious,'0.26.2 expansion differs from '+oldRef+' expansion on the committed predictions.js');
assert.equal(expanded.predictions.length,641);assert.equal(original.predictions.length,641);
// Deterministic PRNG (mulberry32) seeded per match and seed index.
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
// Prediction object exactly as the page passes it to MatchDeskSimulation.mount().
const toSim=p=>({model:p.model_id,status:p.status,home:p.home_team,away:p.away_team,probabilities:[p.probabilities.home,p.probabilities.draw,p.probabilities.away],scoreDistribution:p.scoreDistribution});
function compare(seeds){
 let runs=0,outcomeDiff=0,scoreDiff=0;const examples=[];
 original.predictions.forEach((o,i)=>{
  const c=expanded.predictions[i];assert.equal(c.match_key,o.match_key);
  const a=toSim(o),b=toSim(c);sim.validate(a);sim.validate(b);
  for(let s=0;s<seeds;s++){
   const seed=hash(o.match_key+'#'+s),ra=sim.sample(a,mulberry32(seed)),rb=sim.sample(b,mulberry32(seed));runs++;
   const od=ra.outcome!==rb.outcome,sd=ra.score.join(':')!==rb.score.join(':');
   if(od)outcomeDiff++;if(sd)scoreDiff++;
   if((od||sd)&&examples.length<20)examples.push({match_key:o.match_key,seed:s,original:{outcome:ra.outcome,score:ra.score},compact:{outcome:rb.outcome,score:rb.score}});
  }
 });
 return {seeds,runs,outcomeDifferences:outcomeDiff,scoreDifferences:scoreDiff,examples};
}
// Cell-level comparison of what the simulation receives.
let worstRel=0,worstAbs=0,worstMass=0,cells=0;
original.predictions.forEach((o,i)=>{
 const c=expanded.predictions[i];assert.equal(c.scoreDistribution.length,169);assert(!('scoreGrid' in c));
 const masses=[0,0,0];
 o.scoreDistribution.forEach((x,j)=>{const y=c.scoreDistribution[j];assert.equal(y.home,x.home);assert.equal(y.away,x.away);cells++;
  const d=Math.abs(y.probability-x.probability);worstAbs=Math.max(worstAbs,d);worstRel=Math.max(worstRel,d/x.probability);
  masses[y.home>y.away?0:y.home===y.away?1:2]+=y.probability});
 [o.probabilities.home,o.probabilities.draw,o.probabilities.away].forEach((v,k)=>{worstMass=Math.max(worstMass,Math.abs(masses[k]-v))});
});
const main20=compare(20),extra1000=compare(1000);
const result={
 release:'0.26.2',checked_at:new Date().toISOString().slice(0,10),expandedIdenticalToPrevious:{ref:oldRef,identical:sameAsPrevious},
 method:'node simulation/pixel-v2-2026-10-06-v01/pixel-simulation.js sample() on the v50 original scoreDistribution vs the compact predictions.js expanded by the page code; same mulberry32 stream per match and seed',
 matches:original.predictions.length,cellsCompared:cells,
 worstCellRelativeError:worstRel,worstCellAbsoluteError:worstAbs,worstOutcomeMassError:worstMass,validatePassed:true,
 primary:main20,supplementary:{...extra1000,examples:extra1000.examples},
 status:main20.outcomeDifferences===0&&main20.scoreDifferences===0?'NO_DIFFERENCE':'DIFFERENCES_FOUND'
};
fs.writeFileSync(path.join(__dirname,'simulation-result.json'),JSON.stringify(result,null,2)+'\n');
console.log(`matches ${result.matches}, cells ${cells}, worst cell rel ${worstRel.toExponential(2)}, worst outcome mass ${worstMass.toExponential(2)}`);
console.log(`20 seeds: ${main20.runs} runs, outcome differences ${main20.outcomeDifferences}, score differences ${main20.scoreDifferences}`);
console.log(`1000 seeds (supplementary): ${extra1000.runs} runs, outcome differences ${extra1000.outcomeDifferences}, score differences ${extra1000.scoreDifferences}`);
console.log(result.status);
