# 현재 배포 / Live deployment

- https://matchlab-zeta.vercel.app
- F1: https://matchlab-zeta.vercel.app/f1/index.html
- GitHub: madferit94/matchlab → Vercel madferit/matchlab 연결.
- 최초 배포에서 서버 파일이 제외되는 문제를 명시적 제외 목록으로 수정했습니다. 비밀값은 Vercel 서버 환경변수에만 저장합니다.

# Vercel 배포 안내 / Deployment

현재 0.19.4는 기존 축구·F1 사이트를 배포하는 버전이며 2.0 개발은 아닙니다.

1. Vercel에서 GitHub madferit94/matchlab 저장소를 가져옵니다.
2. 프로젝트 루트는 저장소 루트, Framework Preset은 Other입니다. vercel.json에서 빌드 npm run build, 출력 dist, Node.js 22.x를 설정합니다.
3. 기본 화면과 F1의 규칙 기반 지표 조회에는 API 키가 필요하지 않습니다.
4. 축구 AI 분석관을 사용하려면 Vercel 환경변수에 GEMINI_API_KEY와 계정에서 지원되는 GEMINI_MODEL을 설정합니다. 값은 저장소나 브라우저 코드에 넣지 않습니다. 사용자 지정 도메인은 APP_ORIGIN=https://실제도메인 설정이 필요합니다. 기본 Vercel 도메인은 자동 환경변수를 사용합니다.
5. 배포 후 /, /index.en.html, /f1/index.html, /api/health를 확인합니다. configured는 키 설정 여부이며 실제 제공자 호출 성공을 뜻하지 않습니다.

Vercel 공식 문서: https://vercel.com/docs/functions/runtimes/node-js 및 https://vercel.com/docs/project-configuration/vercel-json

서버 함수의 메모리 내 호출 간격 제한은 인스턴스별입니다. 여러 인스턴스 전체의 사용량 제한은 아니며, 외부 AI 계정의 할당량/과금은 별도로 적용됩니다.

## English
Import madferit94/matchlab with the repository root and Other preset. Build and output settings are versioned in vercel.json. Only three canonical HTML pages are copied into dist. API routes use a Node function, bundling the recorded football dataset. Configure GEMINI_API_KEY and an available GEMINI_MODEL only in server-side environment settings. Set APP_ORIGIN for a custom domain. No API provider fix or live-call guarantee is included in this deployment release. Historical snapshots remain in Git, outside public build output.
