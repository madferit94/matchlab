# MatchLab 0.20.1 / F1 0.8.1 — Mini driver characters

## Request / 요청
Compact game characters with team clothing and driver-specific visual accents. Push and merge after verification.

## Implementation / 구현
- Local 32×40 canvas sprites; list 96×120, profile 128×160; crisp nearest-neighbour scaling.
- 23 individual hair/skin/style palettes: curls, swept hair, braids, facial hair and moustache. Artistic simplifications, not biometric reproductions.
- 11 team suit palettes, shoulder/side trim and contrasting number badges; not exact sponsor replicas.
- Full-character/face toggle, accessible labels, Korean/English controls, existing team logos.
- No driver portrait network dependency. Championship, forecasts, race data and calculations unchanged.

## Verification / 검증
Browser checks: 23 distinct sprites, filters, face toggle, 8 metrics/help, team links, 11 logos, 34 standings rows, English routes, mobile containment and GP links.
Data checks: five original embedded JSON blocks unchanged; points/history and rank-motion regression.
Screenshots: f1/profiles/characters-0.20.1-*.png. Release audit/build evidence in root workshop journal.
Participant confirmation pending / 참가자 화면 확인 전.
