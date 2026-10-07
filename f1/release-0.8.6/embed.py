from pathlib import Path
import re
out=Path(__file__).parent
p=out.parents[1]/'f1/index.html'
s=p.read_text(encoding='utf8')
css='<style id="f1-history-query-styles">'+(out/'history.css').read_text(encoding='utf8')+'</style>'
if '<style id="f1-history-query-styles">' in s:
 s=re.sub(r'<style id="f1-history-query-styles">[\s\S]*?</style>',lambda m:css,s)
else:
 s=s.replace('<script id="f1-query-history"',css+'<script id="f1-query-history"',1)
pattern=r'/\* Natural-language shortcuts over recorded F1 data\.[\s\S]*?g\.MatchLabF1Natural=\{parse,execute,draw,mount\};\s*\}\)\(typeof window===\x27undefined\x27\?globalThis:window\);'
s,n=re.subn(pattern,lambda m:(out/'natural-analysis.js').read_text(encoding='utf8').strip(),s)
assert n==1,n
for tag,ident,name in [('script','f1-query-history','query-history.json'),('script','f1-history-analysis','history-analysis.js')]:
 pattern='(<'+tag+' id="'+ident+'"[^>]*>)[\\s\\S]*?(</'+tag+'>)'
 s,n=re.subn(pattern,lambda m:m[1]+(out/name).read_text(encoding='utf8')+m[2],s)
 assert n==1,(ident,n)
p.write_text(s,encoding='utf8')
print('Embedded versioned F1 history source and data')
