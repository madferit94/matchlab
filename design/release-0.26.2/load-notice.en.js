(function(){
'use strict';
const text={data:'Match data could not be loaded. Please refresh in a moment.',predictions:'Prediction data could not be loaded. Please refresh in a moment.'};
// 0.26.2: shown only when a football data file did not load (or loaded without its object). Normal pages add nothing.
function notice(kind){const n=document.createElement('p');n.className='matchlab-load-notice';n.setAttribute('role','alert');n.dataset.loadNotice=kind;n.textContent=text[kind];n.style.cssText='margin:18px 0;padding:14px 18px;border:4px solid #8f1d1d;background:#fff4e8;color:#5c1010;font-size:15px;font-weight:700;line-height:1.5;box-shadow:4px 4px 0 #d9b9a8;overflow-wrap:anywhere';return n;}
window.MatchLabLoadNotice=notice;
const loaded=window.MatchLabData&&window.MatchLabData.data;
if(!loaded||typeof loaded!=='object'){const main=document.querySelector('main');(main||document.body).prepend(notice('data'));}
})();
