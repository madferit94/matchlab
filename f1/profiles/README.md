# F1 profiles / 드라이버·팀 프로필

`profiles.js` is embedded into the canonical f1/index.html. `profile-data.json` stores dated OpenF1 championship evidence and official image URLs. The current runtime makes no external analysis/API call for these screens; team logos are loaded from Formula 1; driver characters are drawn locally.

- Data collection: `python f1/profiles/collect.py` (network required; collected profile data is separate from original race data).
- Calculation check: `node f1/profiles/check-data.cjs`.
- Browser check: `node f1/profiles/check-browser.cjs` (Playwright and Microsoft Edge required; local site on port 8765).
- UI is tested with Korean/English and 390px layout. All 23 driver characters render without a remote portrait.
- Season outlook is a conditional scenario, not a calibrated championship model. See [SPEC](../../docs/SPEC-0.20.0.md).

미니 게임 캐릭터·레이싱복과 팀 로고, 현재/과거 챔피언십, GP별 기록 및 지표를 제공합니다. 선수 번호가 달라진 시즌은 이름으로 연결하고, 이름이 다른 팀의 전신 기록은 자동 합산하지 않습니다. 원본 다섯 데이터 블록은 변경하지 않습니다.

Character update: [0.20.1 spec](../../docs/SPEC-0.20.1.md). Hair/face accents and suit colour blocking are artistic simplifications, not exact likenesses or sponsor replicas.
