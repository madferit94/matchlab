"""0.26.4 F1 collector: completed 2026 GPs from the public OpenF1 API (no key, no login).

Builds dataset race entries in the same shape as the existing `dataset` block
(meeting, session, state, coverage, records, validation, venue), the circuit map
entry (same rules as f1/release-0.4.0/map-data/collect-maps.py) and the current
championship tables for `profile-data`. Raw API responses are cached gzip-compressed
in a folder OUTSIDE the repository (--raw); only the built JSON goes to --out.

Usage:
  python3 -I design/release-0.26.4/collect.py --raw <scratch>/openf1 --out <scratch>/built.json \
      --keys 11388,11396,11404 [--verify 11731,11377] [--refresh 11404]
--verify rebuilds already-published GPs and compares them with the current page data.
--refresh drops the cached responses of those sessions (and their meeting / championship
rows) first, so results revised after the race (penalties) are fetched again.

Review fixes (0.26.4 R1, R3):
- every built race carries `collected_at` (time its session_result was fetched).
- a race driver row without team_name/team_colour takes them from the same meeting's
  other sessions (practice, qualifying) when those agree; the source is recorded in
  `team_source`.
- if OpenF1 championship rows for the race do not yet match points_start + the race
  session_result points, the standings are recomputed from the results (status
  `recomputed_from_session_result`, OpenF1 rows kept in `openf1_rows`).
"""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError,URLError
from datetime import datetime,timezone,timedelta
import argparse,gzip,hashlib,json,math,re,statistics,time

ROOT=Path(__file__).resolve().parents[2]
API='https://api.openf1.org/v1/'
ENDPOINTS=['drivers','session_result','starting_grid','laps','stints','pit','race_control','weather','position']
SPACING=2.1  # seconds between live requests (same as the 0.4.0 map collector)
last_request=[0.0]
manifest=[]

def cache_name(endpoint,params):
    return re.sub(r'[^A-Za-z0-9_.=-]+','_',endpoint+'-'+urlencode(params))[:180]+'.json.gz'

def fetch(raw_dir,endpoint,params):
    query=urlencode(params);url=API+endpoint+'?'+query
    name=cache_name(endpoint,params);f=raw_dir/name
    if f.exists():
        blob=gzip.decompress(f.read_bytes());status='cached'
    else:
        status='ok';blob=None
        for attempt in range(3):
            wait=SPACING-(time.time()-last_request[0])
            if wait>0:time.sleep(wait)
            last_request[0]=time.time()
            try:
                with urlopen(Request(url,headers={'User-Agent':'MatchLab F1 collector 0.26.4'}),timeout=90) as response:blob=response.read()
                json.loads(blob);f.write_bytes(gzip.compress(blob,mtime=0));break
            except HTTPError as exc:
                if exc.code==429 and attempt<2:time.sleep(10*(attempt+1));continue
                status='HTTP_'+str(exc.code);blob=b'[]';break
            except (URLError,TimeoutError) as exc:
                status=type(exc).__name__;blob=b'[]';break
    rows=json.loads(blob)
    if isinstance(rows,dict):rows=[]  # OpenF1 answers {"detail": ...} when nothing matches
    fetched=datetime.fromtimestamp(f.stat().st_mtime,timezone.utc).isoformat() if f.exists() else datetime.now(timezone.utc).isoformat()
    manifest.append({'url':url,'cache_file':name,'status':status,'rows':len(rows),'sha256':hashlib.sha256(blob).hexdigest(),'fetched_at':fetched})
    return rows,status

def coverage_status(status,rows):
    if status in ('ok','cached'):return 'ok' if rows else 'empty'
    return status

def build_race(raw_dir,key,previous=None):
    sessions,_=fetch(raw_dir,'sessions',{'session_key':key});session=sessions[0]
    meetings,_=fetch(raw_dir,'meetings',{'meeting_key':session['meeting_key']});meeting=meetings[0]
    records={};coverage={};missing=[];collected_at=None
    for endpoint in ENDPOINTS:
        rows,status=fetch(raw_dir,endpoint,{'session_key':key})
        if endpoint=='session_result':collected_at=manifest[-1]['fetched_at']
        records[endpoint]=rows;coverage[endpoint]={'status':coverage_status(status,rows),'rows':len(rows)}
        if coverage[endpoint]['status']!='ok':missing.append({'session_key':key,'endpoint':endpoint,'status':coverage[endpoint]['status'],'rows':len(rows)})
    fill_teams(raw_dir,session,records['drivers'])
    lap_keys=[(l['driver_number'],l['lap_number']) for l in records['laps']]
    drivers={d['driver_number'] for d in records['drivers']}
    validation={'duplicate_lap_keys':len(lap_keys)-len(set(lap_keys)),'unmatched_lap_drivers':len({l['driver_number'] for l in records['laps']}-drivers),
                'null_lap_durations':sum(l.get('lap_duration') is None for l in records['laps'])}
    state='completed' if records['session_result'] else ('cancelled' if session.get('is_cancelled') else 'scheduled')
    venue=(previous or {}).get('venue') or {'country':session['country_name'],'location':session['location'],'circuit':session['circuit_short_name'],'circuit_key':session['circuit_key'],'verification':'OpenF1 fields; not independently confirmed','sources':['https://openf1.org/docs/']}
    return {'meeting':meeting,'session':session,'state':state,'coverage':coverage,'records':records,'validation':validation,'venue':venue,'collected_at':collected_at},missing

def fill_teams(raw_dir,session,drivers):
    # R3: OpenF1 sometimes leaves team_name/team_colour empty for a stand-in driver in the race.
    missing=[d for d in drivers if not d.get('team_name') or not d.get('team_colour')]
    if not missing:return
    others,_=fetch(raw_dir,'sessions',{'meeting_key':session['meeting_key']})
    for d in missing:
        seen=[]
        for other in sorted(others,key=lambda s:s['date_start']):
            if other['session_key']==session['session_key']:continue
            rows,_=fetch(raw_dir,'drivers',{'session_key':other['session_key'],'driver_number':d['driver_number']})
            for row in rows:
                if row.get('team_name') and row.get('team_colour'):seen.append((other['session_key'],other['session_name'],row['team_name'],row['team_colour']))
        teams={(t,c) for _,_,t,c in seen}
        if len(teams)==1:
            team,colour=teams.pop()
            if not d.get('team_name'):d['team_name']=team
            if not d.get('team_colour'):d['team_colour']=colour
            d['team_source']={'rule':'same meeting, other sessions agree; race row had no team','sessions':[{'session_key':k,'session_name':n} for k,n,_,_ in seen],'provider':'OpenF1 drivers'}

def instant(s):return datetime.fromisoformat(s.replace('Z','+00:00'))
def epoch(s):return int(round(instant(s).timestamp()*1000))

def reference_lap_choices(race,num):
    # Same as collect-maps.py plus the 0.4.0 refinement (outline-refinement.json:
    # pit_in_out_excluded): no pit-out lap, no lap with a pit entry, no lap after one.
    valid=[l for l in race['records']['laps'] if l.get('date_start') and l.get('lap_duration') and l['lap_duration']>0]
    pit_laps={p.get('lap_number') for p in race['records'].get('pit',[]) if p['driver_number']==num}
    blocked=pit_laps|{n+1 for n in pit_laps if isinstance(n,int)}
    choices=[l for l in valid if l['driver_number']==num and not l.get('is_pit_out_lap') and l.get('lap_number',0)>2 and l['lap_number'] not in blocked]
    choices.sort(key=lambda l:(abs(l['lap_number']-10),l['lap_number']))
    return choices

def build_map(raw_dir,race):
    s=race['session'];key=s['session_key'];laps=race['records']['laps'];available={d['driver_number']:d for d in race['records']['drivers']}
    valid=[l for l in laps if l.get('date_start') and l.get('lap_duration') and l['lap_duration']>0]
    begin=min(instant(l['date_start']) for l in valid);end=max(instant(l['date_start'])+timedelta(seconds=l['lap_duration']) for l in valid)
    nums=[num for num in [63,3] if num in available and any(l['driver_number']==num for l in valid)]
    nums+=[d['driver_number'] for d in race['records']['drivers'] if d['driver_number'] not in nums and any(l['driver_number']==d['driver_number'] for l in valid)]
    nums=nums[:2]
    record={'session_key':key,'circuit_key':s['circuit_key'],'circuit_name':s['circuit_short_name'],'meeting_name':race['meeting']['meeting_name'],
      'race_start_ms':int(begin.timestamp()*1000),'race_end_ms':int(end.timestamp()*1000),'points':[],'drivers':{},'status':'MISSING','reference':None,
      'coordinate_system':'OpenF1 recorded x/y; identical raw coordinate system for trace and circuit outline',
      'scope':'Two selected drivers have observed coordinates; remaining cars require labelled lap reconstruction; forecast lane never uses these target-race coordinates.'}
    for num in nums:
        params={'session_key':key,'driver_number':num,'date>':(begin-timedelta(seconds=2.4)).isoformat(),'date<':(end+timedelta(seconds=2.4)).isoformat()}
        raw,status=fetch(raw_dir,'location',params);source_entry=manifest[-1]
        url=API+'location?'+urlencode(params)
        bytime={}
        for item in raw:
            if item.get('session_key')!=key or item.get('driver_number')!=num:continue
            if item.get('date') and all(isinstance(item.get(a),(int,float)) and math.isfinite(item[a]) for a in ('x','y')):
                t=epoch(item['date'])
                if record['race_start_ms']-2400<t<record['race_end_ms']+2400:bytime[t]=[t,item['x'],item['y']]
        points=sorted(bytime.values());sparse=[]
        for j,point in enumerate(points):
            prior=points[j-1] if j else None;following=points[j+1] if j+1<len(points) else None
            edge_gap=prior is not None and point[0]-prior[0]>2000 or following is not None and following[0]-point[0]>2000
            if not sparse or point[0]-sparse[-1][0]>=1000 or edge_gap or j==len(points)-1:sparse.append(point)
        gaps=[points[i][0]-points[i-1][0] for i in range(1,len(points))]
        record['drivers'][str(num)]={'driver_number':num,'name':available[num]['full_name'],'team':available[num]['team_name'],
          'samples':sparse,'source_rows':len(raw),'valid_original_samples':len(points),'max_original_gap_ms':max(gaps,default=None),
          'original_gaps_over_2s':sum(g>2000 for g in gaps),'median_original_interval_ms':statistics.median(gaps) if gaps else None,
          'status':'OBSERVED_LOCATION' if points else 'MISSING',
          'source':{'url':url,'file':'raw/'+source_entry['cache_file'],'sha256_uncompressed':source_entry['sha256'],'rows':len(raw),'status':'ok' if status in ('ok','cached') else status,'error':None,'recorded_at':source_entry['fetched_at']}}
        if not record['points'] and points:
            for lap in reference_lap_choices(race,num):
                t0=epoch(lap['date_start']);t1=t0+int(round(lap['lap_duration']*1000));lap_points=[p for p in points if t0<=p[0]<=t1]
                if len(lap_points)>=100:
                    record['points']=[[p[1],p[2]] for p in lap_points]
                    record['reference']={'driver_number':num,'lap_number':lap['lap_number'],'start_ms':t0,'end_ms':t1,'point_count':len(lap_points),'source_url':url,'closed_artificially':False,'pit_in_out_excluded':True};break
    record['status']='OBSERVED_LOCATION' if len(record['points'])>=100 else 'MISSING_TRACK_REFERENCE'
    return record

def reconcile_championship(champ,race):
    # R1: standings must agree with the (possibly revised) race classification.
    points={r['driver_number']:(r.get('points') or 0) for r in race['records']['session_result']}
    team_of={d['driver_number']:d.get('team_name') for d in race['records']['drivers']}
    drivers=champ['championship_drivers']['rows'];teams=champ['championship_teams']['rows']
    def recompute(rows,gained,ident):
        out=[{**r,'points_current':r['points_start']+gained.get(r[ident],0)} for r in rows]
        # rank by points; equal points keep the order OpenF1 gave before the race (position_start)
        order=sorted(out,key=lambda r:(-r['points_current'],r.get('position_start') or 99))
        for i,r in enumerate(order):r['position_current']=i+1
        return sorted(out,key=lambda r:r['position_current'])
    team_gain={}
    for num,p in points.items():
        if team_of.get(num):team_gain[team_of[num]]=team_gain.get(team_of[num],0)+p
    agree=all(abs(r['points_start']+points.get(r['driver_number'],0)-r['points_current'])<1e-9 for r in drivers)
    champ['agrees_with_session_result']=agree
    if not agree:
        for endpoint,gained,ident in [('championship_drivers',points,'driver_number'),('championship_teams',team_gain,'team_name')]:
            pack=champ[endpoint];pack['openf1_rows']=pack['rows'];pack['rows']=recompute(pack['rows'],gained,ident);pack['status']='recomputed_from_session_result'
            pack['note']='OpenF1 standings for this race had not applied the revised classification at fetch time; points_current = points_start + race points from session_result (no sprint in this meeting); ties keep position_start order.'

def page_block(name):
    html=(ROOT/'f1/index.html').read_text(encoding='utf8')
    return json.loads(re.search(r'<script id="'+name+r'" type="application/json">([\s\S]*?)</script>',html)[1])

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--raw',required=True);ap.add_argument('--out',required=True);ap.add_argument('--keys',required=True);ap.add_argument('--verify',default='');ap.add_argument('--refresh',default='')
    a=ap.parse_args();raw_dir=Path(a.raw).resolve();raw_dir.mkdir(parents=True,exist_ok=True)
    assert ROOT not in raw_dir.parents and raw_dir!=ROOT,'raw cache must be outside the repository'
    for key in [k for k in a.refresh.split(',') if k]:
        for f in raw_dir.iterdir():
            if re.search(r'session_key[=_]'+key+r'(\b|_|\.)',f.name) or f.name.startswith('championship_') and key in f.name:f.unlink()
    dataset=page_block('dataset');maps=page_block('maps')['races'];by_key={r['session']['session_key']:r for r in dataset['races']}
    report={'collected_at':datetime.now(timezone.utc).isoformat(),'source':'https://openf1.org/docs/','verify':{},'races':{},'maps':{},'missing':[]}
    for key in [int(k) for k in a.verify.split(',') if k]:
        race,_=build_race(raw_dir,key,by_key.get(key));old=by_key[key]
        same={part:race[part]==old[part] for part in ['coverage','validation']}
        same['records']={e:race['records'][e]==old['records'][e] for e in ENDPOINTS}
        same['records_text']={e:json.dumps(race['records'][e],ensure_ascii=False)==json.dumps(old['records'][e],ensure_ascii=False) for e in ENDPOINTS}
        choice=reference_lap_choices(old,maps[str(key)]['reference']['driver_number'])
        same['map_reference_lap_rule']=bool(choice) and choice[0]['lap_number']==maps[str(key)]['reference']['lap_number']
        report['verify'][str(key)]=same;print('VERIFY',key,json.dumps(same),flush=True)
    for key in [int(k) for k in a.keys.split(',') if k]:
        race,missing=build_race(raw_dir,key,by_key.get(key));report['races'][str(key)]=race;report['missing']+=missing
        print('RACE',key,race['state'],{k:v['rows'] for k,v in race['coverage'].items()},flush=True)
        if race['state']=='completed':
            report['maps'][str(key)]=build_map(raw_dir,race);print('MAP',key,report['maps'][str(key)]['status'],len(report['maps'][str(key)]['points']),flush=True)
    latest=max([r for r in list(by_key.values())+list(report['races'].values()) if r['state']=='completed'],key=lambda r:r['session']['date_start'])
    report['championship']={'basis_session':latest['session']}
    for endpoint in ['championship_drivers','championship_teams']:
        rows,status=fetch(raw_dir,endpoint,{'session_key':latest['session']['session_key']})
        report['championship'][endpoint]={'url':API+endpoint+'?session_key='+str(latest['session']['session_key']),'status':'ok' if status in ('ok','cached') else status,'rows':rows,'fetched_at':manifest[-1]['fetched_at']}
    reconcile_championship(report['championship'],report['races'].get(str(latest['session']['session_key']))or latest)
    report['manifest']=manifest
    Path(a.out).write_text(json.dumps(report,ensure_ascii=False),encoding='utf8')
    print('DONE',a.out,flush=True)

if __name__=='__main__':main()
