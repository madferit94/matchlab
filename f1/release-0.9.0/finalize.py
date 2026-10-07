from pathlib import Path
import json
R=Path(__file__).resolve().parent;P=R.parents[1]
for name in ['README.md','README.ko.md','CHANGELOG.md','VERSION','package.json','tools/check_release.py']:
 target=R/('before-'+name.replace('/','-'));assert not target.exists();target.write_bytes((P/name).read_bytes())
(P/'VERSION').write_text('0.22.0\n',encoding='utf8')
package=json.loads((P/'package.json').read_text(encoding='utf8'));package['version']='0.22.0';(P/'package.json').write_text(json.dumps(package,indent=2)+'\n',encoding='utf8')
for name,sentence in [('README.ko.md','F1은 2024·2025년 각각 24개 GP 기록을 조회할 수 있습니다. 2025년 예측은 2024년 19개 GP로 학습하고, 2025년 24개 GP에서 평가했습니다(첫 5개 GP는 이력 준비). 우승자 7/24 적중, 평균 순위 오차 3.63등이며 실험 예측입니다.'),('README.md','F1 includes 24 archived GPs each from 2024 and 2025. The 2025 experiment trains on 19 GPs from 2024 (five initial warm-up races), then evaluates 24 GPs from 2025: 7/24 winner hits and 3.63 mean rank error. These are retrospective experimental estimates.')]:
 text=(P/name).read_text(encoding='utf8');lines=text.splitlines();lines.insert(8,sentence);lines.insert(9,'');(P/name).write_text('\n'.join(lines)+'\n',encoding='utf8')
change='''## 0.22.0 / F1 0.9.0 — 2024 training → 2025 predictions

- Collect 24 OpenF1 2024 GPs; train on 19 after five warm-up races, freeze model weights and evaluate 24 GPs in 2025.
- 2024년 수집·학습, 2025년 예측/실제 비교·지표·자연어 조회. 기존 2026년 자료와 모델 보존.
- Winner hits 7/24; rank MAE 3.63. Independent feature/weight/metric checks and bilingual browser checks passed.
- [Specification / 명세](docs/SPEC-0.22.0.md). Local changes; not yet pushed or deployed.

'''
(P/'CHANGELOG.md').write_text(change+(P/'CHANGELOG.md').read_text(encoding='utf8'),encoding='utf8')
doc=P/'docs/README.md';doc.write_text(doc.read_text(encoding='utf8').replace('- [Past GP catalogue','- [2024 training / 2025 predictions · 학습·예측](SPEC-0.22.0.md)\n- [Past GP catalogue',1),encoding='utf8')
spec=P/'docs/SPEC-0.22.0.md';text=spec.read_text(encoding='utf8').replace('Pending collection, training, independent verification and browser checks. Participant confirmation pending. No external publication requested by this task.','''- Collected OpenF1: 24 race sessions, 24 meeting joins and 479 driver/result rows from 2024. Cache stored outside the repo; endpoint SHA-256 and retrieval timestamps in collection-evidence.json. Existing 2025 dataset provides 24 GPs / 479 entrants. Sprints are excluded.
- Fit 19 GPs / 380 entrant examples after the first five 2024 warm-up GPs. Logistic C=1 / max_iter=1000 and ridge alpha=10; weights and fitted scaler frozen for all 2025 targets. Earlier 2025 outcomes update historical features after prediction only. Runtime uses the existing workspace sklearn 1.9.1 installation.
- Inputs: last-five finishing score, points, win/podium/nonfinish rates; season-to-date finishing score; team last-five GP finishing score/win rate; earlier same-circuit finishing score/win rate. Neutral prior strength two. Literal historical team names are retained; renames and new drivers may receive partial neutral priors.
- Test: 24 GPs. Winner hit rate 7/24 (29.17%), log loss 1.88910, multiclass Brier 0.83928, displayed unique-order rank MAE 3.62891 places. Recent-win baseline: same 29.17% hit rate, log loss 2.16895, Brier 0.84201. Uniform baseline log loss 2.99360. No 2025 tuning; no claim of proven improvement beyond this season.
- Independent check reconstructed 4,790 feature values, checked frozen model coefficients/scaler against every saved probability, recalculated winner hits/log loss/rank error, and checked source cutoffs. Target-result mutation test passed. Separate future/target result mutation reconstructs earlier-history inputs and verifies invariance. This validates temporal result isolation; retrospective entrant publication timestamps remain unverified.
- Browser: 2024/2025/2026 cards (24/24/25), 2025 bilingual comparison values, driver links, prediction metric category and historical probability query passed. No document overflow at 390/768/1440 px. Current 2026 map/comparison hooks preserved, original five JSON blocks checked by release audit.
- UI shows final predicted versus actual order, not invented 2025 lap telemetry. Existing 2025 results and 2026 model outputs remain unchanged.
- Evidence: f1/release-0.9.0/{training-evidence.json,independent-model-check.json,browser-result.json}; model-2024.joblib and predictions-2025.json; previous canonical page and docs retained alongside source scripts.
- Participant confirmation pending. No GitHub push or public deployment performed in this task.''')
spec.write_text(text,encoding='utf8')
audit=P/'tools/check_release.py';text=audit.read_text(encoding='utf8').replace('0.21.5','0.22.0').replace("p/'f1/release-0.8.7'/source","p/'f1/release-0.9.0'/source if source=='archive-catalog.js' else p/'f1/release-0.8.7'/source")
# Parenthesize the conditional path before read_text.
text=text.replace("(p/'f1/release-0.9.0'/source if source=='archive-catalog.js' else p/'f1/release-0.8.7'/source)","(p/('f1/release-0.9.0' if source=='archive-catalog.js' else 'f1/release-0.8.7')/source)")
text=text.replace("(p/'f1/release-0.8.6'/source).read_text","(p/('f1/release-0.9.0' if source=='history-analysis.js' else 'f1/release-0.8.6')/source).read_text")
audit.write_text(text,encoding='utf8');print('Updated bilingual documentation and release 0.22.0')
