# 0.21.3 — Natural-language ordering / 자연어 정렬

## Scope / 범위
- Football AI and local analysis: explicit low/high ordering and reverse follow-ups.
- F1 saved-data analysis: low/high, fast/slow phrases and reverse follow-ups within the selected GP. No F1 AI API was added.
- 축구 AI·로컬 계산의 작은/큰 값 정렬, F1 낮은/높은·빠른/느린 순 및 같은 GP 내 반대 순서 조회.

## Cause and change / 원인과 수정
Football planner had no direction field and numeric ranking was descending only. Add validated asc/desc, preserve it in prior context, execute the selected order and display it with applied conditions. Explicit question direction is enforced by the server even if the model proposes the opposite. Legacy plans default to descending. Conflicting directions and context-free reversal are rejected.

F1 already supported ascending/descending keywords. Expand ordinary KO/EN phrases, distinguish slowest from lowest using word boundaries, retain the last successful plan within the mounted GP, and reject reversal across races. Keep unavailable values last. Time-series charts remain ordered by lap, not numeric value. Top-N reversal recalculates the ranking over the same eligible drivers rather than merely flipping the displayed subset.

축구는 정렬 방향 전달 항목 부재와 내림차순 고정이 원인이었습니다. F1은 일상 표현 해석과 후속 조건 보존을 보강했습니다. 데이터 원본·모델·확률은 변경하지 않았습니다.

## Verification / 검증
- `analysis/release-0.21.3/check-order.cjs`: 10 checks, real scores and speed values compared with independent raw-record arithmetic; both orders and reversal; mock planner intentionally returns the wrong direction to verify server enforcement.
- Existing analysis 15 checks and server 17 checks pass. F1 condition regression: 96 checks against the current embedded race and prediction records, including all bilingual metric labels, thresholds, lap ranges and pit exclusions.
- Browser KO/EN football, F1 ascending/reverse, 390/1440px overflow, and two live Gemini calls: see `analysis/release-0.21.3/browser-result.json`.
- Participants have not yet confirmed the screen. Public deployment not updated by this task.

## Preserved versions / 이전 버전 보존
Football v45 unchanged; new adopted v46 snapshots. Previous engine/server source saved under `analysis/release-0.21.3/`; F1 new source under `f1/release-0.8.5/` with release-0.7.1 preserved.
