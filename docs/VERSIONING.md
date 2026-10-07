# Version policy / 버전 관리

- [VERSION](../VERSION) is the single current release number; `package.json` must match. / 현재 버전은 VERSION 한 곳을 기준으로 하며 package.json과 맞춥니다.
- Use `major.minor.patch`: incompatible changes / features / fixes or documentation updates. / 큰 구조 변경·기능 추가·수정 순서로 번호를 올립니다.
- Keep both root READMEs aligned in section order and meaning. Describe current capabilities; put release-by-release details in [CHANGELOG](../CHANGELOG.md). / 한영 README 구성을 맞추고 상세 이력은 CHANGELOG에 기록합니다.
- Work on a branch, verify the change, then merge a pull request into `main`. Website changes also require deployment verification; a documentation merge alone does not prove a new deployment. / 브랜치에서 수정·검증 후 main에 병합합니다. 웹 화면 변경은 배포 결과도 확인합니다.
- Preserve historical snapshots and SPEC files. Use new versioned evidence files; do not revise old records to imply a different past result. / 과거 화면·명세·검증 기록은 보존합니다.
- Refresh `publication_manifest.json` with the release checker. It records file hashes and excludes itself; secrets such as `.env` stay outside publication. / 검사기로 파일 목록·해시를 갱신하며 비밀 설정은 공개하지 않습니다.

This is the standalone `madferit94/matchlab` repository. Earlier monorepo rules and historical version notes are preserved in [the previous policy](history/VERSIONING-before-0.21.2.md), not current instructions.

현재는 독립 저장소이며 이전 통합 저장소 기준과 과거 버전 설명은 위 보관 문서에 남깁니다.
