"""Collect dated profile evidence; never rewrite original race/forecast payloads."""
from pathlib import Path
import json,re,time,urllib.request,urllib.error,datetime,unicodedata
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).parent

def get(url):
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'MatchLab-profile-collector/0.20'}),timeout=30) as response:
    return response.read().decode()
  except urllib.error.HTTPError as e:
   if e.code not in (429,500,502,503,504) or attempt==2:raise
   time.sleep(2+attempt*2)

def api(endpoint,query):
 url='https://api.openf1.org/v1/'+endpoint+'?'+query
 try:return {'url':url,'status':'ok','rows':json.loads(get(url))}
 except Exception as e:return {'url':url,'status':str(e)[:140],'rows':[]}

def key(name):return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode().lower()).strip('-')

html=(ROOT/'f1/index.html').read_text(encoding='utf8')
D=json.loads(re.search(r'<script id="dataset" type="application/json">([\s\S]*?)</script>',html)[1])
completed=sorted([r for r in D['races'] if r['state']=='completed'],key=lambda r:r['session']['date_start'])
latest=completed[-1]
result={'collected_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'season':D['summary']['season'],'basis_session':latest['session'],'current':{},'history':{},'drivers':{},'teams':{},'sources':[]}
for endpoint in ['championship_drivers','championship_teams']:
 result['current'][endpoint]=api(endpoint,'session_key='+str(latest['session']['session_key']));time.sleep(.4)
for r in completed:
 for d in r['records'].get('drivers',[]):
  result['drivers'][key(d['full_name'])]={**d,'id':key(d['full_name']),'team_id':key(d['team_name'])}
for year in [2023,2024,2025]:
 sessions=api('sessions','year='+str(year)+'&session_name=Race')
 valid=sorted([r for r in sessions['rows'] if not r.get('is_cancelled')],key=lambda r:r['date_start'])
 if not valid:result['history'][str(year)]={'status':sessions['status']};continue
 final=valid[-1];pack={'session':final}
 for endpoint in ['drivers','championship_drivers','championship_teams']:
  pack[endpoint]=api(endpoint,'session_key='+str(final['session_key']));time.sleep(.5)
 result['history'][str(year)]=pack
 print('Historical season',year,[(k,len(v.get('rows',[]))) for k,v in pack.items() if isinstance(v,dict) and 'rows' in v],flush=True)
# Discover actual asset URLs from official listing HTML, without guessing filenames.
portrait_page='https://www.formula1.com/en/drivers';team_page='https://www.formula1.com/en/teams'
portrait_html=get(portrait_page);team_html=get(team_page)
portraits=sorted(set(u.rstrip(')') for u in re.findall(r'https[^\s"<>\\]+',portrait_html) if 'media.formula1.com' in u and '/2026/' in u and u.endswith('right.webp')))
logos=sorted(set(u for u in re.findall(r'https[^\s"<>\\]+',team_html) if 'media.formula1.com' in u and '/2026/' in u and u.endswith('logowhite.webp')))
for d in result['drivers'].values():
 head=d.get('headshot_url') or '';codes=re.findall(r'/([a-z]{6}\d\d)(?:_|\.)',head,re.I);code=codes[-1].lower() if codes else None
 d['portrait_url']=next((u for u in portraits if code and '/'+code+'/' in u),None)
 d['portrait_source']=portrait_page if d['portrait_url'] else None
 d['current_roster']=any(x['full_name']==d['full_name'] for x in latest['records']['drivers'])
 t=d['team_id'];token=re.sub('[^a-z0-9]','',d['team_name'].lower())
 if t not in result['teams']:result['teams'][t]={'id':t,'name':d['team_name'],'colour':d.get('team_colour'),'logo_url':next((u for u in logos if '/'+token+'/' in u),None),'logo_source':team_page}
result['sources']=[portrait_page,team_page,'https://openf1.org/docs/']
(OUT/'profile-data.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Current standings',len(result['current']['championship_drivers']['rows']),len(result['current']['championship_teams']['rows']),flush=True)
print('Portraits',sum(bool(x['portrait_url']) for x in result['drivers'].values()),'/',len(result['drivers']),'logos',sum(bool(x['logo_url']) for x in result['teams'].values()),flush=True)
