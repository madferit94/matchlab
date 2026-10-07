# 0.19.3 — MatchLab standalone repository / 독립 저장소 이전

- Source: madferit94/all-sports-analytics, commit c1e22c8f1d0f14192f92159d59b7b8f12a307ef5, subtree football/matchdesk-ai-agents.
- Destination: https://github.com/madferit94/matchlab (public), main.
- Scope: published football and F1 application, agents, skills, datasets, models, bilingual documentation and version snapshots. Existing repository remains available.
- History: git subtree split preserves project changes; commit IDs change when parent paths and unrelated files are removed. Prior PRs remain in the original repository.
- Runtime: football /, English /index.en.html, F1 /f1/index.html; Node server/gemini.cjs from repository root.
- Security: .env and ignored caches are not published. Local configuration can be copied locally without logging its content.
- Version: MatchLab 0.19.3; F1 0.7.2. No data/model/UI changes. API reliability and new natural-language capabilities are separate work.
- Checks: release manifest/hash and local link audit; source/destination application tree comparison; local HTTP route checks. Participant confirmation pending.

## 한국어
공개 MatchLab 하위 폴더를 독립 저장소의 루트로 옮깁니다. 기존 저장소·스냅샷은 보존하고 새 저장소에서 관련 변경 이력을 이어갑니다. 원래 커밋 주소는 기존 저장소에 남으며, 새 저장소의 커밋 ID는 경로 분리에 따라 달라집니다. 원본 전체 수집 캐시와 별도 스포츠 실험을 새로 공개하지 않습니다. 이번 변경은 API 문제 해결이나 기능 고도화를 의미하지 않습니다.
