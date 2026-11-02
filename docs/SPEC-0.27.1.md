# 0.27.1 · 2026-09-20 이후 5경기 xG 추가 (Internet Archive에 남은 Understat 사본)

## 요청과 범위
- 0.27.0은 2026-09-21 ~ 2026-10-26의 60경기(EPL 30, 라리가 30)를 football-data.co.uk 결과로 '완료'로 옮겼고, xG(`hx`·`ax`)는 `null`이었다.
- understat.com은 지금 어디서도 열리지 않는다(이름 서버 beget.ru가 Google·Cloudflare DNS에도 응답하지 않음, 2026-11-02 확인).
- Internet Archive(web.archive.org)에는 그 60경기 중 **5경기(모두 EPL)**의 Understat 자료 사본이 남아 있다. 이번 작업은 그 5경기에만 xG를 넣는다. 나머지 55경기는 `null` 그대로다.
- 그 밖의 자료는 바꾸지 않는다. 저장된 예측 641개(`data/football/predictions.js`)는 바이트까지 같다. 모델·예측 입력 기준일(2026-09-20)도 그대로다.
- push까지만 한다. PR·병합·배포는 하지 않는다.

## 출처
- 보관본 주소 형식: `https://web.archive.org/web/<시각>id_/<원래 주소>`(`id_`는 보관 당시 원본 바이트 그대로). 응답이 gzip이면(앞 2바이트 `1f 8b`) 풀어서 쓴다. 지문(sha256)은 푼 바이트 기준이다.

| 경기 | 날짜 | 원래 주소 | 보관 시각(UTC) | 방법 |
|---|---|---|---|---|
| understat:31232 Chelsea 5-1 Bournemouth | 2026-10-10 | `https://understat.com/getMatchData/31232` | 2026-10-10 20:43:30 | `shot_sum` |
| understat:31233 Ipswich 2-1 Fulham | 2026-10-10 | `https://understat.com/getMatchData/31233` | 2026-10-10 17:54:40 | `shot_sum` |
| understat:31239 Coventry 4-1 Newcastle United | 2026-10-12 | `https://understat.com/getMatchData/31239` | 2026-10-17 13:55:51 | `shot_sum` |
| understat:31249 Tottenham 3-1 Coventry | 2026-10-19 | `https://understat.com/match/31249` | 2026-10-25 16:14:37 | `match_info` |
| understat:31256 Manchester United 0-3 Bournemouth | 2026-10-25 | `https://understat.com/match/31256` | 2026-10-25 16:15:31 | `match_info` |

## 방법
- `match_info`: 경기 페이지(HTML) 안 `var match_info = JSON.parse('...')`(\x 이스케이프)를 풀어 `h_xg`·`a_xg` 문자열을 그대로 숫자로 쓴다. 기존 Understat 경기와 같은 경기 xG 값이다.
- `shot_sum`: `getMatchData` JSON에는 경기 xG(`match_info`)가 없고 슈팅 목록만 있다. 홈 xG = `shots.h[].xG`의 합, 원정 xG = `shots.a[].xG`의 합(보관본 순서대로 더함), 소수 6자리로 반올림한다.
- **주의(문서화)**: 슈팅 합계가 Understat 경기 xG와 늘 같지는 않다. 이미 저장된 2026/27 라리가 5경기(getMatchData 보관본, 2026-09-20 무렵)로 비교하면 차이는 최대 0.0143이다.

| 경기 | 저장된 경기 xG (홈 / 원정) | 슈팅 합계 (홈 / 원정) | 차이 |
|---|---|---|---|
| 30823 Real Betis–Getafe | 2.60912 / 0.327032 | 2.609445 / 0.327032 | +0.000325 / 0 |
| 30829 Rayo Vallecano–Espanyol | 1.8328 / 1.1573 | 1.832799 / 1.157297 | −0.000001 / −0.000003 |
| 30831 Atletico Madrid–Real Madrid | 2.40619 / 0.420774 | 2.419626 / 0.420774 | +0.013436 / 0 |
| 30832 Celta Vigo–Racing Santander | 2.2295 / 0.719901 | 2.229499 / 0.719901 | −0.000001 / 0 |
| 30836 Osasuna–Rayo Vallecano | 0.926414 / 1.35649 | 0.926414 / 1.370773 | 0 / +0.014283 |

  그래서 `shot_sum` 값은 화면에 "슈팅 합계" / "shot sum"으로 따로 표시한다.

## 증거 파일과 규칙
- `tools/football_refresh/0.27.1/archive-xg.json`: 경기마다 보관 주소·원래 주소·보관 시각·바이트 수·sha256(푼 바이트)·방법·`hx`·`ax`, 보관본의 경기 날짜·팀 이름·점수, 슈팅 수(보관본 vs football-data `HS`/`AS`).
  - `shot_sum`: 양쪽 슈팅별 xG 문자열 목록(`shot_xg.h`, `shot_xg.a`). 원본 없이 합계를 다시 계산할 수 있다.
  - `match_info`: 원문 `h_xg`·`a_xg` 문자열.
- 적용 규칙(Python `apply_archive_xg`, JS `applyArchiveXg`가 매번 같은 규칙으로 확인):
  - 경기 id는 `refresh.json` 결과 안에 있어야 하고, 한 번만 나온다. 적용 전 그 경기의 `hx`·`ax`는 `null`, 출처는 football-data.co.uk여야 한다.
  - 보관 주소 = `https://web.archive.org/web/<보관 시각>id_/<원래 주소>`, 원래 주소는 방법에 맞는 형식이고 경기 번호가 id와 같아야 한다.
  - 보관본 날짜·점수가 `refresh.json` 결과와 같아야 하고, 팀 이름이 저장된 팀 이름과 같아야 한다. football-data 슈팅 수는 `refresh.json`과 같아야 한다. 보관본 슈팅 수는 기록만 하고 달라도 실패시키지 않는다(제공처마다 셀 수 있음). 이번 5경기는 모두 같다.
  - `hx`·`ax`는 0 이상 유한한 숫자. `match_info`는 `hx = 숫자(h_xg)`, `shot_sum`은 `hx = 소수 6자리(슈팅 xG 합)`가 정확히 맞아야 한다.
- 적용 결과: 5경기 행의 `hx`·`ax`에 값이 들어가고, 끝에 `xg_source`(보관 주소)와 `xg_method`(`match_info`/`shot_sum`)가 붙는다. 다른 키·경기·`refresh` 요약은 그대로다.

## 명령 (저장소 루트, Python 표준 라이브러리만)
```sh
python3 -I tools/football_refresh/refresh.py fetch-xg  --raw <저장소 밖 폴더>   # 보관본 5개 내려받기(gzip 풀기)
python3 -I tools/football_refresh/refresh.py build-xg  --raw <같은 폴더>         # archive-xg.json 만들기
python3 -I tools/football_refresh/refresh.py verify-xg --raw <저장소 밖 폴더>   # 다시 내려받아 지문·값이 증거 파일과 같은지
python3 -I tools/football_refresh/refresh.py check-xg                           # 원본 없이: 증거 파일 규칙과 합계 재계산
python3 -I tools/football_refresh/refresh.py apply                              # 자료 파일 2개 = apply(v50, refresh.json, archive-xg.json)
python3 -I tools/football_refresh/refresh.py check
python3 -I design/release-0.27.1/build_pages.py                                 # 화면 2개 + page-patch.json
```

## 화면 (한영, 로직 같음)
- 머리글: "2026-09-20 이후 경기 결과: football-data.co.uk · xG는 60경기 중 5경기만 (Understat의 Internet Archive 사본)" / "results after 2026-09-20: football-data.co.uk · xG for 5 of 60 matches only (Internet Archive copies of Understat)". 숫자는 자료에서 센다.
- 끝난 경기 표(카드): xG가 있는 경기는 실제 결과 칸에 "xG 1.38 : 1.68"을, `shot_sum`이면 " · 슈팅 합계" / " · shot sum"을 붙인다.
- 경기 분석실: 기존 xG 칸(홈·원정)이 값을 보여 준다. 경기 기록 패널 안내를 경기별로 맞춘다. xG가 있으면 출처(Internet Archive 사본, 보관 시각)와 방법, `shot_sum`의 주의 문구를 보여 주고, 없으면 기존처럼 "xG 없음"을 표시한다.
- 이번 시즌 xG 질문 안내: "2026-09-20 이후 60경기 중 55경기는 xG가 없어서, 그 경기가 들어간 합계·평균은 —로 표시합니다. xG가 있는 5경기만 고르면 값이 나옵니다."
- 프리뷰 xG 그래프 안내: "xG 자료가 없는 경기(2026-09-20 이후 결과 대부분)는 점을 표시하지 않습니다."

## hx·ax 사용처 점검 (5/60 일부만 있는 경우)
점검 기준: xG 없는 경기를 0으로 세거나, xG 합을 xG 없는 경기까지 포함한 경기 수로 나누거나, NaN이 나오지 않아야 한다.

| 위치 | 처리 | 결과 |
|---|---|---|
| `calc()`(팀 화면·프리뷰 합계) | xG 있는 경기 수 `nx`가 경기 수 `n`보다 작으면 `xg`·`xga`를 `null` | 일부만 있으면 "—", 평균이 틀리지 않음 |
| 프리뷰 "경기당 기대 득점" | `xg!==null`일 때만 `xg/n` | 같음 |
| 프리뷰 xG 흐름 그래프 | 축 최대값·선·점 모두 `hasXg` 경기만, 위치는 원래 경기 순서 | 5경기는 점이 생기고 나머지는 빈칸 |
| `rows()`·`historyRows()`·`overviewRecent()` 표 | `xgText()` | 값 또는 "—" |
| `teamOverview()` 막대 | `s.xg===null`이면 "—"와 0 폭 | 같음 |
| `teamOverview()`의 `trendMax`·`line` | 계산만 하고 화면에 쓰지 않는 코드(v50부터). `null`은 0으로 계산돼 NaN 없음 | 변경 없음 |
| `updateTeam()` 시즌 카드·표 | `xg!==null`일 때만 평균 | 같음 |
| `renderCompletedMatch()` | `xgText(m.hx)`·`xgText(m.ax)` | 5경기는 값 표시 |
| 팀 지표 그래프(`buildPlan` xg_for/xg_against, `chartSvg`) | `finite()`로 `null`, 선은 `null`에서 끊김, 표는 "자료 없음" | 중간에 빈 경기가 있어도 NaN 없음 |
| 분석 엔진 `summary()`(화면·서버 공용 `analysis/record-engine.cjs`) | `nx<n`이면 `null`, 순위에서 `null`은 맨 뒤 | 섞인 선택은 "—", 5경기만 고르면 값 |
| 분석 엔진 `trend` | 경기별 `Number.isFinite`가 아니면 `null` | 5경기는 값 |
| 서버(`server/gemini.cjs`) | 질문을 계획으로만 바꾸고 숫자는 위 엔진이 계산 | 변경 없음 |
| 시뮬레이션·경기 전 보고서·배당 모델 | 저장된 예측과 2026-09-20 이전 자료만 사용, `hx`를 읽지 않음 | 변경 없음 |

고친 것: 화면 문구 3곳(머리글, 경기 기록 안내, 이번 시즌 xG 질문 안내)과 프리뷰 그래프 안내 1곳. 계산 코드는 0.27.0에서 이미 일부 결측을 `null`로 처리하고 있어 바꾸지 않았다.

## 검사
- `tools/check_release.py`: RELEASE 0.27.1. 자료 파일 = `apply(v50, refresh.json, archive-xg.json)` 바이트 비교. 화면은 0.27.1 블록·수정을 0.27.0 상태로 되돌린 뒤 기존 0.27.0 되돌리기와 v50 비교를 그대로 한다. manifest `result_refresh.xg_after_previous_last_date`는 `{count: 5, source, methods, evidence}`.
- `server/check.cjs`, `analysis/check.cjs`: 같은 적용 경로, 5경기 값과 나머지 55경기 `null`, 일부만 있는 선택의 `null`, 5경기만 고른 질문의 값.
- 브라우저: 한영 × 390px·데스크톱. NaN 없음, 가로 넘침 없음, 콘솔 오류 없음, 5경기 xG 표시.

## 실행 결과 (2026-11-02)
- 넣은 값(`hx` / `ax`):

| 경기 | 방법 | hx | ax | 슈팅 수 보관본 / football-data |
|---|---|---:|---:|---|
| 31232 Chelsea 5-1 Bournemouth | shot_sum | 1.375904 | 1.677447 | 10·9 / 10·9 |
| 31233 Ipswich 2-1 Fulham | shot_sum | 1.259182 | 1.778564 | 11·13 / 11·13 |
| 31239 Coventry 4-1 Newcastle United | shot_sum | 1.664928 | 2.222626 | 9·19 / 9·19 |
| 31249 Tottenham 3-1 Coventry | match_info | 0.971825 | 1.1439 | 16·12 / 16·12 |
| 31256 Manchester United 0-3 Bournemouth | match_info | 0.84372 | 2.56254 | 17·10 / 17·10 |

- 5경기 모두 보관본 날짜·점수·팀 이름이 `refresh.json`·저장된 팀과 같고, 슈팅 수도 football-data와 같다.
- `verify-xg`로 보관본 5개를 다시 내려받아 바이트 수·sha256·값이 증거 파일과 같음을 확인했다. 미리 받아 둔 사본(사용자 작업 폴더)의 sha256과도 같다.
- 크기(바이트, 원본 / gzip-6 `gzip -6 -n`):

| 파일 | 0.27.0 | 0.27.1 |
|---|---:|---:|
| index.html | 195,328 / 59,710 | 196,731 / 60,260 |
| index.en.html | 194,362 / 59,100 | 195,710 / 59,623 |
| data.ko.js | 1,828,328 / 243,679 | 1,828,974 / 243,944 |
| data.en.js | 1,827,454 / 243,423 | 1,828,100 / 243,691 |
| predictions.js | 2,132,671 | 변경 없음(바이트 동일) |

### 검사
- `npm run test:server` 25개 PASS(증거 파일 변조 13가지 거부 검사 1개 추가), `node analysis/check.cjs` 19개 PASS(일부 xG 검사 1개 추가), `npm run test:report` PASS, `npm run test:odds` PASS(877경기), `python3 -I design/release-0.26.1/compact_predictions.py --check` PASS.
- `refresh.py check`·`check-xg`·`verify-xg` PASS, `python3 -I design/release-0.27.1/build_pages.py --check` PASS, `python3 -I tools/check_release.py` PASS(manifest 갱신 후).
- 같은 변조 13가지와 "두 번 적용"을 Python 규칙에도 넣어 보았고 모두 거부됐다(유니코드 숫자 문자열도 거부).
- 브라우저: Playwright 1.57.0(Chromium headless), `PORT=8831 node server/gemini.cjs`, 한영 × 390·1440px. 실패 0(`design/release-0.27.1/browser-result.json`, 스크립트 `browser-check.cjs`).
  - 머리글 "xG는 60경기 중 5경기만" / "xG for 5 of 60 matches only".
  - EPL 끝난 경기 표 30행 중 5행에 xG, 그중 3행에 "슈팅 합계" / "shot sum". 나머지 25행은 "—". 390px에서는 카드("xG (홈 : 원정)" 줄)로 보인다.
  - 경기 분석실 5경기 xG 값과 출처·방법 안내·보관본 링크. xG 없는 Arsenal–Leeds는 "—"와 기존 안내.
  - Bournemouth 팀 화면, Bournemouth–Leeds 프리뷰(그래프 점 6개, 고친 안내 문구), "맨유 최근 1경기 기대 득점" 0.84와 고친 안내.
  - NaN·undefined·Infinity 글자 없음, SVG 안 NaN 없음, 가로 넘침 없음, 콘솔 오류 0, 영어 화면에 한글 없음.

## 참고
- `design/release-0.27.0/build_pages.py --check`는 이제 실패한다(0.27.0 화면을 다시 만드는 스크립트라서). 0.27.0 규칙(`page-patch.json`)은 `check_release.py`가 계속 대조한다.
- 나머지 55경기 xG는 Understat에 다시 접속할 수 있거나 다른 보관본이 생기면 같은 방식으로 넣을 수 있다.

## 독립 검증 반영 (validation-report.json, f40bdf8 이후)
- **R1 이어 묻기에서 비교 방식이 따라오는 문제**(0.27.1 전부터 있던 문제, 이번 xG로 틀린 숫자가 보이게 됨)
  - 원인: `analysis/record-engine.cjs`의 `parse()`가 "최근"·"시즌"만 있어도 이어 묻기로 보고 앞 질문의 "실제 득점 비교"(compareGoals)를 그대로 가져갔다. 그러면 도구가 경기별 추이(trend)로 고정되고, 추이는 질문한 지표와 상관없이 늘 기대 득점을 그렸다.
  - 재현: "토트넘 최근 5경기 기대 득점과 실제 득점 비교" → "맨유 최근 1경기 기대 실점"이 맨유 기대 득점 0.84를 "기대 실점"으로 표시(맞는 값 2.56) → "EPL 이번 시즌 기대 득점 순위"가 순위 대신 같은 맨유 그래프를 표시.
  - 고침:
    - (재검증 2에서 고침) 이어 묻기 판단은 main과 같다. 이어 묻기는 새 질문이 적지 않은 앞 조건(구단·시즌·지표·기간·비교 방식)을 그대로 둔다. 처음 고친 방식은 "최근·시즌"이 있어도 구단이나 지표를 적으면 새 질문으로 봐서 앞 조건이 모두 사라졌다(RC2-1).
    - 비교 방식은 순위를 묻거나 다른 지표를 적은 이어 묻기에서만 풀린다. 구단만 바꾸면 비교가 이어진다("리버풀로 바꿔" / "change to Liverpool", RC2-2).
    - "기대 실점으로 바꿔" / "change to xGA"처럼 바꾸는 말과 xG·xGA를 함께 적으면 비교하는 지표가 바뀐다. (재검증 3, RC3-1) "다시 기대 득점" / "xG again" / "back to xG"도 같다. 이를 위해 이어 묻기 말에 "back to"를 더했다.
    - 비교가 이미 풀린 뒤(예: "최근 5경기 실점")의 "다시 기대 득점"은 기대 득점만 답한다(main은 실점 질문에도 xG 그래프를 보여 주던 R1 증상).
    - "맨유 최근 1경기 기대 실점"처럼 실제 득점 비교 없이 지표만 적으면 그 지표만 답한다(2.56).
    - 비교가 아니게 되면 도구도 추이에서 팀(또는 비교)으로 돌아간다. 홈·원정 비교와 순위 질문은 추이로 바뀌지 않는다.
    - "EPL 이번 시즌 기대 득점 순위"는 순위로 답하고, 앞 질문의 기간(예: 최근 1경기)을 유지한다. 기간을 지우는 말은 main과 같이 "시즌 전체"다.
    - 리뷰어 비교 스크립트(main vs 브랜치 71개 질문) 결과, 차이 14개는 모두 의도한 변경이다: 한국어 구단 이름(R7) 5개, 팀 없음 1개, 기대 실점 비교·추이(R1) 5개, R1 순서 3개.
    - 추이는 질문한 지표를 그린다. 기대 실점이면 기대 실점과 실제 실점이다("기대 실점과 실제 실점 비교" / "compare goals conceded and xGA"). 화면 제목·범례·표 머리글은 "기대 실점 / 실제 실점" / "Expected goals against / Goals conceded"이다. 서버 계획 검사(`server/gemini.cjs`)도 xGA 추이를 받는다.
    - 한영 엔진은 같은 파일(`analysis/record-engine.cjs`)이고, 영어 화면에는 한글만 \u 이스케이프로 들어간다.
  - 검사: `analysis/check.cjs`에 이 순서(한국어·영어), 이어 묻기 유지, RC2-1(리버풀 2024/25 승점 → 최근 10경기 기대 득점 = 25.32, → 맨시티 최근 5경기 = 2024/25 승점 13, 토트넘 승률 → 작년 시즌 아스널 = 승률), RC2-2(리버풀로 바꿔·change to Liverpool = 비교 유지, 기대 실점으로 바꿔·change to xGA = 기대 실점과 실제 실점), RC3-1(다시 기대 득점·기대 득점으로 바꿔·back to xG·xG again = 비교 유지, 지표만 xG로), xGA 추이 값을 넣었다. 브라우저 검사에도 R1 순서를 넣었다.
- **R2 슈팅 합계 표시**: 세 경기(31232·31233·31239)의 xG가 보이는 곳마다 "슈팅 합계" / "shot sum"을 붙인다.
  - 경기 분석실 xG 칸(이름 아래 작은 글씨), 프리뷰 수치 표, 팀 최근 경기 표, 팀 경기 기록 표(득·실 양쪽), 팀 지표 그래프의 수치 표.
  - 자연어 분석 답: 값 뒤에 `*`, 표 아래에 "* 슈팅 합계: …" 안내. 합계·평균은 그 경기가 들어가고 값이 있을 때만 표시한다.
  - 390px에서는 숫자 아래 줄에 작게 표시해 열 너비를 늘리지 않는다.
  - 팀 지표 그래프 모듈은 공개 검사에서 원본과 같아야 해서 바꾸지 않았다. 대신 화면 블록(`refresh-ui`)이 그래프 수치 표에 표시를 붙인다.
- **R3 31256 보관 시각(규칙 변경 없음)**: 31256(Manchester United–Bournemouth) 경기 페이지는 2026-10-25 16:15:31 UTC에 보관됐다. 킥오프(14:00 UTC)부터 약 2시간 15분, 경기 종료부터 약 20분 뒤다. 점수와 슈팅 수는 최종 기록과 같다. 다만 Understat가 그 뒤 xG를 고쳤다면 지금 값과 다를 수 있다.
- **R4 Python·JS 규칙 차이**
  - Python은 `archive_match.score`, football-data 슈팅 수, 보관본 슈팅 수에서 참·거짓 값과 정수가 아닌 값을 거부한다(JS `Number.isInteger`와 같은 기준, 5.0처럼 JSON에서 정수인 값은 양쪽 다 정수로 본다).
  - 양쪽 모두 정해진 키 밖의 키를 거부한다. 대상은 파일 머리, 경기 항목(방법별 키 포함), `archive_match`(match_info는 팀 id 포함), `shots`다.
  - 변조 21가지와 두 번 적용은 `server/check.cjs`(JS)와 같은 경우의 Python 실행에서 모두 거부됐다.
- **R7 한국어 구단 이름**
  - 자료에 있는 프리미어리그·라리가 모든 구단(지난 시즌 구단 포함 56개)에 한국어 이름을 넣었다(예: 본머스, 뉴캐슬, 입스위치, 풀럼, 코번트리, 레알 소시에다드). Newcastle, Wolves, Man Utd 같은 영어 줄임말도 더했다.
  - 두 리그 밖의 이름난 구단(바이에른, 유벤투스, PSG 등, "포르투"는 "포르투갈"과 구별)은 선택한 팀으로 답하지 않는다. 대신 "팀을 찾지 못했어요. 프리미어리그·라리가 구단 이름으로 다시 질문해 주세요." / "Team not found. Ask about a Premier League or LaLiga club."를 표시한다.
  - 한계: 목록에 없는 이름(오타 등)은 알아낼 방법이 없어서, 구단 이름이 없는 질문처럼 선택한 팀으로 답한다. "최근 5경기 득점"처럼 구단을 적지 않은 질문이 선택한 팀으로 답하는 것은 원래 의도대로다.
  - 검사: 모든 구단의 첫 한국어 이름이 그 구단 하나로 인식되는지, 다른 리그 구단 질문의 오류를 확인한다.
- **`test:analysis-ui`가 멈춘 이유**
  - 0.25.2 검사(`analysis/release-0.25.2/check-browser.cjs`)는 브라우저 경로가 윈도우 Edge(`C:/Program Files (x86)/…/msedge.exe`)로 고정돼 있다. macOS에서는 브라우저 실행이 실패한다.
  - 그런데 검사용 로컬 서버는 이미 열려 있어서 프로세스가 끝나지 않았다(원래 파일로 재현: 20초 뒤 강제 종료할 때까지 멈춤).
  - 고침: 실패하면 프로세스를 끝낸다. 브라우저 경로는 `MATCHLAB_BROWSER` 환경 변수로 바꿀 수 있고, 윈도우가 아니면 Playwright 기본 Chromium을 쓴다. `playwright` 패키지는 저장소에 없으므로 `NODE_PATH`로 지정한다.
  - 실행: `NODE_PATH=<playwright가 있는 폴더> npm run test:analysis-ui` → PASS(9개 묶음, 약 7초). 실행할 때 덮어쓰는 스크린샷 8개는 커밋하지 않고 되돌렸다.
- 기록된 화면 수정은 두 화면 합계로 0.27.1 30곳(화면마다 15곳) + 0.27.0 38곳이다. 화면 공용 분석 모듈 사본에 들어간 2곳(조건 요약 문구, 팀 없음 안내)은 `check_release.py`가 0.27.1 수정을 되돌린 뒤 `analysis/release-0.25.2/workbench.js`와 대조한다. F1 화면은 바꾸지 않았다.
- 다시 돌린 검사(모두 PASS):
  - `npm run test:server` 26개, `node analysis/check.cjs` 26개, `npm run test:analysis-ui`, `test:report`, `test:odds`
  - `refresh.py check`·`check-xg`, `build_pages.py --check`, `check_release.py`
  - 브라우저: 한영 × 390·1440px, 실패 0, 콘솔 오류 0
  - `predictions.js`는 바이트 그대로다.
