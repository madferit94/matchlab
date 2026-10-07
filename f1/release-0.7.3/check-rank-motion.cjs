const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1100,height:850}});await page.setContent('<div id="host"></div>');
 const html=fs.readFileSync('f1/index.html','utf8'),scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 await page.addScriptTag({content:scripts.find(s=>s.includes('global.MatchLabF1Replay={'))});
 await page.addScriptTag({content:fs.readFileSync('f1/release-0.7.3/comparison.js','utf8')});
 await page.evaluate(()=>{
 const date=s=>new Date(Date.UTC(2026,0,1)+s*1000).toISOString();
 window.fixture={state:'completed',session:{date_start:date(0)},records:{drivers:[1,2,3].map(n=>({driver_number:n,name_acronym:'D'+n,full_name:'Driver '+n,team_colour:'235577'})),laps:[1,2,3].map(n=>({driver_number:n,date_start:date(0),lap_duration:60,lap_number:1})),position:[{driver_number:1,position:1,date:date(0)},{driver_number:2,position:2,date:date(0)},{driver_number:2,position:1,date:date(10)},{driver_number:1,position:2,date:date(10)}],session_result:[{driver_number:2,position:1,number_of_laps:1},{driver_number:1,position:2,number_of_laps:1},{driver_number:3,position:3,number_of_laps:1}]}};
 window.pred={drivers:[1,2,3].map((n,i)=>({driver_number:n,name:'Driver '+n,expected_rank:i+1,win_probability:.3}))};
 window.callbacks=[];window.requestAnimationFrame=fn=>{callbacks.push(fn);return callbacks.length};window.cancelAnimationFrame=()=>{};
 window.handle=MatchLabF1Comparison.mount(document.getElementById('host'),fixture,pred,{locale:'ko'});
 window.order=()=>[...document.querySelector('[data-recorded-lanes]').children].map(r=>Number(r.dataset.driver));
 });
 assert.deepEqual(await page.evaluate(()=>order()),[1,2,3]);
 await page.locator('[data-compare-play]').click();
 const motion=await page.evaluate(()=>{callbacks.shift()(1000);callbacks.shift()(12000);return {order:order(),animated:[...document.querySelector('[data-recorded-lanes]').children].filter(r=>r.getAnimations().length).length}});
 assert.deepEqual(motion.order,[2,1,3]);assert.equal(motion.animated,2);
 console.log('PASS recorded swap changes row order with two animated rows');
 await page.evaluate(()=>{const seek=document.querySelector('[data-compare-seek]');seek.value=.3;seek.dispatchEvent(new Event('input'))});
 assert.equal(await page.evaluate(()=>document.getAnimations().length),0);console.log('PASS seek cancels in-flight animation even when order unchanged');
 await page.locator('[data-compare-reset]').click();assert.deepEqual(await page.evaluate(()=>order()),[1,2,3]);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>{handle.destroy();callbacks=[];handle=MatchLabF1Comparison.mount(document.getElementById('host'),fixture,pred,{locale:'en'})});
 await page.locator('[data-compare-play]').click();
 const reduced=await page.evaluate(()=>{callbacks.shift()(1000);callbacks.shift()(12000);return {order:order(),animations:document.getAnimations().length}});
 assert.deepEqual(reduced.order,[2,1,3]);assert.equal(reduced.animations,0);console.log('PASS reset and English reduced-motion playback');
 const special=await page.evaluate(()=>{const pane=document.querySelector('[data-recorded-lanes]'),lanes=new Map([...pane.children].map(row=>[Number(row.dataset.driver),{row}]));MatchLabF1Comparison.arrangeRecordedLanes([{driver:{driver_number:1},rank:null},{driver:{driver_number:2},rank:1},{driver:{driver_number:3},rank:1}],lanes,pane,false);return order()});assert.deepEqual(special,[2,3,1]);console.log('PASS missing rank last and stable tie order');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
