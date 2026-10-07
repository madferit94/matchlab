"""Collect result-history inputs with a resumable cache outside the public repo."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from datetime import datetime,timezone
import json,time,hashlib

OUT=Path(__file__).parent
ROOT=OUT.parents[1]
CACHE=ROOT.parent.parent/'output/f1-history-2024-2026-10-08-v01'
CACHE.mkdir(parents=True,exist_ok=True)
manifest=[]
def fetch(endpoint,query,label):
    f=CACHE/(label+'.json');url='https://api.openf1.org/v1/'+endpoint+'?'+query
    cached=f.exists()
    if cached:blob=f.read_bytes()
    else:
        for attempt in range(5):
            time.sleep(4.8)
            try:
                with urlopen(Request(url,headers={'User-Agent':'MatchLab-2024-history/0.22'}),timeout=35) as response:blob=response.read()
                assert isinstance(json.loads(blob),list)
                f.write_bytes(blob);break
            except HTTPError as e:
                if e.code in (429,500,502,503,504) and attempt<4:
                    print('RETRY',endpoint,e.code,attempt+1,flush=True);time.sleep(10*(attempt+1));continue
                raise
    rows=json.loads(blob)
    manifest.append({'url':url,'sha256':hashlib.sha256(blob).hexdigest(),'rows':len(rows),'cached':cached,'checked_at':datetime.now(timezone.utc).isoformat()})
    (OUT/'collection-evidence.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
    return rows

sessions=fetch('sessions','year=2024&session_name=Race','sessions-2024-race')
meetings={m['meeting_key']:m for m in fetch('meetings','year=2024','meetings-2024')}
races=[]
for s in sorted(sessions,key=lambda x:x['date_start']):
    if s.get('is_cancelled') or s['session_name']!='Race':continue
    key=s['session_key'];meeting=meetings[s['meeting_key']]
    assert meeting['circuit_key']==s['circuit_key']
    records={endpoint:fetch(endpoint,'session_key='+str(key),str(key)+'-'+endpoint) for endpoint in ('drivers','session_result')}
    if not records['session_result']:raise RuntimeError('No result for '+str(key))
    races.append({'session':s,'meeting':meeting,'state':'completed','records':records,'coverage':{k:{'status':'ok','rows':len(v)} for k,v in records.items()}})
    payload={'version':'0.9.0','years':[2024],'scope':'Collected race driver metadata and final results only; laps/pit telemetry not collected','races':races}
    (OUT/'history-2024.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    print('COLLECTED',len(races),key,meeting['meeting_name'],len(records['drivers']),len(records['session_result']),flush=True)
print('COMPLETE',len(races),flush=True)
