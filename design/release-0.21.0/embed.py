from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
css=(Path(__file__).parent/'theme.css').read_text(encoding='utf-8-sig')
js=(Path(__file__).parent/'search.js').read_text(encoding='utf-8-sig')
for name in ['index.html','index.en.html','f1/index.html']:
 p=root/name;s=p.read_text(encoding='utf8')
 for tag,id in [('style','matchlab-shared-theme'),('script','matchlab-shared-search')]:
  s=re.sub('<'+tag+' id="'+id+'">[\\s\\S]*?</'+tag+'>','',s)
 if 'data-design="matchlab-2026"' not in s:s=s.replace('<html ','<html data-design="matchlab-2026" ',1)
 s=s.replace('<header>','<style id="matchlab-shared-theme">'+css+'</style><script id="matchlab-shared-search">'+js+'</script><header>',1)
 p.write_text(s,encoding='utf8')
print('Embedded shared theme/search in all three viewers')
