# 0.22.1 / F1 0.9.1 — GP title and analysis visibility

- Request / 요청: remove the isolated Korean Bahrain event title; make the F1 natural-language input easier to find and read.
- Observed / 관찰: `display_name.ko` creates a one-off Korean title while other events use English names. Input is behind the analysis tab and the shared theme overrides its stronger border.
- Change / 수정: select the existing English display name for catalogue and detail headings in both locales. Do not alter event/circuit records. Add a bilingual question shortcut in GP details that opens analysis, scrolls to the input and focuses it. Use an 18px font, 144px minimum height, high-contrast border and visible keyboard focus.
- Evidence / 근거: `f1/release-0.9.1/browser-result.json` and bilingual desktop/mobile captures. Verify names, shortcut focus, live computed input styles, no document overflow at 390/768/1440px and supported year comparison (15/25).
- Existing limitations / 기존 한계: this change does not expand natural-language parsing or add AI API calls. An English query containing the unsupported connector `in` still receives the existing supported-scope guidance; the supported year-comparison form passes.
- Data / 데이터: all JSON payloads, prediction models and historical records remain unchanged. The prior HTML and documents are preserved in the release folder.
- Participant verification / 참가자 확인: pending / 확인 전.
