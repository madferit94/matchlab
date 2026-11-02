# 0.27.0 · 축구 경기 결과 갱신 (football-data.co.uk, StatMuse·Understat 없이)

## 요청과 범위
- 사용자 결정(2026-11-02): StatMuse는 사이트 구성 참고용이므로 쓰지 않고, 축구 자료 갱신에 집중한다. Understat는 이 컴퓨터에서 접속되지 않는다(DNS 실패, 2026-11-02 확인).
- 2026-09-20 뒤에 끝난 프리미어리그·라리가 경기를 '예정'에서 '완료'로 옮기고, 같은 출처의 값(점수·슈팅·유효 슈팅)만 넣는다.
- 저장된 경기 전 예측 641개(`data/football/predictions.js`)는 바꾸지 않는다. 끝난 경기는 그 예측과 실제 결과를 비교해 보여 준다.
- 담당(MatchDesk 5인): 팀장 계획·결재 → 수집·분석(이 구현, producer `reviewer-leakage-2026-10-21`가 팀장 지시로 수집·분석 역할 수행) → 독립 검증 → 최종 결재. 모델·예측은 바꾸지 않아 예측 담당 작업은 없다. F1 범위 밖(`f1/` 변경 없음). push·PR·배포·main 병합은 하지 않는다.

## 출처와 이용 조건
- 출처: football-data.co.uk 2026/27 결과 CSV `https://www.football-data.co.uk/mmz4281/2627/E0.csv`(프리미어리그), `.../SP1.csv`(라리가). 열 정의는 `https://www.football-data.co.uk/notes.txt`.
- 이용 조건 확인(2026-11-02):
  - `disclaimer.php`: 정확성 보증 없음, 도박 관련 책임 면제 문구만 있다. 재배포·라이선스 조항은 찾지 못했다.
  - `data.php`: 자료는 무료이지만 "개인용(private individuals)이며, 상업용이나 자동 봇·스크레이퍼·AI를 쓰는 데이터 학습 제품용이 아니다"라는 문구가 있다(원문 요지: "intended for private individuals only, NOT commercial or data training products using automated bots/scrapers/AI").
  - 이번 작업은 개인 비상업 사이트에 경기 결과 60개(점수·슈팅·유효 슈팅)를 표시하는 범위다. 원본 CSV는 저장소에 넣지 않는다. 다만 공개 배포 사이트이고, 내려받기를 스크립트로 했고, AI 에이전트가 작업했다는 점은 이 문구와 겹칠 수 있다. **main 병합·배포 전에 사용자가 이 조건을 확인해야 한다.** 이 자료로 예측 모델을 학습하는 일(0.28.0 초안)은 "데이터 학습 제품" 문구와 직접 겹치므로, 운영자 허락 없이 진행하지 않는다.
- 원자료 사본은 저장소 밖 작업 폴더에 둔다. 저장소에는 수집·적용 스크립트와 결과(경기별 6개 값)만 둔다.

## 기준 시각
- 내려받은 시각: 2026-11-02 02:11:44Z / 02:11:47Z(HTTP Date). 두 파일 모두 서버 수정 시각 2026-10-26 23:12:23Z.
- 새 자료 기준일: **2026-10-26**(파일 안 마지막 경기 날짜). 이전 기준일 2026-09-20.
- 10-31 이후 경기는 아직 파일에 없어서 예정 경기로 남는다(실제로는 끝났을 수 있다). 날짜는 football-data의 영국 날짜다.

## 바뀌는 것
1. **자료**: `data/football/data.ko.js`·`data.en.js` = 보관된 v50 자료 + `tools/football_refresh/0.27.0/refresh.json`의 결과 60개.
   - 완료 2,399 → 2,459, 예정 641 → 581, `last_date` 2026-09-20 → 2026-10-26, 새 키 `refresh`(출처·기준일·필드 요약).
   - 새 완료 경기: `hg`·`ag`(점수), `hs`·`as`(슈팅), `hst`·`ast`(유효 슈팅), `provider`, 출처 URL이 들어간다. `hx`·`ax`(xG)는 `null`이다. football-data의 xG(HxG·AxG)는 Understat와 다른 모델이라 넣지 않았다(9/20 이전 119경기 대조: 평균 차이 0.26~0.29골, 거의 일치하지 않음).
   - 날짜: 18경기는 저장된 예정 날짜와 실제 날짜가 다르다(예: 라리가 일요일 날짜 → 실제 금·토). 실제 날짜를 쓴다.
2. **화면(한영)**
   - 머리글: "자료 기준 2026-10-26 · 2026-09-20 이후 경기 결과: football-data.co.uk (xG·상세 지표 없음)" / "Data through 2026-10-26 · results after 2026-09-20: football-data.co.uk (no xG or detailed stats)".
   - 다가오는 경기 화면: "끝난 경기 · 경기 전 예측과 실제" 표(리그별, 최근 순 5개 + 더 보기). 판정 기준은 "가장 높은 확률의 결과 = 실제 결과". 리그별 적중 수를 함께 표시한다.
   - 경기 분석실(끝난 경기): 저장된 예측이 있으면 "경기 전 예측과 실제 결과"(홈·무·원정 확률, 실제·예측 표시, 적중/빗나감) 패널을 표시한다. 새 결과에는 "경기 기록 · football-data.co.uk"(슈팅·유효 슈팅) 패널과 "xG 등 상세 지표 없음, 이전 경기와 섞지 않음" 안내를 표시한다.
   - xG가 없는 경기가 섞이면 xG 합계·평균은 0이나 일부 합계가 아니라 "—"로 표시한다(프리뷰 경기당 기대 득점, 기대 득점 흐름 그래프 점, 팀 종합·시즌 표, 최근 경기 표, 자연어 분석 결과, 경기 분석실 xG).
   - 팀 화면 2026/27 상세 지표(StatMuse 시즌 누적)에 "2026-09-20까지의 값이며 갱신하지 않음" 안내를 붙인다.
   - 기준일 전 날짜인데 결과가 파일에 없는 예정 경기(라리가 Rayo Vallecano–Athletic Club, 원래 2026-10-11)에 "결과 자료 없음 · 연기 여부 미확인" 표시를 붙인다.
3. **분석 엔진**(`analysis/record-engine.cjs`): xG가 없는 경기가 섞이면 xG·xGA를 `null`로 둔다. 순위에서 `null`은 맨 뒤로 보낸다. 경기별 추이에서 xG 없는 경기의 값은 `null`이다.
4. **검사**
   - `tools/check_release.py`: 자료 파일이 `apply(v50 자료, refresh.json)`와 바이트까지 같아야 한다. 화면 비교는 새 블록 2개와 기록된 코드 수정(`design/release-0.27.0/page-patch.json`, `build_pages.py` 규칙과 같아야 함)을 되돌린 뒤 기존처럼 v50과 바이트 비교한다. manifest의 `display_dataset` 경기 수는 자료에서 계산한다.
   - `server/check.cjs`·`analysis/check.cjs`·`reports/release-0.25.0/check.cjs`에서 2026-09-20 고정 기대값을 갱신하고, 테스트를 추가했다.
   - 보고서 검사의 기준 경기는 이제 끝난 경기다(Arsenal–Leeds, 2026-10-10). 그래서 Arsenal–Hull(2026-11-07)로 바꾸고 날짜를 모두 28일 옮겼다. 끝난 경기에는 경기 전 보고서가 없다는 검사도 더했다.

## 바뀌지 않는 것
- `data/football/predictions.js`(641개 예측, 점수 칸) 바이트 동일. 모델·계수·예측 입력 기준(2026-09-20) 동일. 새로 예측을 만들지 않는다.
- 9/20 이전 완료 경기 2,399개, 경기별 상세 지표(`match_detail`), StatMuse 시즌 스냅샷(`snapshots`), 팀 정보, 지표 설명 동일.
- 경기 전 자동 보고서의 통계 기준(예측 입력 기준일 이하 경기만)은 그대로다. 그래서 새 결과는 보고서 수치에 들어가지 않는다.
- F1 화면·자료.

## 새 예정 경기
- 없음. 641경기가 2026/27 남은 경기 전체였고, 이번에는 그중 60개가 끝났다. 남은 581개는 모두 저장된 예측이 있어 "예측 준비 중" 상태가 필요한 경기는 없다(`server/check.cjs`가 확인).

## 재현
```sh
python3 -I tools/football_refresh/refresh.py fetch --raw <저장소 밖 폴더>
python3 -I tools/football_refresh/refresh.py build --raw <같은 폴더>   # refresh.json
python3 -I tools/football_refresh/refresh.py apply                     # 자료 파일 2개
python3 -I design/release-0.27.0/build_pages.py                        # 화면 2개 + page-patch.json
```
- `build` 단계 안전장치:
  - 저장된 2026/27 완료 119경기(EPL 50, 라리가 69)가 같은 날짜·점수로 파일에 있어야 한다(119/119 일치).
  - 새 결과는 저장된 예정 경기와 리그·홈·원정이 같아야 한다.
  - 숫자는 0 이상 정수여야 하고, 유효 슈팅은 슈팅 이하여야 하며, 결과 글자(H/D/A)가 점수와 맞아야 한다.

## 실행 결과 (2026-11-02)
- 갱신: 60경기(EPL 30, 라리가 30), 경기일 2026-10-09 ~ 2026-10-26. 예정 경기 581개가 남았다.
- 끝난 60경기의 저장 예측 비교(가장 높은 확률 = 실제): 적중 30/60(50.0%) — EPL 14/30, 라리가 16/30. 실제 결과의 로그 손실 평균은 0.995다. 같은 모델의 2025/26 회고 평가는 48.2%·1.023이었다. 표본 60경기라 차이를 말할 수 없다. 저장된 예측과 그 뒤 결과만 쓴 첫 전향 비교다.
- 크기(바이트, 원본/gzip-6 `gzip -6 -n`):

| 파일 | 0.26.3 | 0.27.0 |
|---|---:|---:|
| index.html | 183,665 / 56,119 | 192,919 / 58,930 |
| index.en.html | 182,735 / 55,554 | 191,937 / 58,339 |
| data.ko.js | 1,823,065 / 242,815 | 1,828,328 / 243,679 |
| data.en.js | 1,822,191 / 242,587 | 1,827,454 / 243,423 |
| predictions.js | 2,132,671 / 722,824 | 변경 없음 |

### 검사
- `npm run test:server` 24개 PASS, `node analysis/check.cjs` 17개 PASS(2개 추가), `npm run test:report` 15개 PASS(1개 추가), `npm run test:odds` PASS(877경기), `python3 -I design/release-0.26.1/compact_predictions.py --check` PASS, `npm run build` 후 `node server/check-vercel.cjs` PASS.
- `python3 -I tools/football_refresh/refresh.py check` PASS, `python3 -I design/release-0.27.0/build_pages.py --check` PASS, `python3 -I tools/check_release.py` PASS(manifest 갱신 후).
- 브라우저(Claude 브라우저 창, `PORT=8827 node server/gemini.cjs`), 한영 × 390/1440px에서 확인. 결과는 `design/release-0.27.0/browser-result.json`.
  - 머리글 기준일과 출처 줄, 끝난 경기 표(적중 EPL 14/30), 경기 분석실 예측·실제 패널(Arsenal–Leeds 2:1 적중, Malaga–Real Sociedad 2:5 적중)을 확인했다.
  - 슈팅·유효 슈팅과 "—" xG 표시, 팀 화면 xG "—"와 StatMuse 기준일 안내, 팀 그래프 빈 점, 순위표(8경기), 자연어 분석의 xG "—"(새 결과 3경기), 연기 표시(Rayo–Athletic)를 확인했다.
  - 콘솔 오류 0, 가로 넘침 없음, 영어 화면 본문에 한글 없음.
- 변조 검사(`python3 -I design/release-0.27.0/tamper-check.py <저장소 밖 폴더>`, 결과 `tamper-result.json`): 커밋 d8362f0을 새로 복제해 한 가지씩 바꾼 16가지를 검사했다. 대조는 PASS, 나머지 15가지는 모두 FAIL이다.
  - 자료 쪽: 새 결과 점수 변경, 새 결과에 xG 채우기, 기존 Understat 경기 변경, refresh.json만 변경, 저장 예측 확률 변경.
  - 화면 쪽: page-patch.json 항목 삭제, 기록 안 된 코드 수정(xG 칸, calc의 0 처리), 화면 블록 삭제·변경, 한영 로직 차이, 영어 화면 한글, 도움 함수 변경, VERSION.
  - 결과 하나를 빼고 refresh.json과 자료를 함께 다시 만든 경우: refresh.json이 기록 원본이라 `check_release.py`는 통과하고, `server/check.cjs`가 60개 확인으로 실패한다.

## 독립 검증 반영 (validation-report.json, afd1a00 이후)
- **R1 refresh.json 내용 규칙 재확인**
  - 문제: 내용 규칙이 `build`에만 있어서, refresh.json을 손으로 고친 뒤 apply·build_pages를 다시 돌리면 검사가 모두 통과했다.
  - 같은 규칙을 이제 `apply_refresh`(Python)와 `applyRefresh`(JS, `tools/football_refresh/apply.cjs`)가 매번 다시 확인한다. `check_release.py`, `server/check.cjs`, `analysis/check.cjs` 모두 이 경로를 거친다.
  - 확인하는 규칙: 날짜가 2026-09-20 초과 ~ 기준일, 0 이상 정수, 유효 슈팅 ≤ 슈팅, 결과 글자와 점수, 저장된 예정 경기와 같은 리그·팀, 날짜순·중복 없음, as_of = 마지막 날짜.
  - 결과마다 원본 행 기록을 더했다.
    - `provider_row`: 쓰는 열 12개를 원문 그대로 저장한다. 저장된 값·날짜·팀 이름이 이 원문과 같아야 한다.
    - `row_sha256`: 그 12개 열의 지문. 검사 때마다 다시 계산해 대조한다.
    - `line_sha256`: CSV 원본 줄의 지문. 원본 파일이 있으면 `refresh.py verify --raw`로 대조한다(60/60 일치).
  - 지문과 원문 열까지 함께 위조하면 원본 파일 없이는 잡을 수 없다. 그 경우는 `verify --raw`가 원본 파일 해시와 줄 지문으로 잡는다.
- **R2 이번 시즌 xG 질문 안내**: 이번 시즌 xG 질문 결과 위에 한 줄 안내를 붙인다. 문구는 "2026-09-20 이후 경기(football-data.co.uk 결과)는 xG 자료가 없어 이번 시즌 xG를 계산하지 않습니다…" / "Matches after 2026-09-20 … have no xG, so this season's xG is not calculated…"이다. 다른 시즌 질문에는 붙지 않는다. 첫 화면 예시는 "라리가 이번 시즌 경기당 득점 순위" / "LaLiga this season goals per match ranking"으로 바꿨다(`build_pages.py` 규칙 2개 추가, 기록된 수정 32 → 36곳).
- 변조 검사 재실행(커밋 ed48d80 이후, `tamper-result.json` 갱신): 20가지 중 대조 1개만 PASS, 19개 FAIL.
  - 추가한 R1 변조 4가지(refresh.json 점수 변경, 홈·원정 골 맞바꿈, 날짜 2026-09-19, 유효 슈팅 > 슈팅, 각각 apply·build_pages 재실행)는 `check_release.py`와 `server/check.cjs` 둘 다에서 실패한다.
  - "결과 하나 제거"는 as_of 규칙에 맞게 고친 뒤에도 `server/check.cjs`가 60개 확인으로 잡는다.
- **R3 좁은 화면 표**: 650px 이하에서는 끝난 경기 표의 각 행을 세로 카드(열 이름 + 값)로 바꿔, 실제·예측·판정이 가로 스크롤 없이 보인다. 한영 390px에서 표 영역 폭 328 = 내용 폭 328, 1440px은 표 그대로임을 확인했다.

- **재검증 RC1-3·RC1-4 (2026-11-02)**
  - 첫 화면 세 번째 예시가 기본 지표 xG라 "—"만 나왔다. "바르셀로나 홈 원정 경기당 득점 비교" / "Compare Barcelona home and away goals per match"로 바꿨다(기록된 수정 36 → 38곳).
  - `validate_refresh`는 결과에 필요한 키가 없으면 KeyError 대신 "Refresh result is missing …" 안내로 멈춘다.
- **F1 0.26.4와 함께 병합 준비**
  - origin/main(aad82ec, F1 0.26.4) 위로 rebase했다.
  - 충돌 파일과 해결: VERSION·package.json·README 두 개는 0.27.0, CHANGELOG는 0.26.4 위에 0.27.0, `tools/check_release.py`는 RELEASE 한 줄만 충돌했다. F1 검사와 축구 검사는 자동 병합으로 둘 다 남았다. publication_manifest.json은 마지막에 다시 만들었다.

## 남은 확인
- football-data 이용 조건(개인용, AI 학습 제품 금지 문구)에 대한 사용자 판단. 판단 전에는 병합·배포하지 않는다.
- 독립 검증, 운영 배포 후 확인, main 병합 결재.
- 10-31 이후 경기 결과는 football-data 파일이 갱신된 뒤 같은 명령으로 다시 넣어야 한다(파일은 대개 주 1~2회 갱신).
- 9/20 이후 경기에는 xG가 없다. Understat에 접속할 수 있는 환경(사용자 윈도우 PC)에서 나중에 채울 수 있지만, 이번 범위가 아니다.
- 새 예측은 0.28.0 초안(`docs/SPEC-0.28.0-draft.md`)의 결정 뒤에 다룬다.
