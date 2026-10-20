# 0.26.2 · 자료 불러오기 실패 안내와 검사 보강 (실행 전 설계)

## 요청과 범위
- 0.26.0·0.26.1 검증에서 후속으로 남긴 항목을 정리한다. 화면 기본 표시, 숫자, 모델, 예측 확률은 바꾸지 않는다. F1 범위 밖.
- 담당(MatchDesk 5인): 팀장 계획·결재 → 시각화·웹(구현) → 독립 검증. 자료·모델 변경이 없어 수집·분석·예측 담당은 생략하고 기록한다. main 병합은 사용자 결재.

## 항목
1. **자료 파일을 못 받을 때 안내 (0.26.0 검증 R1, 0.26.1 R5)**
   - 지금은 `data.ko.js`/`data.en.js`를 못 받으면 경기 목록·기준일·검색창이 아무 안내 없이 비고, `predictions.js`를 못 받으면 시뮬레이션이 조용히 사라진다.
   - 바꾸는 것: 자료 script 태그의 불러오기 실패와 "자료 객체 없음"을 감지해, 페이지 언어에 맞는 짧은 안내를 화면 위쪽에 보인다(예: "경기 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요." / "Match data could not be loaded. Please refresh in a moment."). 예측 파일만 실패하면 시뮬레이션·예측 자리에 같은 방식의 안내를 보인다. 자료가 정상일 때는 화면에 아무것도 추가로 보이지 않아야 한다.
2. **점수 칸 풀기 형식 검사 (0.26.1 R3)**
   - `scoreGrid`가 169개 유한한 0 이상 숫자가 아니면 그 경기의 점수 분포를 쓰지 않고, 시뮬레이션이 이미 가진 "확률 검증 실패" 안내가 보이게 한다(조용히 고정 점수로 넘어가지 않게). 정상 자료에서는 결과가 지금과 바이트까지 같아야 한다.
3. **공개 파일 검사의 값 비교 강화 (0.26.1 R2)**
   - `tools/check_release.py`가 예측 필드를 비교할 때 `True`와 `1`, `1`과 `1.0`을 구분하도록 타입까지 비교한다.
4. **README 현재 버전 표기 (0.26.0 note)**
   - `README.md`·`README.ko.md`의 "현재 버전"이 0.25.3으로 남아 있다. 0.26.2로 고치고, 이후 버전을 올릴 때 README 버전이 VERSION과 다르면 `check_release.py`가 실패하도록 검사를 추가한다.

## 검증 계획
- 브라우저: 정상 상태 한영 × 390/1440px에서 main(0.26.1)과 화면 글자·스크린샷이 같다(안내가 보이지 않는다). 자료 파일 3개를 각각 막았을 때 안내가 보이고 페이지가 멈추지 않는지, 콘솔 오류 수를 기록한다.
- 잘못된 `scoreGrid`(170칸, null 칸, 칸 하나 누락, 배열 아님)에서 시뮬레이션이 실패 안내를 보이는지.
- `check_release.py`: 기존 PASS 유지, v50 복원 비교 유지, true→1 같은 타입 바꿈과 README 버전 불일치가 FAIL로 잡히는지.
- 기존 검사: `npm run test:server`, `npm run build` + `node server/check-vercel.cjs`, `node analysis/check.cjs`, `npm run test:report`, `npm run test:odds`, `python3 -I design/release-0.26.1/compact_predictions.py --check`.

## 상태
구현·자체 검사 완료(시각화·웹 담당, 2026-10-21). 브랜치 `fix/load-notice-0.26.2`에만 커밋했고 push·PR·배포는 하지 않았다. 독립 검증, 운영 배포 후 확인, main 병합 결재가 남아 있다.

## 실행 결과 (2026-10-21)
### 바뀐 것
- **안내 문구**: 한국어 "경기 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요." / "예측 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.", 영어 "Match data could not be loaded. Please refresh in a moment." / "Prediction data could not be loaded. Please refresh in a moment."
- 화면(`index.html`, `index.en.html`): 언어 자료 script 태그 바로 뒤에 작은 안내 코드(`<script id="matchlab-load-notice">`)를 넣었다. 원본은 `design/release-0.26.2/load-notice.ko.js`·`load-notice.en.js`이며 문구 한 줄만 다르다. 자료 객체(`window.MatchLabData.data`)가 없으면 `<main>` 맨 위에 안내를 넣는다. 정상일 때는 아무 요소도 만들지 않는다.
- 예측을 읽는 줄 뒤 문장: 경기 자료가 없으면 조용히 멈추고(위쪽 안내가 이미 보임), 예측 객체가 없으면 선택한 경기의 시뮬레이션 자리(`#prediction-simulation-v22`)에 같은 모양의 안내를 넣는다. `scoreGrid`가 정확히 유한한 0 이상 숫자 169개일 때만 풀고, 아니면 빈 점수 분포를 넣어 시뮬레이션 자체 검사가 실패하게 한다. 그러면 기존 "모델 확률 검증에 실패해 시뮬레이션을 표시하지 않습니다." 안내가 보인다. 정상 자료를 푸는 식은 0.26.1과 같다.
- `tools/check_release.py`: 복원 단계에서 안내 코드 블록과 새 문장을 지워 기존 v50 바이트 비교를 그대로 실행한다. 안내 블록은 자료 태그 바로 뒤에 한 번, 원본 파일과 같아야 하고, 한영 원본은 문구 줄만 달라야 한다. 예측 필드는 타입까지 비교한다(`strict_equal`). VERSION·package.json·README 두 개의 현재 버전이 검사기 버전(0.26.2)과 같아야 한다.
- `server/check.cjs` 22 → 24개: README·package 버전 = VERSION, 안내 블록 위치(자료 태그 뒤, 자료 읽는 코드 앞).
- README 두 개의 현재 버전 0.25.3 → 0.26.2.

### 설계와 다른 점
- 불러오기 실패는 script 태그의 `onerror` 대신 바로 다음 코드에서 "자료 객체 없음"으로 감지한다. 파일을 못 받으면(연결 실패·404) 객체도 없으므로 두 경우를 한 번에 잡고, 자료 태그를 바꾸지 않아 기존 검사(해시 붙은 태그)를 그대로 쓴다. 브라우저에서 연결 실패·404·객체 없는 파일 세 경우를 모두 확인했다.
- 경기 자료 안내는 화면에 붙어 있게(`position:sticky`) 했다. `#matches`처럼 주소에 위치가 붙어 열리면 페이지가 아래로 이동해 맨 위 안내가 보이지 않았기 때문이다.
- `scoreGrid`가 아예 없는 경우도 "숫자 169개가 아님"으로 보아 실패 안내를 보인다(0.26.1에서는 고정 점수로 조용히 넘어갔다).
- 0.26.1 시뮬레이션 비교 검사(`design/release-0.26.1/check-simulation.cjs`)는 페이지 문장을 함수 밖에서 실행하므로 새 문장의 `return` 때문에 "Illegal return"으로 멈춘다. 과거 기록이라 고치지 않고, 함수 안에서 실행하는 `design/release-0.26.2/check-simulation.cjs`를 새로 만들었다.

### 크기 (바이트: 원본 / gzip-6)
| 파일 | 0.26.1 (main) | 0.26.2 |
|---|---:|---:|
| index.html | 181,791 / 55,504 | 183,665 / 56,130 |
| index.en.html | 180,906 / 54,965 | 182,735 / 55,568 |
| data/football/*.js | 변경 없음 | 변경 없음(`?v=` 그대로) |

### 검사
- 브라우저(`design/release-0.26.2/check-browser.cjs`, Google Chrome 155, Playwright 1.57.0은 저장소 밖): **PASS**. 결과 `browser-result.json`.
  - 정상 화면: main(0.26.1)과 한영 × 390/1440px 비교. 경기 목록(PL·라리가), 구단 검색, 아스널–리즈 프리뷰·시뮬레이션·자동 보고서, 자연어 질문 결과 글자, 본문 글자, `<main>` 마크업(보고서 생성 시각만 가림), 스크린샷 4장(목록·프리뷰·시뮬레이션·질문 결과)이 4개 조합 모두 같다. 641경기 × 시드 20개 시뮬레이션 차이 0. 페이지 오류 0, 가로 넘침 없음(`documentElement.clientWidth` 기준), 안내 요소 0개.
  - 자료 파일 막기 16경우(연결 실패는 두 너비 모두, 404·객체 없음은 390px): 모두 해당 언어 안내가 보인다. 경기 자료를 막으면 안내는 `<main>` 첫 요소로 첫 화면 안에 있고, 페이지 오류 4건(0.26.1은 5건, 안내 없음), 목록·검색은 비어 있다. 예측 파일을 막으면 목록·프리뷰·보고서는 그대로 나오고 시뮬레이션 자리에 안내가 보이며 페이지 오류 0건(0.26.1은 1건, 시뮬레이션 자리 없음). 다른 경기로 바꾸면 안내가 하나만 남고, 팀 화면에서는 사라진다.
  - 잘못된 `scoreGrid` 9가지(170칸, null 칸, 마지막 칸 누락, 가운데 칸 누락, 객체, 문자열, 키 없음, 음수 칸, 문자 칸) × 한영: 모두 "확률 검증 실패" 안내가 보이고 시뮬레이션은 그려지지 않는다. 같은 입력에서 0.26.1은 마지막 칸 누락·객체·문자열·키 없음 4가지에서 안내 없이 시뮬레이션을 그렸다. 원래 자료를 같은 경로로 넣은 대조는 정상 표시.
- `node design/release-0.26.2/check-simulation.cjs`: 새 문장으로 푼 예측 = main(0.26.1) 문장으로 푼 예측(JSON 글자 동일). 641경기 × 시드 20개·1,000개 모두 차이 0.
- `python3 -I design/release-0.26.2/tamper-check.py <작업 폴더>`: 깨끗한 복제본에 하나씩 바꿔 넣은 15가지가 모두 FAIL, 대조는 PASS. 예측 생성기를 고쳐 `model_accepted` true→1, `source_date_is_verified_kickoff` false→0, `top_scores` 1→1.0으로 파일과 `?v=`까지 맞춰도 타입 비교에서 실패한다. README 두 개의 버전 불일치·버전 줄 삭제, VERSION 불일치, 안내 블록 삭제(한·영)·문구 변경·위치 이동·한영 코드 차이, 예측 안내 삭제, 0.26.1 풀기 문장으로 되돌리기도 실패한다. 결과 `tamper-result.json`.
- `npm run test:server` 24개 PASS, `npm run build` 후 `node server/check-vercel.cjs` 5개 PASS, `node analysis/check.cjs` 15개 PASS, `npm run test:report` 14개 PASS(바뀐 `reports/release-0.25.0/checks.json` 시각은 되돌림), `npm run test:odds` PASS(877경기), `python3 -I design/release-0.26.1/compact_predictions.py --check` PASS(2,132,671 바이트).
- `PORT=8813 node server/gemini.cjs`: `/` 200 183,665, `/index.en.html` 200 182,735, `/f1/index.html` 200, `/api/health` 200, 자료 파일 3개 200, `/data/football/x.js` 404. 서버는 PID로 종료.
- `python3 -I tools/check_release.py`: PASS(manifest 갱신 후).

### 남은 확인
- 운영(Vercel) 배포 후 화면·안내 확인은 하지 않았다. 이번에는 자료 파일이 바뀌지 않아 `?v=`가 그대로다.
- 경기 자료를 못 받으면 기존 화면 코드가 자료를 읽다 멈추므로 페이지 오류 4건이 남는다. 자료 읽는 줄(`const D=window.MatchLabData.data`)은 v50 복원 비교의 기준이라 이번 범위에서 바꾸지 않았다. 안내는 보이고 페이지는 계속 응답한다(언어 전환 링크 2개가 남아 있음을 확인, 클릭해 보지는 않음).
- 브라우저 검사에서 외부 글꼴·로고(cdn.jsdelivr.net, cdn.statmuse.com)는 두 버전 모두 차단했다(정상 화면 리소스 실패 13건씩 같음). 이미지 표시는 비교하지 않았다.
