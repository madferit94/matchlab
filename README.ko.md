# MatchLab

**축구와 F1 데이터를 비교하고, 지표와 경기 흐름을 시각화하는 스포츠 분석 프로젝트입니다.**

[English](README.md) · [실행·배포 안내](docs/VERCEL.ko.md) · [문서 안내](docs/README.md)

**0.21.0:** 축구·F1 공통 디자인, 읽기 편한 글꼴과 구단·드라이버 이름 검색.

## 주요 기능

| 축구 · PL / 라리가 | F1 |
|---|---|
| 팀·경기 기록과 지표별 차트 | 미니 8비트 드라이버 캐릭터·팀 프로필, 챔피언십 순위와 지표 설명 |
| 경기 일정과 팀별 프리뷰 | 랩 구간·정차 제외 등 조건별 기록 조회 |
| 실험 승무패 확률과 8비트 경기 연출 | 예측·실제 비교, 순위 이동 애니메이션과 서킷 재생 |
| 한국어·영어 화면과 AI 분석관 연결 | 한국어·영어 지표 입력과 시각화 |

## 실행하기

Node.js 22 환경에서 저장소 루트를 기준으로 실행합니다.

```sh
npm start
```

- 축구: http://127.0.0.1:8765/
- 축구 영어판: http://127.0.0.1:8765/index.en.html
- F1: http://127.0.0.1:8765/f1/index.html

축구 AI 분석관을 연결하려면 `.env.example`을 `.env`로 복사하고 인증값과 사용 가능한 모델을 설정한 뒤 `node --env-file=.env server/gemini.cjs`로 실행합니다. `.env`는 업로드하지 않습니다. [Vercel 배포 방법](docs/VERCEL.ko.md)

## 알아두기

- 저장된 자료를 분석하며 자동 실시간 수집 서비스는 아닙니다. 축구 기록 기준일은 2026-09-20입니다.
- F1 자연어 지표 조회는 규칙 기반입니다. 축구의 외부 AI 연결은 별도 설정과 실제 호출 확인이 필요합니다.
- 예측은 실험 결과이며, 경기 연출은 실제 영상이 아닙니다. F1 재생에는 기록 좌표와 랩 기반 재구성이 함께 사용됩니다.
- 공개 사이트: [matchlab-zeta.vercel.app](https://matchlab-zeta.vercel.app).

## 프로젝트 구성

| 위치 | 내용 |
|---|---|
| `index.html`, `index.en.html`, `f1/` | 현재 축구·F1 화면과 F1 자료 |
| `analysis/`, `modeling/`, `simulation/` | 지표 계산·예측 실험·경기 연출 |
| `server/`, `api/`, `tools/` | 로컬 서버·Vercel 연결·빌드 및 검사 |
| `agent-team-integrated-2026-10-06-v01/`, `skills/` | 에이전트 역할과 작업 절차 |
| `docs/` | 설계·검증·배포 문서 |
| `archive/` | 이전 화면과 디자인 버전 |

[에이전트·스킬 안내](docs/AGENTS-AND-SKILLS.en.md) · [폴더 안내](docs/STRUCTURE.md)

현재 버전은 [VERSION](VERSION), 상세 변경 기록은 [CHANGELOG](CHANGELOG.md)에서 확인할 수 있습니다.
