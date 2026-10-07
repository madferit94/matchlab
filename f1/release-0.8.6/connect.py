from pathlib import Path
p=Path(__file__).resolve().parents[2]
out=Path(__file__).parent
old=(p/'f1/release-0.8.5/natural-analysis.js').read_text(encoding='utf8')
s=old.replace("function mount(host,race,prediction,{locale='ko'}={})", "function mount(host,race,prediction,{locale='ko',history=null}={})")
s=s.replace("const en=locale==='en',examples=", "const service=history&&g.MatchLabF1History;\n const en=locale==='en',examples=")
s=s.replace(' host.innerHTML='," examples.push(en?'Show this Grand Prix last year records':'해당 그랑프리 작년 기록도 보여줘');\n host.innerHTML=",1)
s=s.replace("Selected GP only · Saved records · No AI API call", "Selected GP and collected previous-year results · No AI API call").replace("선택한 그랑프리 기준 · 저장된 기록 분석 · AI API 호출 없음", "선택한 그랑프리 · 수집한 과거 결과 조회 · AI API 호출 없음")
s=s.replace("Other conditions, races and uploaded files are not supported here.", "Collected past-year race results are available; other conditions and uploaded files are not supported here.")
s=s.replace("그 외 조건·다른 경기·업로드 파일은 지원하지 않습니다.", "수집한 이전 연도 경기 결과도 조회합니다. 그 외 조건·업로드 파일은 지원하지 않습니다.")
s=s.replace("const plan=parse(input.value,race,prediction,previous);", "const plan=service?service.parse(input.value,race,prediction,previous,history):parse(input.value,race,prediction,previous);")
s=s.replace("status.textContent=errors[plan.error];", "status.textContent=errors[plan.error]||errors.unsupported;")
s=s.replace("const result=execute(plan,race,prediction);", "const result=service?service.execute(plan,race,prediction,history):execute(plan,race,prediction);")
s=s.replace("+draw(result,en);", "+(service?service.draw(result,en):draw(result,en));")
a="for(const name of [d.full_name,d.name,...(aliases[d.driver_number]||[])].filter(Boolean).sort((a,b)=>b.length-a.length))"
b="for(const name of [d.full_name,d.name,d.last_name,...Object.values(aliases).filter(names=>names.some(n=>/^[a-z]/i.test(n)&&rxTerm(n).test(d.full_name||d.name||''))).flat()].filter(Boolean).sort((a,b)=>b.length-a.length))"
assert a in s;s=s.replace(a,b)
s=s.replace("|first|show|please|compare", "|도|first|show|please|compare")
(out/'natural-analysis.js').write_text(s,encoding='utf8')
f=p/'f1/index.html';h=f.read_text(encoding='utf8');assert old in h
assert not (out/'index-before.html').exists()
(out/'index-before.html').write_text(h,encoding='utf8')
h=h.replace(old,s,1)
modules='<script id="f1-query-history" type="application/json">'+(out/'query-history.json').read_text(encoding='utf8')+'</script><script id="f1-history-analysis">'+(out/'history-analysis.js').read_text(encoding='utf8')+'</script>'
h=h.replace('<script id="maps" type="application/json">',modules+'<script id="maps" type="application/json">',1)
h=h.replace("const D=JSON.parse(document.getElementById('dataset').textContent)","const QueryHistory=JSON.parse(document.getElementById('f1-query-history').textContent);\nconst D=JSON.parse(document.getElementById('dataset').textContent)",1)
target="window.MatchLabF1Natural.mount($('body'),r,pred,{locale:lang})";assert target in h;h=h.replace(target,"window.MatchLabF1Natural.mount($('body'),r,pred,{locale:lang,history:QueryHistory})",1)
css='<style id="f1-history-query-styles">.nl-history-season{margin-top:24px;min-width:0}.nl-history-season h4{font-size:20px;line-height:1.4;overflow-wrap:anywhere}.nl-history-table{max-width:100%;overflow:auto}.nl-history-table table{min-width:580px;width:100%}.nl-history-table th,.nl-history-table td{padding:12px;text-align:left}.nl-history-missing{padding:12px;border-left:3px solid #b57817;background:#fff6e4;color:#654817;overflow-wrap:anywhere}.nl-history .muted{overflow-wrap:anywhere}</style>'
h=h.replace('</head>',css+'</head>',1);f.write_text(h,encoding='utf8')
print('Connected 24 historical races and new query module; prior source/viewer preserved')
