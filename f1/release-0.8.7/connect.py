from pathlib import Path
p=Path(__file__).resolve().parents[2]
out=Path(__file__).parent
f=p/'f1/index.html';s=f.read_text(encoding='utf8')
assert not (out/'index-before.html').exists()
(out/'index-before.html').write_text(s,encoding='utf8')
before='<main><div class="toolbar"><label id="filterlabel"'
after='<main><div class="toolbar"><div class="gp-year-control"><label id="gp-year-label" for="gp-year"></label><select id="gp-year"></select></div><label id="filterlabel"'
assert before in s;s=s.replace(before,after,1)
extra='<style id="f1-archive-catalog-styles">'+(out/'archive.css').read_text(encoding='utf8')+'</style><script id="f1-archive-catalog">'+(out/'archive-catalog.js').read_text(encoding='utf8')+'</script>'
s=s.replace('<script id="f1-query-history"',extra+'<script id="f1-query-history"',1)
before="let lang=new URLSearchParams(location.search).get('lang')==='en'?'en':'ko',tab='auto';"
after=before+"\nconst Archive=window.MatchLabF1Archive.create(D,QueryHistory),QueryCatalogue={...QueryHistory,races:Archive.races};\nconst requestedYear=Number(new URLSearchParams(location.search).get('year'));let gpYear=Archive.seasons.includes(requestedYear)?requestedYear:D.summary.season;\nfunction saveYearAddress(){const url=new URL(location.href);url.searchParams.set('year',String(gpYear));if(lang==='en')url.searchParams.set('lang','en');else url.searchParams.delete('lang');window.history.replaceState(null,'',url.pathname+url.search+url.hash);}\nfunction renderYearControl(){ $('gp-year-label').textContent=lang==='ko'?'GP 시즌':'GP season';$('gp-year').innerHTML=Archive.seasons.map(y=>`<option value=\"${y}\">${y}</option>`).join('');$('gp-year').value=String(gpYear);const list=Archive.list(gpYear);$('summary').textContent=`${list.length} GP · ${list.filter(r=>r.state==='completed').length} ${w('completed')}`;}\n"
assert before in s;s=s.replace(before,after,1)
s=s.replace("$('tagline').textContent=w('tag');", "$('tagline').textContent=lang==='ko'?'F1 · 기록으로 읽는 그랑프리':'F1 · Explore every Grand Prix';",1)
before="$('summary').textContent=`${D.races.length} GP · ${D.summary.state_counts.completed||0} ${w('completed')}`;"
assert before in s;s=s.replace(before,"renderYearControl();",1)
before="const list=D.races.filter(r=>f==='all'||r.state===f);"
assert before in s;s=s.replace(before,"const list=Archive.list(gpYear,f);",1)
before='<h3>${esc(raceName(r))}</h3>'
assert before in s;s=s.replace(before,'<span class="gp-archive-year">${r.session.year}</span>'+before,1)
before="const r=D.races.find(x=>x.session.session_key===key);if(!r)return;stopReplay();const available=r.state==='completed'?['map','analysis','metrics','comparison','result','laps','tyres','events']:r.state==='scheduled'?['prediction','analysis']:['result'];"
after="const r=Archive.find(key);if(!r)return;gpYear=Number(r.session.year);renderYearControl();saveYearAddress();stopReplay();const available=Archive.tabs(r);"
assert before in s;s=s.replace(before,after,1)
before='<h2>${esc(raceName(r))}</h2>'
assert before in s;s=s.replace(before,'<h2>${r.session.year} · ${esc(raceName(r))}</h2>',1)
before='<div class="panel" id="body"></div>'
after="${r.is_archive?`<p class=\"gp-archive-note\">${lang==='ko'?'수집한 과거 경기 결과입니다. 순위·포인트·완료 랩·완주 상태를 확인할 수 있습니다.':'Collected historical race results: positions, points, completed laps and finish status.'}</p>`:''}"+before
assert before in s;s=s.replace(before,after,1)
s=s.replace("history:QueryHistory})", "history:QueryCatalogue})",1)
before="$('filter').onchange=()=>"
after="$('gp-year').onchange=()=>{gpYear=Number($('gp-year').value);tab='auto';stopReplay();location.hash='';saveYearAddress();$('detail').hidden=true;$('catalog').hidden=false;renderYearControl();catalog()};\n"+before
assert before in s;s=s.replace(before,after,1)
(out/'catalog-render-source.js').write_text(s[s.rfind('function render(){'):s.index('function table(headers,rows)')],encoding='utf8')
f.write_text(s,encoding='utf8')
print('Added 2025/2026 GP browsing, archive detail routing and year address preservation')
