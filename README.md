# MatchLab

축구와 F1 기록을 조회하고, 자연어로 지표를 골라 차트와 실험 예측을 확인하는 웹 서비스입니다.

**[사이트 바로가기](https://matchlab-zeta.vercel.app/)** · [F1 보기](https://matchlab-zeta.vercel.app/f1/index.html) · **[발표자료 PDF](docs/presentations/matchlab-2026-10-08-v17.pdf)** · [원본 PPT(v16)](docs/presentations/matchlab-2026-10-08-v16.pptx)

## 주요 기능

- **축구** — 프리미어리그·라리가 구단 기록, 경기 프리뷰, 승무패 예측·자동 분석 보고서
- **F1** — 드라이버 기록, 과거 GP 조회, 예측과 실제 결과 비교·재생
- **데이터 조회** — 질문 입력 후 바로 차트 표시, 연속 질문, 모호한 기준만 추가 확인

저장된 자료를 사용합니다. 예측은 실험 결과이며, 재생은 기록을 재구성한 화면입니다.

## 실행 방법

Node.js 22(실행에 필요한 프로그램)를 설치한 뒤, 저장소 폴더의 터미널에서 실행합니다.

```sh
npm start
```

브라우저에서 [localhost:8765](http://127.0.0.1:8765/)를 엽니다.

[설정·배포 안내](docs/VERCEL.ko.md) · [상세 문서](docs/README.md) · [변경 이력](CHANGELOG.md)

현재 버전: **0.25.3**
