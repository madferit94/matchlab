# 0.21.4 / F1 0.8.6 — Historical GP queries / 과거 GP 조회

## User outcome / 사용자 결과

Ask “해당 그랑프리 작년 기록도 보여줘” in the F1 analysis tab to display the collected 2025 race result. Ask for driver points or positions across last year and this year to compare year sections. Supported KO/EN queries use saved records without an AI API call.

F1 자연어 분석창에 수집한 2025년 24개 GP 결과를 연결했습니다. 순위·포인트·완료 랩·완주 상태를 조회하고 연도별로 비교합니다. 작년/재작년은 선택한 경기 연도를 기준으로 해석합니다.

## Data and matching / 데이터 및 연결 기준

- Previously collected 2025 driver rosters and session_result records are unchanged; verify hashes in `f1/release-0.8.6/saved-record-hashes.json`.
- Query metadata comes from OpenF1 `meetings?year=2025`; all 24 session/meeting keys and circuit keys agree. Provenance: `source-evidence.json`.
- Match the same GP by meeting name; same-circuit requests use circuit_key. The existing Bahrain event and Sepang venue distinction is retained. Barcelona/Spanish GP at circuit 15 uses an explicit rename alias, not a country-only join.
- Driver language aliases resolve by driver name, not car number. Norris #4 in 2025 and #1 in 2026 remain the same person; Verstappen #1/#3 is kept separate.
- Historical race results are available for 2025. Collected 2023/2024 championship profiles are not per-GP records and are not used to fabricate them.
- Historical lap/pit/stint/grid and pre-race model inputs in this archive are unavailable. Missing years or metric endpoints are explicitly reported. No zero fill, interpolation or extrapolation.
- A comparison can show available years and separately report unavailable years. All prior current-race numeric filters, ranking and lap charts remain supported.

## Interaction / 화면 동작

- Overview results show a table; numeric requests use existing metric-specific cards/charts per year.
- Each year shows actual GP name, race date and circuit.
- Reverse ordering retains the selected historical years and metrics. It re-ranks eligible drivers in each year.
- Mobile result tables scroll internally; the page does not grow wider.
- Named-driver requests must resolve against the selected year's roster. An unrecognized driver condition is refused rather than silently ignored.

## Verification / 검증

- 12 history contract tests: raw record hashes, Korean/English scope, driver identity changes, independent points joins, GP/circuit separation, renamed GP, missing data, unavailable year, reverse conditions and unsupported filters.
- 96 existing condition regressions pass against the new core module and current embedded records.
- Headless Edge: actual textarea submissions in Korean/English, past overview, year comparison, missing timing/year, moved GP, renamed GP, reverse ordering, and 390/768/1440px page overflow checks.
- Original five F1 JSON payloads are compared with the preserved previous viewer; no model or source football data was changed.
- Evidence remains in `f1/release-0.8.6/`. Participant confirmation is pending. Public GitHub/deployment is not changed by this task.

## Preserved versions / 이전 버전 보존

`release-0.8.5/` remains unchanged. `release-0.8.6/index-before.html` preserves the prior F1 viewer. New modular sources, data, hashes and checks are saved under `release-0.8.6/`.
