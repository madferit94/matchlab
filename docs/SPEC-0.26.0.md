# 0.26.0 · 축구 데이터를 화면 파일 밖으로 분리 (실행 전 설계)

## 요청과 범위
- 목적: `index.html`·`index.en.html`에는 화면 코드만 남기고, 저장 자료는 별도 파일로 옮긴다. 분데스리가·세리에A 추가(0.27.0)의 전제 작업이다.
- 이번 범위: 축구만. 화면·숫자·모델·예측 확률은 바꾸지 않는다(포장 방식만 변경). F1 분리는 다음 버전.
- 담당(MatchDesk 5인): 팀장 계획·결재 → 시각화·웹(구현) → 독립 검증. 수집·분석·예측은 자료·모델 변경이 없어 생략하며 생략 사실을 기록한다. 구현자와 검증자는 서로 다른 하위 에이전트로 실행한다. main 병합은 사용자 결재.

## 현재 측정값 (2026-10-17)
| 항목 | 원본 크기 | 전송(gzip) |
|---|---:|---:|
| index.html 전체 | 8.79MB | 1.73MB |
| └ `data` 블록 (팀·경기·스냅샷·지표 설명) | 1.82MB | 0.22MB |
| └ `prematch-predictions-v22` 블록 (641경기 확률) | 6.79MB | 1.45MB |
| └ 화면 코드 나머지 | 0.18MB | 0.06MB |

- 예측 블록의 90%는 경기마다 들어 있는 점수 분포(13×13=169칸, 칸마다 `{"home","away","probability"}` 객체)다.
- 한국어·영어 페이지의 예측 블록은 바이트까지 같고, `data` 블록은 `metric_meta`(지표 설명 언어)만 다르다.

## 설계
1. **자료 파일**: `data/football/data.ko.js`, `data/football/data.en.js`, `data/football/predictions.js`(한영 공용). 각 파일은 `window.MatchLabData.<키>=` + **기존 JSON 원문 그대로** + `;` 형식이다. 원문을 바꾸지 않으므로 이전 화면과 같은 자료임을 바이트로 대조할 수 있다.
2. **불러오기**: 화면 코드 앞에 일반 `<script src="data/football/...js?v=<내용 해시>">`를 둔다. 일반 script는 순서대로 실행되므로 기존의 "시작하자마자 자료를 읽는" 코드 구조를 유지한다. 바뀌는 화면 코드는 두 줄(`JSON.parse(document.getElementById(...).textContent)` → `window.MatchLabData...`)뿐이다. 해시를 주소에 붙여 새 화면이 옛 자료를 캐시에서 읽는 일을 막는다. 파일을 직접 여는 방식(file://)에서도 동작한다.
3. **서버(`server/gemini.cjs`)**: 위 3개 파일만 정확한 이름으로 허용해 제공한다. 그 밖의 `/data/` 경로, `../` 우회, 원본 소스는 계속 차단한다. 서버가 자료를 읽는 `loadData()`와 보고서의 `loadBundle()`(`reports/release-0.25.0/report.cjs`)은 HTML 대신 자료 파일을 읽는다.
4. **배포**: `tools/build-vercel.cjs`가 `data/football/`을 `dist`로 복사한다. `vercel.json`의 API 함수 `includeFiles`에 자료 파일을 추가한다.
5. **검사(`tools/check_release.py`)**: 자료 파일을 HTML 블록으로 다시 끼워 넣고 불러오기 두 줄을 원래대로 되돌린 "복원본"을 만든 뒤, 기존 v50 보관 화면과의 **바이트 동일 비교를 그대로** 실행한다. 통과하면 포장만 바뀌고 화면·자료는 같다는 뜻이다. 한영 예측 파일 공용 여부도 확인한다.

## 기대 효과와 한계
- HTML: 8.79MB → 약 0.18MB. 화면이 자료를 기다리지 않고 먼저 그려질 준비가 된다.
- 자료와 화면 코드를 따로 캐시한다. 화면만 고친 배포 후에는 자료를 다시 받지 않고, 한영 전환 시 예측 파일(1.45MB)을 다시 받지 않는다.
- **첫 방문 전송량은 거의 같다(약 1.7MB).** 실제 용량 절감은 아래 후속 단계에서 생긴다.

## 후속 단계 (이번 범위 아님)
- 0.26.1 점수 분포 압축: 169개 객체 → 169개 숫자 배열(소수 6자리). 측정 결과 예측 파일 6.79MB → 1.32MB, 전송 1.45MB → 0.24MB. 표시 확률과 시뮬레이션 결과가 1e-6 이내로 같은지 검사한다.
- 0.27.0 리그별 파일: `data/football/<리그>/...`로 나눠 선택한 리그만 받는다. 분데스리가·세리에A를 넣어도 첫 화면 전송량이 두 배가 되지 않는다.
- F1(`f1/index.html` 19.8MB, 전송 2.41MB)은 같은 방식으로 이후 분리한다.

## 검증 계획
- `npm run test:server` 기존 17개 + 추가: 자료 파일 3개 제공, 그 밖의 `/data/` 경로·우회 차단, 서버 `loadData()`·보고서가 분리된 파일로 이전과 같은 값을 읽음.
- `python3 -I tools/check_release.py`: 복원본 == v50 바이트 동일, manifest 갱신.
- 브라우저: 한영 × 390/1440px. 이전 버전과 화면 글자 비교(경기 목록·프리뷰·보고서·자연어 분석 결과·시뮬레이션 확률), 콘솔 오류 0, 가로 넘침 없음.
- Vercel 미리보기 배포에서 `/`, `/index.en.html`, `/f1/index.html`, `/api/health`, 자료 파일 3개 응답 확인.

## 상태
구현·자체 검사 완료(시각화·웹 담당, 2026-10-17). 브랜치 `feat/split-football-data-0.26.0`에만 커밋했고 push·PR·배포는 하지 않았다. 독립 검증과 Vercel 미리보기 확인, main 병합 결재가 남아 있다.

## 실행 결과 (2026-10-17)
### 크기 (원본 / gzip -9)
| 파일 | 0.25.4 (main) | 0.26.0 |
|---|---:|---:|
| index.html | 8,793,835 / 1,729,292 | 181,604 / 55,321 |
| index.en.html | 8,792,076 / 1,728,286 | 180,719 / 54,787 |
| data/football/data.ko.js | – | 1,823,065 / 219,402 |
| data/football/data.en.js | – | 1,822,191 / 219,186 |
| data/football/predictions.js (한영 공용) | – | 6,789,268 / 1,453,025 |
| f1/index.html (변경 없음) | 19,751,965 / 2,413,597 | 같음 |

- 한국어 첫 방문 합계: 8,793,937 / 1,727,748 바이트로 이전과 거의 같다(예상대로).
- 한국어 방문 후 영어 전환 시 새로 받는 양: 화면+영어 자료 273,973 바이트(gzip). 예측 파일은 같은 주소라 다시 받지 않는다.
- 자료 파일 해시(`?v=`, sha256 앞 16자리): data.ko.js `c57e411d877ac4dc`, data.en.js `19f6185266ebbf41`, predictions.js `287805684a395bfc`.

### 설계와 다른 점
- 자료를 읽는 화면 코드는 두 곳이 아니라 **세 곳**이었다. 공용 검색 모듈(`matchlab-shared-search`)의 구단 목록도 `read('data')`로 블록을 읽는다. 축구 페이지에서만 `Object.values(window.MatchLabData.data.teams)`로 바꿨다. 이 모듈은 DOMContentLoaded 뒤에 실행되므로 자료 파일이 먼저 실행된다. F1 페이지와 `design/release-0.21.0/search.js` 원본은 그대로이며, 검사기는 복원본에서 원본과 바이트 동일함을 계속 확인한다.
- Windows 작업 사본에서 줄바꿈이 바뀌면 해시와 파일 형식이 달라지므로 `.gitattributes`에 `data/football/*.js text eol=lf`를 추가했다.

### 검사
- `npm run test:server`: 21개 PASS(기존 17 + 자료 파일 제공, 그 밖의 `/data/`·우회 차단, 자료 값이 v50 보관 화면의 블록과 바이트 동일·완료 2399/예정 641/예측 641/기준일 2026-09-20/아스널–리즈 0.6085747997883622·0.22077050835147805·0.1706546918601598, 해시 붙은 script 순서).
- `node server/check-vercel.cjs`: 5개 PASS(`dist`에 화면 3개+자료 파일 3개만 있음, 함수 `includeFiles`=`data/football/*.js`).
- `npm run test:report` 14개 PASS, `npm run test:odds` PASS(877경기).
- `node analysis/check.cjs`: 15개 PASS(main과 같음). 이 현재 엔진 검사도 `index.html`에서 JSON을 정규식으로 꺼내고 있어 처음에는 TypeError로 멈췄다(독립 검증 R2). 공용 읽기 함수(`server/football-data.cjs`)로 `data.ko.js`를 읽도록 고쳤다.
- `python3 -I tools/check_release.py`: PASS. 현재 화면+자료 파일로 이전 내장 HTML을 복원해 v50 보관 화면과 바이트 동일 비교를 그대로 실행한다. 자료 숫자 한 자리 변경, 오래된 `?v=`, 화면 글자 변경을 일부러 넣으면 각각 실패함을 확인했다.
- 브라우저(`design/release-0.26.0/check-browser.cjs`, Playwright Chromium 143): main(0.25.4)과 현재 버전을 한영 × 390/1440px로 비교. 예정 경기 목록(PL·라리가), 경기 프리뷰, 시뮬레이션 확률, 자동 보고서, 자연어 질문 결과 글자가 4개 조합 모두 같다. 페이지 오류 0, 가로 넘침 없음. 예측 확률 하나를 바꾸면 시뮬레이션·보고서 차이를 잡는 것도 확인했다. 결과: `design/release-0.26.0/browser-result.json`.
- `npm start` 후 `/`, `/index.en.html`, `/f1/index.html`, `/api/health`, 자료 파일 3개 모두 200, `/data/football/x.js`·`/data/`·`../` 우회는 404.

### 남은 확인
- Vercel 미리보기 배포 미확인(`includeFiles` 패턴과 정적 자료 파일 응답은 실제 배포에서 확인 필요).
- 0.26.0부터 `index.html` 내장 JSON을 읽는 과거 버전 검사 4개는 동작하지 않는다. main 화면 파일로는 PASS하고 이 브랜치에서는 실패함을 직접 실행해 확인했다. 과거 기록 보존 원칙에 따라 고치지 않았다.
  - `analysis/release-0.23.0/check-planner.cjs` (main: 6개 그룹 PASS → TypeError)
  - `analysis/release-0.25.1/check-core.cjs` (main: 6개 그룹 PASS → TypeError)
  - `analysis/release-0.25.2/check-core.cjs` (main: 6개 그룹 PASS → TypeError)
  - `modeling/prematch-v2-review-2026-10-06-v01/check-ui.cjs` (main: 7/7 → 5/7, 내장 블록을 찾지 못한 2개 실패)
- 함께 실행한 다른 과거 검사 중 `analysis/release-0.21.3/check-order.cjs`는 계속 PASS다. `analysis/release-0.21.3/gemini-before.cjs`, `simulation/pixel-v1·v2` 검사 3개, `docs/eleven-release-review-2026-10-06-v01/independent-check.cjs`, `modeling/prematch-v2-review-2026-10-06-v01/check.py`는 main에서도 이미 실패하므로 이번 변경과 관계없다.
- Windows Edge 경로를 쓰는 과거 브라우저 검사는 이 Mac에서 실행하지 않았다. 코드상 `analysis/release-0.25.1/check-browser.cjs`, `modeling/odds-0.24.0/check-browser.cjs`도 `index.html`에서 내장 JSON을 꺼내므로 동작하지 않을 것으로 보이지만 실행으로 확인하지는 않았다.
- 브라우저 검사에서 외부 글꼴·로고(cdn.jsdelivr.net, cdn.statmuse.com)는 두 버전 모두 차단했다. 이미지 표시는 비교하지 않았다.
