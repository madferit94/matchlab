# 0.21.5 / F1 0.8.7 — Browse past Grands Prix / 과거 GP 둘러보기

## Outcome / 결과

The F1 GP catalogue has a labelled season selector for 2026 and 2025. Selecting 2025 displays all 24 collected race cards; a card opens its own result detail. Direct `#race=9693` links resolve the historical Australian GP and select 2025 automatically. `?year=2025` opens the past-season catalogue and survives refresh.

F1 목록의 GP 시즌 선택에서 2025년 24개 GP를 직접 찾아볼 수 있습니다. 경기 카드 → 결과 상세 → 드라이버 지표/자연어 분석으로 이동하고, 목록으로 돌아와도 같은 연도가 유지됩니다.

## Data and availability / 데이터와 확보 범위

- Reuse the collected query-history payload; no new API data or model training in this release.
- Keep the original 2026 dataset and all five original F1 JSON blocks unchanged. A derived catalogue combines 25 current entries and 24 archived entries without mutating source objects.
- Historical result tables use saved driver/result joins: position, team, completed laps, gap, points and finish status. Name-based profile links retain existing behavior; unavailable profiles remain text.
- Historical default tab is race results. Available tabs are results, recorded result metrics and natural-language analysis. Uncollected replay/map/forecast/lap/pit/event panels are not offered as if ready.
- Archived metric categories show results; result fields without source data remain unavailable. Timing and pit counts are not fabricated.
- Natural-language analysis receives the combined catalogue, so explicit collected-year comparisons also work when starting from a 2025 detail.

## Navigation and accessibility / 이동과 접근성

- Visible `GP 시즌` / `GP season` label, native keyboard-accessible select and 44px minimum control height.
- Season preserved in query parameter; session key preserved in hash. Detail selects the correct season even if a URL has a mismatched year.
- Back button, reload, language toggle and status filter retain correct year. No-match filters display a clear empty state.
- Existing shared visual theme is retained. The new control wraps on narrow screens, and result tables scroll internally.
- UI guidance: ui-ux-pro-max navigation/deep-link search, with URLs reflecting selected state.

## Evidence / 검증

`f1/release-0.8.7/check-browser.cjs` checks the combined catalogue's source-object preservation and every archived GP lookup. Real Edge UI interactions cover 24-card listing, Australian winner/result, Norris points, metric help, 2025/2026 comparison, back/reload, direct link, English display, empty upcoming filter, 2026 map availability and 390/768/1440px layout. Results and screenshots are in this release folder. Participant screen confirmation is pending.

Previous F1 viewer is preserved as `f1/release-0.8.7/index-before.html`; prior release source/data remain unchanged. Canonical local viewer is updated. GitHub push and public deployment were not performed by this task.
