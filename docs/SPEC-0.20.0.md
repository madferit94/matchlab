# 0.20.0 / F1 0.8.0 — Driver & team profiles

## Scope / 요구사항

- Four F1 navigation entries: Grands Prix, Drivers, Teams, Championship.
- Deep links #driver=normalized-name and #team=normalized-name, with browser back and language retention.
- 23 current-season participants (22 latest-race entrants plus one earlier participant), 11 teams.
- 22 official full-body/suit portraits and 11 official white team logos pixel-rendered in 64px canvas; face crop toggle in driver hero. Missing historic portrait is explicitly unavailable, not fabricated. Text labels remain accessible.
- Driver detail: current championship rank/points, next-GP expected rank, separately labelled season scenario, 2023–2025 final standings, current recorded-GP wins/podiums/mean classified rank/DNF rate/last-five mean points, race records and per-GP pace/pit/tyre metrics with definitions.
- Team detail: current championship/points, scenario, current roster, past standings, GP points history and driver result links. Team rebrands are not silently merged.

## Data / 자료 기준

OpenF1 championship_drivers and championship_teams queried at session 11731, the last completed GP in the current dataset (2026-10-04). Past seasons use each year's final Race session, and that session's driver metadata joins names across driver-number changes. Missing identity/standings are null, not zero or a claim of non-participation. Current driver and constructor totals both equal 1,796 points.

Raw endpoint payloads and metadata are preserved in f1/profiles/profile-data.json. Collection timestamp and source URLs are included. Official F1 drivers/teams listing pages provide image URLs. No new prediction model is trained.

## Projection semantics / 예상 순위 의미

Existing model expected_rank remains a next-GP metric. Season scenario adds 25/18/15/12/10/8/6/4/2/1 points to the current championship for each remaining GP after sorting its existing model expected ranks. Seven GPs, 101 points per GP. This is an illustrative conditional scenario, not a calibrated season forecast. Sprint points, retirements and roster changes are excluded and clearly stated. Equal projected totals share rank; FIA countback is not claimed. Current points already reflect the source's full championship total.

## UI / 표현

Ranking trend: reversed vertical rank axis with gaps for missing classifications. Team GP points: bars. Exact values remain available in tables. Driver/team portraits use nearest-neighbor CSS scaling after low-resolution canvas rendering; no substitute identity is generated. Korean/English and 390px mobile supported, wide tables scroll inside their panel.

## Verification / 검증

- check-data.cjs: coverage, unique numbers, driver/constructor total agreement, scenario point conservation, Max Verstappen number 1 (past) to 3 (current) name join, team aggregation, five original embedded data payloads unchanged.
- check-browser.cjs: all 22 current portraits and 11 logos load; directory search/team filter, driver-to-team links, suit/face switch, history window, metric bubbles, 34 championship rows, English and mobile, result-to-driver navigation.
- Saved browser screenshots in f1/profiles. Participant confirmation pending. External source availability can change after collection.

## Sources

- https://openf1.org/docs/
- https://www.formula1.com/en/drivers
- https://www.formula1.com/en/teams
