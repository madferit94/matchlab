"""Embed the versioned profile module and evidence into the canonical viewer."""
from pathlib import Path
import json,re
folder=Path(__file__).parent
page=folder.parent/'index.html'
s=page.read_text(encoding='utf8')
data=json.loads((folder/'profile-data.json').read_text(encoding='utf8'))
for name,content in [('profile-data',json.dumps(data,ensure_ascii=False).replace('</','<\\/')),('f1-profile-module',(folder/'profiles.js').read_text(encoding='utf-8-sig'))]:
 pattern=r'(<script id="'+name+r'"[^>]*>)[\s\S]*?(</script>)'
 s,n=re.subn(pattern,lambda m:m[1]+content+m[2],s)
 assert n==1,'Missing/duplicate block: '+name
page.write_text(s,encoding='utf8')
print('Updated only profile evidence/module blocks.')
