# Folder guide / 폴더 안내

## Current application / 현재 서비스

- Root index.html and index.en.html: football viewers.
- f1/: current F1 viewer, collected public assets, prior F1 release evidence.
- analysis/, modeling/, simulation/: calculations and experimental models/playback.
- server/, api/, tools/: runtime adapters and verification/build utilities.

## Agent and data packages / 에이전트·데이터

- agent-team-integrated-2026-10-06-v01/: integrated five-role package.
- agent-team-2026-10-06-v01/: original ten-role package, retained as evidence.
- skills/: reusable workflows.
- source-unified-2026-10-06-v01/, team-run-2026-10-06-v01/: published data package and archived run.

## History / 과거 기록

- archive/visualizations/: all 45 dated viewer snapshots. No runtime route changes.
- design-candidates-2026-10-06-v01/: original design exploration.
- docs/history/: pre-cleanup README text, with relocated links.
- docs/SPEC-*.md and CHANGELOG.md: detailed release records.

Historical generators and checks can require their original environment. Use tools/check_release.py and current server checks for the current release. 보관된 과거 생성기·검사 전체가 현재 버전을 대상으로 실행되는 것은 아닙니다.
