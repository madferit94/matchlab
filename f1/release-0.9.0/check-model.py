"""Independent reconstruction of features, fitted weights and test scores."""
from pathlib import Path
import json,math,unicodedata,joblib,copy
from datetime import datetime
R=Path(__file__).resolve().parent
load=lambda p:json.loads(p.read_text(encoding='utf8'))
past=load(R/'history-2024.json')['races'];test=load(R.parent/'release-0.8.6/query-history.json')['races'];payload=load(R/'predictions-2025.json');model=joblib.load(R/'model-2024.joblib');keys=model['features']
ident=lambda d:''.join(x for x in unicodedata.normalize('NFKD',d['full_name']).casefold() if x.isalpha())
clock=lambda x:datetime.fromisoformat(x.replace('Z','+00:00'))
def append(r,h):
 roster={d['driver_number']:d for d in r['records']['drivers']};n=len(r['records']['session_result'])
 for a in r['records']['session_result']:
  d=roster[a['driver_number']];pos=a.get('position');h.append(dict(person=ident(d),team=d['team_name'],year=r['session']['year'],key=r['session']['session_key'],circuit=r['session']['circuit_key'],end=r['session']['date_end'],score=(n-(pos or n))/(n-1),points=a.get('points') or 0,win=int(pos==1),podium=int(pos is not None and pos<=3),nonfinish=int(any(a.get(k) for k in ('dnf','dns','dsq')))))
def expected(d,s,h):
 own=[a for a in h if a['person']==ident(d)];team=[a for a in h if a['team']==d['team_name']];last=[]
 for a in team:
  if a['key'] not in last:last.append(a['key'])
 t=[a for a in team if a['key'] in last[-5:]];c=[a for a in own if a['circuit']==s['circuit_key']];smooth=lambda rows,k,p:(sum(a[k] for a in rows)+2*p)/(len(rows)+2)
 return [smooth(own[-5:],'score',.5),smooth(own[-5:],'points',4),smooth(own[-5:],'win',.05),smooth(own[-5:],'podium',.15),smooth(own[-5:],'nonfinish',.15),smooth([a for a in own if a['year']==s['year']],'score',.5),smooth(t,'score',.5),smooth(t,'win',.05),smooth(c,'score',.5),smooth(c,'win',.05)]
h=[]
for r in sorted(past,key=lambda r:r['session']['date_start']):append(r,h)
loss=[];hits=[];errors=[];fields=0
for r in sorted(test,key=lambda r:r['session']['date_start']):
 s=r['session'];prediction=payload['races'][str(s['session_key'])];assert all(k in {p['session']['session_key'] for p in past[5:]} for k in prediction['training']['training_session_keys']);assert all(clock(a['end'])<clock(s['date_start']) for a in h)
 saved={d['driver_number']:d for d in prediction['drivers']};logits=[]
 scaler=model['classifier'].steps[0][1];reg=model['classifier'].steps[1][1]
 for d in r['records']['drivers']:
  vals=expected(d,s,h);out=saved[d['driver_number']]
  assert all(abs(a-out['features'][k])<1e-12 for a,k in zip(vals,keys));fields+=len(vals)
  logits.append(float(reg.intercept_[0])+sum(((x-scaler.mean_[j])/scaler.scale_[j])*reg.coef_[0,j] for j,x in enumerate(vals)))
 weights=[math.exp(z-max(logits)) for z in logits];prob=[x/sum(weights) for x in weights]
 for d,p in zip(r['records']['drivers'],prob):assert abs(p-saved[d['driver_number']]['win_probability'])<1e-12
 winner=next(i for i,a in enumerate(r['records']['drivers']) if next(x for x in r['records']['session_result'] if x['driver_number']==a['driver_number']).get('position')==1)
 loss.append(-math.log(prob[winner]));hits.append(int(prob[winner]==max(prob)))
 actual={a['driver_number']:a.get('position') for a in r['records']['session_result']};errors.append(sum(abs(d['predicted_rank']-actual[d['driver_number']]) for d in saved.values() if actual[d['driver_number']] is not None)/sum(v is not None for v in actual.values()))
 # Future/target outcomes are outside feature history: replace every unrevealed result.
 altered=copy.deepcopy(test)
 for future in altered:
  if clock(future['session']['date_start'])>=clock(s['date_start']):
   for a in future['records']['session_result']:a['position']=99;a['points']=999
 changed_history=[]
 for previous in sorted(past+altered,key=lambda x:x['session']['date_start']):
  if clock(previous['session']['date_end'])<clock(s['date_start']):append(previous,changed_history)
 for d in r['records']['drivers']:assert expected(d,s,h)==expected(d,s,changed_history)
 append(r,h)
assert abs(sum(loss)/24-payload['metrics']['model']['log_loss'])<1e-12
assert abs(sum(hits)/24-payload['metrics']['model']['top1_correct'])<1e-12
assert abs(sum(errors)/24-payload['metrics']['rank_mae'])<1e-12
evidence={'status':'PASS','independent_feature_values':fields,'races':24,'winner_hits':sum(hits),'log_loss':sum(loss)/24,'rank_mae':sum(errors)/24,'frozen_training_year':2024,'prediction_year':2025,'target_result_mutation':'training script tests target copy; verifier derives inputs solely from earlier history','participant_confirmation':'pending'}
(R/'independent-model-check.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf8');print(json.dumps(evidence))
