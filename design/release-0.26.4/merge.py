"""0.26.4: put the collected GPs into f1/index.html.

Only the `dataset`, `maps` and `profile-data` JSON blocks change. Every block is
re-serialised with the same settings it was written with (json.dumps,
ensure_ascii=False), which reproduces the current bytes exactly; races that are
not in the collection keep their exact bytes. Scheduled entries of the collected
GPs are replaced in place (same list position / key) by the completed entries.
Usage: python3 -I design/release-0.26.4/merge.py <built.json>
"""
from pathlib import Path
import json,re,sys,unicodedata
ROOT=Path(__file__).resolve().parents[2];PAGE=ROOT/'f1/index.html'
built=json.loads(Path(sys.argv[1]).read_text(encoding='utf8'))
html=PAGE.read_text(encoding='utf8')
def span(name):
    m=re.search(r'<script id="'+name+r'" type="application/json">([\s\S]*?)</script>',html);return m.start(1),m.end(1),m[1]
def dump(obj):
    text=json.dumps(obj,ensure_ascii=False);assert '</' not in text,'unsafe </ in JSON';return text
def key(name):return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode().lower()).strip('-')
blocks={}
# dataset
_,_,raw=span('dataset');ds=json.loads(raw);assert dump(ds)==raw,'dataset serialisation not reproducible'
new_keys={int(k) for k in built['races']}
for i,r in enumerate(ds['races']):
    k=r['session']['session_key']
    if k in new_keys:
        assert r['state']=='scheduled','only scheduled entries are replaced: '+str(k)
        ds['races'][i]=built['races'][str(k)]
assert all(any(r['session']['session_key']==k for r in ds['races']) for k in new_keys)
counts={}
for r in ds['races']:counts[r['state']]=counts.get(r['state'],0)+1
summary=ds['summary']
summary['as_of']=built['collected_at'];summary['state_counts']={s:counts.get(s,0) for s in summary['state_counts']}
summary['missing_or_failed']=summary['missing_or_failed']+[m for m in built['missing'] if m not in summary['missing_or_failed']]
blocks['dataset']=dump(ds)
# maps
_,_,raw=span('maps');maps=json.loads(raw);assert dump(maps)==raw,'maps serialisation not reproducible'
for k,record in built['maps'].items():
    assert maps['races'][k]['status']=='HISTORICAL_REFERENCE','only upcoming reference layouts are replaced: '+k
    maps['races'][k]=record
maps['as_of']=built['collected_at']
blocks['maps']=dump(maps)
# profile-data: current standings from the latest completed GP; driver entries follow the
# profile collector rule (latest completed GP row per driver), portraits are not re-collected.
_,_,raw=span('profile-data');prof=json.loads(raw);assert dump(prof)==raw,'profile serialisation not reproducible'
completed=sorted([r for r in ds['races'] if r['state']=='completed'],key=lambda r:r['session']['date_start']);latest=completed[-1]
champ=built['championship'];assert champ['basis_session']['session_key']==latest['session']['session_key']
prof['portraits_collected_at']=prof['collected_at'];prof['collected_at']=built['collected_at'];prof['basis_session']=latest['session']
for endpoint in ['championship_drivers','championship_teams']:prof['current'][endpoint]={'url':champ[endpoint]['url'],'status':champ[endpoint]['status'],'rows':champ[endpoint]['rows']}
old_drivers=prof['drivers'];drivers={}
for r in completed:
    for d in r['records'].get('drivers',[]):
        did=key(d['full_name']);prev=old_drivers.get(did,{})
        team=d.get('team_name') or prev.get('team_name')
        entry={**d,'id':did,'team_id':key(team) if team else None}
        drivers[did]={**entry,'portrait_url':prev.get('portrait_url'),'portrait_source':prev.get('portrait_source'),'current_roster':False}
for d in drivers.values():d['current_roster']=any(x['full_name']==d['full_name'] for x in latest['records']['drivers'])
# keep the original key order for existing drivers, append new ones
prof['drivers']={**{k:drivers[k] for k in old_drivers if k in drivers},**{k:v for k,v in drivers.items() if k not in old_drivers}}
blocks['profile-data']=dump(prof)
# write: replace from the end so offsets stay valid
for name in sorted(blocks,key=lambda n:span(n)[0],reverse=True):
    a,b,_=span(name);html=html[:a]+blocks[name]+html[b:]
PAGE.write_text(html,encoding='utf8')
print('merged',sorted(new_keys),'state counts',summary['state_counts'],'drivers',len(prof['drivers']),'new driver ids',[k for k in prof['drivers'] if k not in old_drivers])
