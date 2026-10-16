# 0.25.4 · 공개 파일 검사 복구와 줄바꿈 정규화

- 관찰: `python3 tools/check_release.py`가 macOS 작업 사본에서 실패했다. 원인은 두 가지다. (1) 0.25.3 이후 GitHub 웹에서 README.md·README.ko.md를 수정했지만 `publication_manifest.json`을 갱신하지 않았다. (2) `.before`·`before-VERSION`·`.vercelignore`처럼 확장자가 텍스트 목록에 없는 파일 34개는 Windows 작업 사본의 CRLF 바이트 그대로 해시가 계산되어, LF로 받는 다른 운영체제에서는 같은 파일이라도 해시가 달랐다.
- 수정: 검사 스크립트가 NUL 바이트가 없는 파일을 모두 텍스트로 보고 CRLF를 LF로 정규화한 뒤 해시한다. 기존 텍스트 확장자 목록은 유지한다. 그 규칙으로 manifest를 다시 생성했다. 화면·서버·모델·저장 자료는 변경하지 않았다.
- 검증: 수정 후 `check_release.py`가 macOS에서 PASS. `npm run test:server` 17개 PASS. Windows 작업 사본에서는 다음 작업 때 같은 검사를 다시 실행해 양쪽에서 통과하는지 확인한다.
- 참고: 저장 자료 기준일은 2026-09-20(A매치 기간 전 마지막 경기)이며 이번 버전에서 갱신하지 않았다.
