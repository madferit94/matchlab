"""Frozen 2024 model, chronological 2025 retrospective evaluation."""
from pathlib import Path
import ast,json,hashlib,copy
ROOT=Path(__file__).resolve().parent
source=(ROOT.parent/'release-0.2.0/modeling/train.py').read_text(encoding='utf8')
nodes=[n for n in ast.parse(source).body if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef)) or isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id in {'ROOT','LABELS','FEATURES'} for t in n.targets)]
ns={'__file__':str(ROOT/'train-2025.py')};exec(compile(ast.Module(body=nodes,type_ignores=[]),'existing-model-declarations','exec'),ns)
np=ns['np'];features=ns['features'];append=ns['append_race'];keys=ns['FEATURES'];instant=ns['instant'];save=ns['save']
past=json.loads((ROOT/'history-2024.json').read_text(encoding='utf8'))['races']
targets=json.loads((ROOT.parent/'release-0.8.6/query-history.json').read_text(encoding='utf8'))['races']
past.sort(key=lambda r:r['session']['date_start']);targets.sort(key=lambda r:r['session']['date_start'])
assert len(past)==len(targets)==24
history=[];examples=[]
def rows_for(r,h):
 s=r['session']; ds=r['records']['drivers']; actual={x['driver_number']:x for x in r['records']['session_result']};rows=[]
 assert len(actual)==len(ds) and len(set(d['driver_number'] for d in ds))==len(ds)
 assert sum(x.get('position')==1 for x in actual.values())==1
 for d in ds:
  f,a=features(d,s,h);position=actual[d['driver_number']].get('position')
  assert a['latest_source_end'] is None or instant(a['latest_source_end'])<instant(s['date_start'])
  rows.append({'driver_number':d['driver_number'],'features':f,'audit':a,'win':int(position==1),'rank_score':(position-1)/(len(ds)-1) if position is not None else None})
 return rows
for i,r in enumerate(past):
 examples.append({'session_key':r['session']['session_key'],'rows':rows_for(r,history),'warmup':i<5});append(r,history)
train=[e for e in examples if not e['warmup']];clf,ranker=ns['fit'](train)
def predict(r,h):
 ds=r['records']['drivers'];fs=[features(d,r['session'],h) for d in ds]
 for f,a in fs:assert a['latest_source_end'] is None or instant(a['latest_source_end'])<instant(r['session']['date_start'])
 x=np.array([[f[k] for k in keys] for f,a in fs]);p=ns['probabilities'](clf,x);ranks=1+np.clip(ranker.predict(x),0,1)*(len(ds)-1)
 output=[{'driver_number':d['driver_number'],'name':d['full_name'],'team':d['team_name'],'team_colour':d.get('team_colour'),'win_probability':float(p[i]),'expected_rank':float(ranks[i]),'features':fs[i][0],'history':fs[i][1]} for i,d in enumerate(ds)]
 order=sorted(output,key=lambda d:(d['expected_rank'],-d['win_probability'],d['driver_number']))
 for i,d in enumerate(order):d['predicted_rank']=i+1
 return output,[d['driver_number'] for d in order]
outputs={};checks=[]
for r in targets:
 s=r['session'];pred,order=predict(r,history)
 # Metamorphic test: replacing the target results cannot change its prediction.
 altered=copy.deepcopy(r)
 for x in altered['records']['session_result']:x['position']=1;x['points']=999
 assert predict(altered,history)==(pred,order)
 actual=r['records']['session_result'];winner=next(x['driver_number'] for x in actual if x.get('position')==1)
 cutoff=max(p['session']['date_end'] for p in past)
 assert instant(cutoff)<instant(s['date_start'])
 checks.append({'session_key':s['session_key'],'training_latest_end':cutoff,'target_start':s['date_start'],'training_before_target':True,'feature_before_target':True,'target_result_mutation_invariant':True,'future_results_not_read':True})
 outputs[str(s['session_key'])]={'session_key':s['session_key'],'meeting_name':r['meeting']['meeting_name'],'target_start':s['date_start'],'drivers':pred,'predicted_order':order,'actual':{'drivers':actual,'winner_driver_number':winner},'training':{'training_races':len(train),'training_session_keys':[e['session_key'] for e in train],'training_latest_end':cutoff},'roster_assumption':'Retrospective target driver metadata; pre-race availability not independently verified'}
 append(r,history)
aggregate={};per=[]
for key,pred in outputs.items():
 ds=pred['drivers'];winner=pred['actual']['winner_driver_number'];actual={x['driver_number']:x for x in pred['actual']['drivers']};y=np.array([int(d['driver_number']==winner) for d in ds]);base=np.array([d['features']['recent5_win_rate'] for d in ds]);base/=base.sum();entry={'session_key':int(key)}
 for name,q in [('model',np.array([d['win_probability'] for d in ds])),('recent_win_baseline',base),('uniform',np.ones(len(ds))/len(ds))]:
  assert np.isfinite(q).all() and np.all(q>=0) and abs(float(q.sum())-1)<1e-10
  tied=np.isclose(q,q.max(),atol=1e-14,rtol=0);entry[name]={'log_loss':float(-np.log(q[y.argmax()])),'brier':float(np.sum((q-y)**2)),'top1_correct':float(1/tied.sum()) if tied[y.argmax()] else 0.}
 valid=[d for d in ds if actual[d['driver_number']].get('position') is not None]
 entry['rank_mae']=float(np.mean([abs(d['predicted_rank']-actual[d['driver_number']]['position']) for d in valid]));per.append(entry)
for name in ('model','recent_win_baseline','uniform'):aggregate[name]={k:float(np.mean([e[name][k] for e in per])) for k in ('log_loss','brier','top1_correct')}
aggregate['rank_mae']=float(np.mean([e['rank_mae'] for e in per]))
save(ROOT/'predictions-2025.json',{'version':'0.9.0','model_id':'f1-frozen-2024-logistic-2025-v01','feature_labels':ns['LABELS'],'races':outputs,'metrics':aggregate,'protocol':'2024 training (first five races warm-up), frozen parameters during 2025; historical features update only after completed earlier races','limitations':['Retrospective entrant metadata, not recorded live pre-race predictions','Uncalibrated scores normalized within race','Result history only; no qualifying, weather or lap pace inputs','No 2025 lap telemetry collected; comparison is final-order table only']})
save(ROOT/'training-evidence.json',{'train_races':len(train),'warmup_races':5,'test_races':len(outputs),'training_rows':sum(len(e['rows']) for e in train),'features':ns['LABELS'],'model_hyperparameters':{'C':1,'max_iter':1000,'ridge_alpha':10,'prior_strength':2},'source_sha256':hashlib.sha256(source.encode()).hexdigest(),'inputs_sha256':{str(p.name):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'history-2024.json',ROOT.parent/'release-0.8.6/query-history.json']},'checks':checks,'per_race_metrics':per,'aggregate':aggregate,'test_tuned':False})
ns['joblib'].dump({'classifier':clf,'ranker':ranker,'features':keys},ROOT/'model-2024.joblib')
print(json.dumps({'train_GP':len(train),'test_GP':len(outputs),'metrics':aggregate},indent=2))
