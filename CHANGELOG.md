## 0.25.2 · 2026-10-08
- 축구·F1의 필수 분석 조건 확인 화면 제거. 질문하면 즉시 결과와 적용 조건 요약 표시.
- 연속 질문·새 질문 초기화 유지, 모호한 질문에만 추가 확인. 내부 조건 검증 및 미확보 안내 유지.

## 0.25.1 · 2026-10-08
- 분석 조건의 리그·시즌·팀, F1 연도·GP·드라이버·지표 연동 수정. 체크박스와 검색으로 대상 선택 개선.
- 질문에 명시한 팀이 화면의 기본 팀으로 덮어써지는 오류 수정. 과거 지표 미확보 안내 구체화.

## 0.22.1 / F1 0.9.1 — GP titles and visible analysis input

## 0.25.0
- 축구 경기 페이지에서 최종 예측·지표 근거·출처와 발행일을 확인한 부상 소식을 자동 보고서로 표시. AI 실패 시 저장 지표 유지, 한영 대응.

## 0.24.1
- 배당은 승부예측 입력으로 사용한다는 요청에 맞춰 별도 비교 화면 제거. 114개 입력의 학습 모델·검증 자료는 보존하며, 예정 경기 배당 연결은 미완료.

## 0.24.0
- 축구 전체 배당 매칭·114입력 결합 모델·재현 코드 통합. 완료 경기의 과거 검증 확률 비교와 예정 경기 배당 미확보 안내 추가.

## 0.23.1 · 2026-10-08
- F1 질문 버튼을 ‘자연어로 질문하기’에서 ‘질문하기’로 간결하게 변경.

## 0.23.0 · 2026-10-08
- 축구·F1 자연어 분석에 조건 확인·수정, 연속 질문과 모호한 기준 선택 추가.
- F1 최근 종료 GP 집계 및 확보 경기 수 표시, API 해석 전용 응답 지원. 기존 원본·모델 유지.

## 0.22.4 · 2026-10-08
- GitHub 소개를 짧은 한국어 README 하나로 통합. 상세 문서 분리, 이전 영어·한국어 문서 보존.

## 0.22.3 · 2026-10-08
- F1: five tyre compounds with bilingual click-to-open help, official links and keyboard dismissal.
- F1: 타이어 5종 특성·쓰임새 말풍선, 한영 지원 및 공식 설명 링크.

## 0.22.2 · 2026-10-08
- F1: Korean driver names, full-name queries and historical-driver aliases (28 drivers).
- F1: 베르스타펜 표기 통일, 한글 전체 이름·과거 드라이버 인식 보완.

- Consistent English GP titles; prominent question entry, focus shortcut and higher-contrast input.
- 대회명 표기 통일·자연어 질문 진입·입력창 가독성 개선.
- [Specification / 명세](docs/SPEC-0.22.1.md) · KO/EN, 390/768/1440px checks passed.

## 0.22.0 / F1 0.9.0 — 2024 training → 2025 predictions

- Collect 24 OpenF1 2024 GPs; train on 19 after five warm-up races, freeze model weights and evaluate 24 GPs in 2025.
- 2024년 수집·학습, 2025년 예측/실제 비교·지표·자연어 조회. 기존 2026년 자료와 모델 보존.
- Winner hits 7/24; rank MAE 3.63. Independent feature/weight/metric checks and bilingual browser checks passed.
- [Specification / 명세](docs/SPEC-0.22.0.md). Includes reproducible collection, training and verification evidence.

## 0.21.5 / F1 0.8.7 — Past GP catalogue

- Season selector, 24 archived GP cards and dedicated historical results/metrics/analysis pages; preserve season on direct links, back and refresh.
- F1 2025년 GP 목록·경기 상세 연결, 한영 연도 선택과 뒤로가기/새로고침 유지.
- [Specification / 명세](docs/SPEC-0.21.5.md) · real browser interaction and responsive layout verified.

## 0.21.4 / F1 0.8.6 — Historical GP queries

- Connect collected 2025 race results to natural-language lookup and year comparison; distinguish GP names from circuits and resolve drivers across number changes.
- F1 작년 GP 기록·연도별 비교 연결, 미수집 지표 안내와 결과표 내부 스크롤.
- [Specification / 명세](docs/SPEC-0.21.4.md) · 12 historical checks, 96 condition regressions and bilingual browser verification.

## 0.21.3 / F1 0.8.5 — Natural-language ordering

- Correct ascending/descending football rankings; preserve and reverse conditions.
- 축구 정렬 오류 수정, F1 적은/많은·빠른/느린 순과 반대 순서 조회 추가.
- Verified against saved records, bilingual browser interaction and live Gemini calls; see [SPEC](docs/SPEC-0.21.3.md).

## 0.21.2 — Documentation / 문서 정리

- Matching Korean/English README structure, direct sport links, optional AI setup and concise documentation navigation.
- 한영 README 통일, 지난 버전 소개 제거, 현재 버전 정책 정리와 이전 정책 보관. 런타임 변경 없음.

## 0.21.1 / F1 0.8.4 — Comparison profile links

- Remove the expandable explanation panel in both comparison renderers; driver names open existing profiles.
- 표현 방식과 한계 칸 제거, 비교표 드라이버 이름 클릭 이동.

## 0.21.0 — Shared sports dashboard

- StatMuse-inspired navigation/search and quiet rounded cards across football KO/EN and F1. Shared system typography; local name search links to existing profiles.
- 축구·F1 디자인 통일, 8비트 자산·팀 색상·기존 계산 유지. 작은 화면에서는 메뉴가 상단으로 이동.

## 0.20.3 / F1 0.8.3 — Floating driver numbers

- Move driver numbers off the suit into an upper-right badge on cards and profiles.
- 등번호를 캐릭터 오른쪽 위 별도 배지로 이동, 복장 가림 제거.

## 0.20.2 / F1 0.8.2 — Character detail

- Team-specific suit panels, collars, cuffs and boot piping; individual brows, eye spacing, hair highlights and expressions.
- 팀 복장 패턴과 드라이버 얼굴 차이 보강. 숫자 배지를 허리 아래로 이동해 가슴 배색 유지.

## 0.20.1 / F1 0.8.1 — Mini game characters

- 23 compact 32×40 driver sprites with team suit palettes, racing numbers, hairstyles and facial-hair accents. No remote portrait required.
- 드라이버별 미니 게임 캐릭터, 얼굴 확대·한영·모바일 지원. 경기 데이터와 순위 계산 유지.

## 0.20.0 / F1 0.8.0 — Driver and team profiles

- Pixel portraits/suits with face zoom, 23 season participants and 11 team profiles.
- OpenF1 current championship and 2023–2025 final standings, GP histories and metric help.
- Next-GP estimates and a separately labelled remaining-GP season scenario.
- 드라이버·팀 클릭 상세, 한영·모바일·검색/필터 지원. 기존 레이스·모델 원본 보존.

## 0.19.7 — Vercel production

- Fix nested API file inclusion; successful production build and GitHub integration.
- 공개 주소 및 한영 배포 문서 갱신.

## 0.19.6 / F1 0.7.3 — Rank motion

- Recorded comparison rows smoothly follow current rank during playback; seeking and reduced-motion use immediate ordering.
- 실제 기록 패널에서 순위 변화에 따라 드라이버 행이 위아래로 이동. 랩 진행·예측·원본 자료 보존.

## 0.19.5 — Repository organization / 저장소 정리

- Short bilingual README; preserve original text in docs/history.
- Move 45 dated screen folders into archive/visualizations and update links/check paths.
- Runtime pages, data and models unchanged.

## 0.19.4 · Vercel

- Static page allowlist and Node function adapter; exact HTTPS origins and parsed JSON handling.
- 기존 사이트 배포 설정, 서버 호환성 검사, 한영 배포 안내 추가.

## 0.19.3 · 2026-10-07

- Dedicated madferit94/matchlab repository; retained football/F1 subtree history and prior snapshots.
- 축구·F1 독립 저장소 이전, 한영 실행 안내 및 저장소 위치와 무관한 릴리스 검사 개선.
- No API, model or visualization behavior changes.

## 0.19.2 / F1 0.7.2

- Repair Barcelona GP circuit image (old URL returned 404).
- Same-session/circuit GPS outline fallback on image failure, preserving aspect ratio.
- Real image loading and forced-failure rendering verified at mobile/desktop widths.

## 0.19.1 / F1 0.7.1

- 30 metric names, numeric cards, multiple metrics and tables.
- Explicit selected-GP lap ranges, pit-lap exclusions, thresholds, top N and order.
- 96 parser/calculation and 80 isolated real-browser checks passed.

## 0.19.0 / F1 0.7.0

- Selected-GP natural-language charts in Korean/English, no AI API calls.
- Lap-time lines, metric comparison bars, tabular values, coverage-aware pit means.
- 34 computation/parser checks and 40 isolated real-browser UI checks passed.

## 0.18.1 / F1 0.6.1

- 13 GP DHL-derived files, 276 missing stop times supplemented; existing OpenF1 values retained.
- Partial averages display recorded/total coverage; model inputs and forecasts unchanged.

## 0.18.0 — 2026-10-07

- F1 driver metric cards and category filtering with bilingual click-to-explain help.
- Responsive metric labels, numbers, controls and help bubbles; previous v08 retained.
- Existing datasets, models and time-cutoff rules preserved.

## 0.17.2 — 2026-10-07

- Completed circuit comparison uses recorded real-time 1× instead of 60-second full-race compression.
- Add 0.25×/0.5× and 10×/30×/60× shared speeds; upcoming illustration is 180 seconds.
- Previous v07 preserved; no dataset or model changes.

## 0.17.1 — 2026-10-07

- Shared playback speed label and cursor for both F1 circuit maps.
- Predicted motion uses recorded race lap count instead of three fixed loops.
- Previous v06 and 0.17.0 preserved; no model/data changes.

## 0.17.0 — 2026-10-07
- Preserve selected-driver view; Play shows all drivers and live cursor-based records.
- 전체22명재생/개별보기/선택선수순위·랩·타이어·피트차트,미래실제기록제외.

## 0.16.0 — 2026-10-07
- Port Baku xy/time replay principles into circuit-map comparison.
- 종료16지도·예정7역사참고지도,22차량/2명좌표와랩재구성구분.
- Fix invalid location query operators; preserve raw hashes, gaps and models.

## 0.15.0 — 2026-10-07
- Completed F1 prediction-vs-record comparison; per-race walk-forward refits.
- 종료GP예측판/실제판비교, 공식순위8100행추가,학습입력과실제기록분리.
- Korean/English descriptions, version backups and leakage checks.

## 0.14.0 — 2026-10-07
- Resume F1/sport integration; completed replay and scheduled historical-result forecasts.
- 기록 재생16/예정 예측7/취소2 구분, GPS 결측 및 모델 한계 표시.
- Version snapshots and bilingual documentation; independent checks and browser verification.

## 0.13.0 — 2026-10-07
- Add same-server Football/F1 navigation and preserve language.
- Separate Grand Prix branding from actual host venue; official Sepang override for Bahrain meeting1308.

## 0.12.2 — 2026-10-07
- Rename the KO/EN site to MatchLab; retain internal identifiers and historical snapshots.
- Retry one transient upstream 5xx response; cap each attempt at 25 seconds and preserve distinct auth/quota/timeout errors.

## 0.12.1 · 2026-10-07

- Publish accumulated0.9.2–0.12.0 changes, models, viewer snapshots and validation evidence.
- Add English packages for the current five-agent team, legacy ten-role team and three record/SQL/Python skills.
- Preserve Korean originals and shared contracts/tools; correct English package-relative paths.
- Refresh bilingual repository/project READMEs and publication inventory.

## 0.12.0 · 2026-10-07

- Team chart explorer with10match trends and47season metric options across6categories.
- Data-appropriate lines, grouped bars, stacked counts and0–100percentage bars.
- Missing data gaps, ongoing-season scope, exact value tables and metric explanation→chart links.
- Stored analyst, builder, independent reviewer and director role evidence; unchanged model/data.

## 0.11.4 · 2026-10-07

- Load6more fixtures per click on league and team schedules.
- Link team upcoming fixtures to exact internal previews using #preview=matchId.
- Preserve selected fixtures outside the initial three, reload and language switching.

## 0.11.3 · 2026-10-07

- Responsive metric card columns sized to nested match panels.
- Borderless readable labels, Korean word wrapping and unbroken numerical values.
- Preserve explanation popovers, pixel headings/numbers and bilingual pages.

## 0.11.2 · 2026-10-07

- Continuous ground-ball routes for passes, carries, shots and kickoff returns.
- Ball-reactive formation movement, defensive tracking and visible running; 11 players per side preserved.
- Remove the complete score-sampling footer in both locales.
- Preserve logistic probabilities, learned score grids and all previous viewer versions.

# Release history / 변경 이력

## 0.9.1 — 2026-10-06

- Include CSS in UTF-8/LF publication-hash normalization, preventing unchanged stylesheets from failing after Windows CRLF checkout. Preserve the exact 0.9.0 manifest as the baseline.
- CSS 줄바꿈 차이에 따른 파일 검사 오류만 수정합니다. v23 한영 화면·각 팀 11명 재생·모델·확률·수집 자료는 동일합니다.
- Validate LF/CRLF hash equivalence in memory and rerun the publication audit; no paid API call or new visual test is performed.

## 0.9.0 — 2026-10-06

- Preserve v20 improved AI errors, v21 readable loss/draw colours, v22 experimental prediction/replay and v23 eleven-player correction in both languages.
- Each simulated team contains one goalkeeper and ten outfield players. Replay is illustrative, not real footage, player-level forecasting or a confirmed result.
- Publish pre-match v2 code, stored-input features, metrics and independent review; keep model_adopted false. Attack/defence/pressing/recent-five features use strictly earlier records, with prior-season/league smoothing for sparse history. No actual passing accuracy, odds or market values are silently added.
- 2025/26 accuracy 50.92% versus 45.79% league-frequency baseline; current LaLiga accuracy remains below baseline. Prior rank proxy ablation did not improve 2025/26 results; official rank and time-correct market value remain candidates.
- 한국어·영어 README/SPEC와 파일 해시를 갱신합니다. 각 팀 11명 수정·실험 확률·가상 재생을 포함하며 정식 모델 채택은 보류합니다. 실제 브라우저 재생·참가자 확인은 아직입니다.
- Automated evidence is stored alongside the relevant engine/model/viewer/server checks. Mocked-provider tests are not live Google verification. No external hosting or GitHub CI success is claimed.

## 0.8.0 — 2026-10-06

- Gemini local server, ignored local .env and empty public example; validated tool calls execute saved-record calculations.
- Bilingual async mode, key/configuration/error state, no browser secrets or invented probabilities. Preserve v19.
- 98 checks passed including 12 mocked-provider HTTP tests. Live Gemini verification awaits a user key; local server is not external hosting.


## 0.7.0 — 2026-10-06

- Bilingual recorded-data workbench: phrase interpretation, comparison/ranking/venue/trend, follow-ups, chart/table/calculation disclosure. Runs in browser JavaScript.
- Explicit unavailable prediction and unsupported-metric states; no LLM/SQL/Python execution or fabricated future probabilities.
- Service registration interface, three project skills, ownership and SPEC; broader pixel typography. Preserve v18 and prior releases.
- 15 engine + 48 Korean + 23 English checks passed (86 total). Actual browser confirmation pending.


## 0.6.0 — 2026-10-06

- Separate club and explicit Understat match links in completed-match lists.
- Remove provider/count badge; six bilingual detailed metric popovers; statistics unchanged.
- Preserve v17; 44 Korean and 19 English Node VM checks passed. Actual browser confirmation pending.


## 0.5.0 — 2026-10-06

- Add canonical English index.en.html alongside Korean index.html, preserving v16 in both languages.
- Translate all UI, filters, 47 StatMuse metric labels/definitions, reading tips and accessibility labels. Language links preserve selected-team hashes; other filters reset.
- Confirm 27 Premier League and 29 LaLiga historical/current clubs retain pixel logos and club colours. Statistical data and prediction adoption unchanged.
- 한·영 화면과 지표 설명 제공, 선택 팀을 유지하는 언어 전환. 한국어 40개·영어 15개 코드 검사 통과. 실제 화면·참가자 확인 전.


## 0.4.0 — 2026-10-06

- Adopt the 8-bit design as the canonical index.html and preserve v15.
- Render original logos for all 56 teams onto 24×24 grids, reuse loads, retain aspect ratios and fall back to initials on image/canvas failures. No logo raster files are rewritten.
- Update bilingual READMEs, selection, SPEC and hashes; preserve earlier design previews.
- 8비트 디자인을 기본 화면으로 채택. 56개 원본 팀 로고의 픽셀 표시·비율 유지·로딩 재사용·실패 대체 처리. 자료/모델 변경과 웹 호스팅 없음.
- Node VM: 40 checks passed; actual browser rendering and visual quality confirmation remain pending.

## 0.3.0 — 2026-10-06

- Preserve UI v01–v14: team colours/logos/history, match filters, 47 Korean metrics, click explanations, layout fixes and source/external-link removal.
- Add functioning soft-app and 8-bit previews, release SPEC, viewer selection and refreshed hashes.
- Publish archived baseline code/review while keeping service adoption false; no model improvement or deployment in this release.
- 화면 v01~v14 보존, 팀 정보·필터·한글 지표·말풍선·넘침 수정·외부 링크 제거. 부드러운/8비트 미리보기와 SPEC·버전 명세 추가. 모델 실험은 보존하되 서비스 채택은 보류.
- Actual browser rendering, administrator authentication, automatic refresh and user design acceptance remain pending.

## 0.2.1 — 2026-10-06

- Normalize manifest hashes to the published UTF-8/LF representation. No agent/data behavior changed.
- 공개 텍스트 줄바꿈 기준으로 파일 해시 보완. 에이전트/자료 동작 변경 없음.

## 0.2.0 — 2026-10-06

- Consolidated ten roles into five execution owners; retained independent review and final decision.
- Added ownership-aware approval adapter, six protocol tests, future-target policy and provider-neutral skills.
- Published bilingual entry documents, representative viewer and sanitized run evidence.
- 10역할→5담당 통합, 독립 검증/결재 유지, 담당 검사·6시험·미래경기 정책·영한 문서 추가.
- Five-agent actual execution, prediction models and automatic refresh remain unimplemented/unverified as documented.

## 0.1.0 — preserved 2026-10-06 snapshot

- Original ten-role package, contracts, validators and seven tests.
- Actual representative run is archived separately; it predates consolidation.
- 이전10역할 구성·공통계약·7시험 보존. 실제 대표2경기 실행은 통합이전 배정입니다.

Publication commits are made now; they do not reconstruct or backdate historical Git commits.

## 0.9.2 · 2026-10-07 · local
Internal completed-match routes in Korean and English; removed analyst calculation disclosure. All-team training scope clarified. No model deployment.

## 0.10.0 · 2026-10-07 · local
Selected logistic-111 model connected to641stored future fixtures and bilingual simulation. Updated model evidence. Score sampling remains illustrative fixed1:0/1:1/0:1; low scoring traced to this fallback. Previous0.9.2 preserved.

## 0.11.0 · 2026-10-07 · local
Trained Poisson count model on1518historical matches, conditioned score distributions on frozen logistic outcome probabilities. Bilingual score summaries and varied pixel replay scores. Preserved0.10.0.

## 0.11.1 · 2026-10-07 · local
Added broad player movement and player-linked ball paths, goal banners and kickoff. Internal model ID removed from user footer. Score distributions unchanged.



