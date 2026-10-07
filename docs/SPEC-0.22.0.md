# 0.22.0 / F1 0.9.0 — 2024 training, 2025 retrospective predictions

## Requested outcome / 요청

Collect 2024 per-race records, train a model from them, and show 2025 GP predictions beside actual results. Preserve prior 2026 models, datasets and release evidence.

## Plan before execution / 실행 전 계획 (2026-10-08)

- Inputs: OpenF1 2024 race sessions, meetings, driver rosters and session_result; existing saved 2025 GP records.
- Primary experiment: fit the existing logistic winner model and ridge rank estimator on 2024 only, with the same fixed hyperparameters and first-five-GP feature warm-up. Freeze these weights for all 2025 predictions. Earlier completed 2025 results can update pre-race feature history only after their own prediction is made.
- Do not tune model parameters against the 2025 results. Keep the existing ten result-history metrics and fixed neutral priors. No target results, target lap telemetry, final championship standings or future races in features.
- Each training feature must reference only earlier completed races; each 2025 prediction must have its last source end strictly before target start. The 2024 training set and its fitted scaler must be unchanged throughout 2025.
- Predictions are retrospective estimates using recorded entrant metadata; this does not prove the entrant list was published before the race. Win scores normalized per race are experimental and uncalibrated.

## Expected checks / 事前期待値

1. Completed races have unique session/meeting joins and one recorded winner. Driver/result references and finite numeric labels are checked; failures are reported rather than filled with fake rows.
2. All training keys belong to 2024. No 2025 or 2026 target results are fitting inputs. All source-time cutoffs pass independently.
3. One prediction payload per collected 2025 GP, with finite positive probabilities summing to one and a unique displayed rank for each recorded entrant. Actual results stored separately.
4. Recalculate log loss, winner hit rate, rank error and simple baseline scores independently. These are measured experiment results, not promised accuracy.
5. Change target/future outcomes in a copied fixture: predictions before those outcomes must remain unchanged. A later race may change after earlier outcomes become known.
6. UI: 2025 catalogue → prediction/actual comparison; KO/EN numbers agree, archive result defaults remain, year navigation and current 2026 viewer continue to work. Missing lap/pit/replay data remains explicitly unavailable.
7. Preserve raw source caches outside the public repository; publish only reviewed result subsets, model evidence and sanitized provenance. Existing payloads stay unchanged.

## Execution evidence / 실행 근거

- Collected OpenF1: 24 race sessions, 24 meeting joins and 479 driver/result rows from 2024. Cache stored outside the repo; endpoint SHA-256 and retrieval timestamps in collection-evidence.json. Existing 2025 dataset provides 24 GPs / 479 entrants. Sprints are excluded.
- Fit 19 GPs / 380 entrant examples after the first five 2024 warm-up GPs. Logistic C=1 / max_iter=1000 and ridge alpha=10; weights and fitted scaler frozen for all 2025 targets. Earlier 2025 outcomes update historical features after prediction only. Runtime uses the existing workspace sklearn 1.9.1 installation.
- Inputs: last-five finishing score, points, win/podium/nonfinish rates; season-to-date finishing score; team last-five GP finishing score/win rate; earlier same-circuit finishing score/win rate. Neutral prior strength two. Literal historical team names are retained; renames and new drivers may receive partial neutral priors.
- Test: 24 GPs. Winner hit rate 7/24 (29.17%), log loss 1.88910, multiclass Brier 0.83928, displayed unique-order rank MAE 3.62891 places. Recent-win baseline: same 29.17% hit rate, log loss 2.16895, Brier 0.84201. Uniform baseline log loss 2.99360. No 2025 tuning; no claim of proven improvement beyond this season.
- Independent check reconstructed 4,790 feature values, checked frozen model coefficients/scaler against every saved probability, recalculated winner hits/log loss/rank error, and checked source cutoffs. Target-result mutation test passed. Separate future/target result mutation reconstructs earlier-history inputs and verifies invariance. This validates temporal result isolation; retrospective entrant publication timestamps remain unverified.
- Browser: 2024/2025/2026 cards (24/24/25), 2025 bilingual comparison values, driver links, prediction metric category and historical probability query passed. No document overflow at 390/768/1440 px. Current 2026 map/comparison hooks preserved, original five JSON blocks checked by release audit.
- UI shows final predicted versus actual order, not invented 2025 lap telemetry. Existing 2025 results and 2026 model outputs remain unchanged.
- Evidence: f1/release-0.9.0/{training-evidence.json,independent-model-check.json,browser-result.json}; model-2024.joblib and predictions-2025.json; previous canonical page and docs retained alongside source scripts.
- Participant confirmation pending. No GitHub push or public deployment performed in this task.
