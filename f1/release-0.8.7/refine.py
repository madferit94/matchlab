from pathlib import Path
p=Path(__file__).resolve().parents[2]/'f1/index.html'
s=p.read_text(encoding='utf8')
old="$('back').onclick=()=>{location.hash='';$('catalog').hidden=false;$('detail').hidden=true};"
new="$('back').onclick=()=>{location.hash='';$('catalog').hidden=false;$('detail').hidden=true;renderYearControl();catalog()};"
assert old in s;s=s.replace(old,new,1)
old="else{stopReplay();$('catalog').hidden=false;$('detail').hidden=true}};render();"
new="else{stopReplay();const y=Number(new URLSearchParams(location.search).get('year'));if(Archive.seasons.includes(y))gpYear=y;renderYearControl();catalog();$('catalog').hidden=false;$('detail').hidden=true}};render();"
assert old in s;s=s.replace(old,new,1)
old="replayHandle=window.MatchLabF1Metrics.mount($('metricshost'),r,Historical.races?.[String(key)],{locale:lang});return}"
new="replayHandle=window.MatchLabF1Metrics.mount($('metricshost'),r,Historical.races?.[String(key)],{locale:lang});if(r.is_archive){const c=$('metricshost').querySelector('[data-metric-category]');c.innerHTML=`<option value=\"result\">${lang==='ko'?'경기 결과':'Race result'}</option>`;c.value='result';c.dispatchEvent(new Event('change'));}return}"
assert old in s;s=s.replace(old,new,1)
old="x.dsq?'DSQ':x.dns?'DNS':x.dnf?'DNF':'—']))"
new="x.dsq?'DSQ':x.dns?'DNS':x.dnf?'DNF':r.is_archive?(lang==='ko'?'완주':'Finished'):'—']))"
assert old in s;s=s.replace(old,new,1)
old="}).join('')||`<p>${w('empty')}</p>`;$('catalog')"
new="}).join('')||`<p>${lang==='ko'?'선택한 시즌·상태에 해당하는 그랑프리가 없습니다.':'No Grand Prix matches the selected season and status.'}</p>`;$('catalog')"
assert old in s;s=s.replace(old,new,1)
p.write_text(s,encoding='utf8')
print('Preserved selected year on back; archived metrics show result category; clear empty state')
