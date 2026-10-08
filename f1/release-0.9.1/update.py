from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=root/'f1/index.html'
s=p.read_text(encoding='utf-8-sig')
old="function raceName(r){return r.display_name?.[lang]||r.meeting.meeting_name}"
assert s.count(old)==1
s=s.replace(old,"function raceName(r){return r.display_name?.en||r.meeting.meeting_name}")
css='''html[data-design] .nl-form{padding:20px;background:#eef7fb;border:1px solid #98bbc9;border-radius:14px;gap:14px;min-width:0}html[data-design] .nl-form label{font-size:18px!important;font-weight:700;color:#18384b}html[data-design] .nl-form textarea{box-sizing:border-box;min-height:144px!important;border:2px solid #39738b!important;background:#fff!important;color:#162e37!important;font-size:18px!important;line-height:1.6!important;padding:16px!important}html[data-design] .nl-form textarea::placeholder{color:#526675;opacity:1}html[data-design] .nl-form textarea:focus{outline:3px solid #1681a2;outline-offset:3px}html[data-design] .nl-form button[type=submit]{justify-self:start;min-height:48px;background:#006d84!important;color:#fff!important;border:1px solid #006d84!important;padding:12px 24px!important;font-weight:700}html[data-design] .f1-analysis-entry{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;background:#eef7fb;border:1px solid #98bbc9;border-radius:12px;padding:16px 20px;margin:18px 0}html[data-design] .f1-analysis-entry strong{font-size:18px}html[data-design] .f1-analysis-entry button{background:#006d84!important;color:#fff!important;border:1px solid #006d84!important;min-height:48px;padding:12px 20px!important;font-weight:700}html[data-design] .tabs button[data-tab=analysis]{border:2px solid #39738b!important;font-weight:700}html[data-design] .tabs button[aria-pressed=true]{background:#234e91!important;color:white!important}@media(max-width:600px){html[data-design] .nl-form{padding:14px}html[data-design] .f1-analysis-entry button{width:100%}}'''
assert s.count('<header>')==1
s=s.replace('<header>','<style id="f1-analysis-visibility">'+css+'</style><header>')
old="${en?'Selected GP and collected previous-year results · No AI API call':'선택한 그랑프리 · 수집한 과거 결과 조회 · AI API 호출 없음'}"
new="${en?'Enter a driver, metric and conditions to view records or a chart.':'선수, 지표와 조건을 문장으로 입력하면 기록이나 차트를 볼 수 있습니다.'}"
assert s.count(old)==1
s=s.replace(old,new)
old='<div class="tabs">${available.map(k=>'
new='''${available.includes('analysis')?`<div class="f1-analysis-entry"><strong>${lang==='ko'?'기록을 문장으로 검색해 보세요':'Explore records with a question'}</strong><button type="button" data-analysis-open>${lang==='ko'?'자연어로 질문하기':'Ask the data analyst'}</button></div>`:''}<div class="tabs">${available.map(k=>'''
assert s.count(old)==1
s=s.replace(old,new)
old="if(tab==='analysis'){const pred="
new="$('detail').querySelector('[data-analysis-open]')?.addEventListener('click',()=>{tab='analysis';detail(key);const input=$('f1-question');input?.scrollIntoView({block:'center'});input?.focus({preventScroll:true})});\nif(tab==='analysis'){const pred="
assert s.count(old)==1
s=s.replace(old,new)
p.write_text(s,encoding='utf-8')
print('GP title normalized; prominent analysis entry and accessible input styles applied.')

