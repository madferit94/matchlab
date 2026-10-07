from pathlib import Path
import re,json
R=Path(__file__).resolve().parent;P=R.parents[1];page=P/'f1/index.html'
h=page.read_text(encoding='utf8');backup=R/'index-before.html'
assert not backup.exists();backup.write_text(h,encoding='utf8')
def replace_block(ident,source):
 global h
 h,n=re.subn(r'(<(?:script|style) id="'+ident+r'"[^>]*>)[\s\S]*?(</(?:script|style)>)',lambda m:m[1]+source+m[2],h);assert n==1
archive=(R.parent/'release-0.8.7/archive-catalog.js').read_text(encoding='utf8').replace('create(current,history)','create(current,history,predictions={})').replace("race.is_archive?['result','analysis','metrics']","race.is_archive?(predictions[String(race.session.session_key)]?['result','comparison','analysis','metrics']:['result','analysis','metrics'])")
(R/'archive-catalog.js').write_text(archive,encoding='utf8');replace_block('f1-archive-catalog',archive)
adapter=(R.parent/'release-0.8.6/history-analysis.js').read_text(encoding='utf8')
adapter=adapter.replace("key(race)===key(current)?prediction:null","history?.predictions?.[String(key(race))]||(key(race)===key(current)?prediction:null)")
adapter=adapter.replace("&&key(r)!==key(current)","&&!(history?.predictions?.[String(key(r))]||(key(r)===key(current)&&prediction))")
adapter=adapter.replace("key(r)===key(current)?prediction:null","history?.predictions?.[String(key(r))]||(key(r)===key(current)?prediction:null)")
(R/'history-analysis.js').write_text(adapter,encoding='utf8');replace_block('f1-history-analysis',adapter)
extra=''.join('<script id="'+ident+'" type="application/json">'+(R/file).read_text(encoding='utf8')+'</script>\n' for ident,file in [('f1-history-2024','history-2024.json'),('f1-predictions-2025','predictions-2025.json')])
# Data elements must be inserted outside the main controller script.
h=h.replace('<script id="f1-query-history"',extra+'<script id="f1-query-history"',1)
h=h.replace("const Archive=window.MatchLabF1Archive.create(D,QueryHistory),QueryCatalogue={...QueryHistory,races:Archive.races};","const Past2024=JSON.parse(document.getElementById('f1-history-2024').textContent),Past2025=JSON.parse(document.getElementById('f1-predictions-2025').textContent),AllPredictions={...Historical.races,...Past2025.races},recordPrediction=key=>AllPredictions[String(key)];\nconst Archive=window.MatchLabF1Archive.create(D,{races:[...QueryHistory.races,...Past2024.races]},AllPredictions),QueryCatalogue={...QueryHistory,races:Archive.races,predictions:AllPredictions};")
h=h.replace("Historical.races?.[String(key)]","recordPrediction(key)")
h=h.replace("<option value=\"result\">${lang==='ko'?'경기 결과':'Race result'}</option>`;c.value", "<option value=\"result\">${lang==='ko'?'경기 결과':'Race result'}</option>${recordPrediction(key)?`<option value=\"prediction\">${lang==='ko'?'예측 지표':'Prediction'}</option>`:''}`;c.value")
needle="if(tab==='comparison'){const prediction=recordPrediction(key);"
new="""if(tab==='comparison'&&r.is_archive){const prediction=recordPrediction(key);const actual=Object.fromEntries(results.map(x=>[x.driver_number,x]));$('body').innerHTML=`<p>${lang==='ko'?'2024년으로 학습한 모델의 2025년 경기 전 기록 기반 예측':'2025 estimates from a model trained on 2024, using earlier completed race records'}</p>`+table(lang==='ko'?['드라이버','예측 순위','실제 순위','순위 차이','우승 확률']:['Driver','Predicted rank','Actual rank','Rank difference','Win probability'],prediction.drivers.slice().sort((a,b)=>a.predicted_rank-b.predicted_rank).map(d=>{const a=actual[d.driver_number]?.position;return [profileUI.driverLink(by[d.driver_number]||{name:d.name}),d.predicted_rank,a??'—',a==null?'—':(a-d.predicted_rank>0?'+':'')+(a-d.predicted_rank),(100*d.win_probability).toFixed(1)+'%']}));return}
"""+needle
assert needle in h;h=h.replace(needle,new,1)
page.write_text(h,encoding='utf8')
print('Connected 2024 catalogue and 2025 frozen-model comparisons')
