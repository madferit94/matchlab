import re,sys,json
p='f1/index.html';h=open(p,encoding='utf8',newline='').read();case=sys.argv[1]
def block(name):
    m=re.search(r'<script id="'+name+r'" type="application/json">([\s\S]*?)</script>',h);return m.start(1),m.end(1),json.loads(m[1])
def put(name,obj):
    global h
    a,b,_=block(name);h=h[:a]+json.dumps(obj,ensure_ascii=False)+h[b:]
if case=='winner':
    _,_,d=block('dataset');r=[x for x in d['races'] if x['session']['session_key']==11404][0];res=r['records']['session_result'];a=[x for x in res if x['position']==1][0];b=[x for x in res if x['position']==2][0];a['position'],b['position']=2,1;put('dataset',d)
elif case=='profile':
    _,_,d=block('profile-data');d['current']['championship_drivers']['rows'][0]['points_current']+=1;put('profile-data',d)
elif case=='topkey':
    _,_,d=block('dataset');d['extra']=1;put('dataset',d)
elif case=='forecast_rule':
    a="&&Date.parse(Forecast.races[String(r.session.session_key)].as_of)<Date.parse(r.session.date_start)";assert h.count(a)==1;h=h.replace(a,'')
elif case=='date':
    _,_,d=block('dataset');r=[x for x in d['races'] if x['session']['session_key']==11396][0];r['session']['date_start']='2026-10-26T20:00:00+00:00';put('dataset',d)
open(p,'w',encoding='utf8',newline='').write(h)
