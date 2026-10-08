/* Historical evaluation is distinct from forecasts for upcoming matches. */
(()=>{'use strict';
 const data=JSON.parse(document.getElementById('football-odds-data').textContent);
 const records=new Map(data.records.map(r=>[r.match_key,r]));
 const en=document.documentElement.lang==='en';
 const text=(ko,english)=>en?english:ko;
 const el=(tag,content,cls)=>{const e=document.createElement(tag);if(content)e.textContent=content;if(cls)e.className=cls;return e;};
 function addHistorical(){
  document.getElementById('football-odds-review')?.remove();
  if(V!=='matchdetail'||!completedSelection)return;
  const m=completedSelection,r=records.get(m.id),host=document.getElementById('matchdetail');
  const panel=el('article',null,'panel odds-review');panel.id='football-odds-review';
  panel.append(el('h2',text('지표 + 배당 예측 비교','Stats + odds prediction comparison')));
  if(!r){panel.append(el('p',text('이 경기는 학습에 사용했거나 검증에서 보류되어 비교 예측을 표시하지 않습니다.','This match was used for training or held for review. Evaluation predictions are not shown.')));host.append(panel);return;}
  const probs=['stats_plus_odds','stats_only','odds_only','market_probability'];
  const valid=probs.every(k=>Array.isArray(r[k])&&r[k].length===3&&r[k].every(p=>Number.isFinite(p)&&p>=0&&p<=1)&&Math.abs(r[k].reduce((a,b)=>a+b,0)-1)<1e-8);
  if(!valid||r.home_team_key!==m.home||r.away_team_key!==m.away||r.date!==m.date||r.league!==m.league||r.season!==m.season||r.date<=r.parameter_training_last_date){panel.append(el('p',text('경기·확률 검증에 실패해 표시를 보류합니다.','Match or probability validation failed. Display withheld.')));host.append(panel);return;}
  panel.append(el('p',text('과거 검증 · 경기 직전 마감 배당을 사용한 실험입니다.','Historical evaluation · an experiment using pre-kickoff closing odds.'),'odds-fineprint'));
  const tabs=el('div',null,'odds-tabs'),values=el('div',null,'odds-probabilities');values.setAttribute('aria-live','polite');
  const choices=[['stats_plus_odds',text('지표 + 배당','Stats + odds')],['stats_only',text('지표만','Stats only')],['odds_only',text('배당만 학습','Odds model')],['market_probability',text('시장 확률','Market probability')]];
  const buttons=[];
  function choose(key){buttons.forEach(([k,b])=>b.setAttribute('aria-pressed',String(k===key)));values.replaceChildren();r[key].forEach((p,i)=>{const card=el('div');card.append(el('span',[text('홈승','Home win'),text('무승부','Draw'),text('원정승','Away win')][i]),el('strong',(p*100).toFixed(1)+'%'));const bar=el('progress');bar.max=1;bar.value=p;bar.setAttribute('aria-label',[text('홈승 확률','Home win probability'),text('무승부 확률','Draw probability'),text('원정승 확률','Away win probability')][i]);card.append(bar);values.append(card);});}
  choices.forEach(([key,label])=>{const b=el('button',label);b.type='button';b.addEventListener('click',()=>choose(key));buttons.push([key,b]);tabs.append(b);});
  panel.append(tabs,values,el('p',text('실제 결과: ','Actual result: ')+T[m.home].name+' '+m.hg+' : '+m.ag+' '+T[m.away].name));
  const details=el('details');details.append(el('summary',text('배당·사용 지표·검증 결과','Odds, inputs and validation')));
  details.append(el('p',text('Bet365 마감 배당 · 홈승 / 무승부 / 원정승: ','Bet365 closing odds · home / draw / away: ')+r.closing_odds.map(n=>n.toFixed(2)).join(' / ')));
  details.append(el('p',text('최근 5경기·시즌 기록 111개에 배당 확률 3개를 더해 총 114개 입력을 사용했습니다. 2023/24·2024/25의 1,518경기로 학습했습니다.','114 inputs: 111 recent-five/season statistics plus three odds probabilities. Trained on 1,518 matches from 2023/24 and 2024/25.')));
  details.append(el('p',text('2025/26 정확도: 지표만 48.2% · 지표+배당 50.0% · 배당만 학습 52.1%. 배당을 결합했지만 배당 단독 모델을 넘지는 못했습니다.','2025/26 accuracy: stats 48.2% · stats + odds 50.0% · odds model 52.1%. The combined model did not outperform the odds-only model.')));
  details.append(el('p',text('배당 관측 시각은 미확인입니다. 과거 결과를 재평가한 수치이며, 24시간 전 예측이나 미래 성능을 보장하지 않습니다.','Individual odds observation timestamps are unverified. These are retrospective results, not 24-hour-ahead or prospective performance.'),'odds-fineprint'));
  panel.append(details);host.append(panel);choose('stats_plus_odds');
 }
 function addUpcoming(){
  document.getElementById('football-odds-fallback')?.remove();
  if(V!=='matches'||!selected)return;
  const host=document.getElementById('prediction-simulation-v22');if(!host)return;
  const note=el('p',text('이 예정 경기의 배당은 아직 없어 기존 지표 모델로 예측합니다.','Odds are not available for this upcoming match. The existing stats model is used.'),'odds-fallback');note.id='football-odds-fallback';host.prepend(note);
 }
 const previous=render;render=function(){previous();addHistorical();addUpcoming();};
 const previousMatches=renderMatches;renderMatches=function(){previousMatches();addUpcoming();};
 addHistorical();addUpcoming();
})();
