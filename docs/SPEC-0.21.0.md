# MatchLab 0.21.0 — Shared football / F1 design

## Direction / 방향
User requested an overall football/F1 redesign and StatMuse as a reference. Inspected https://www.statmuse.com/ on 2026-10-07: sidebar navigation, prominent search, rounded cards, player art alongside statistics. Apply the layout principles with MatchLab assets; no StatMuse illustration copying. Existing pixel drivers/logos/replay remain.

## Presentation / 표시
- Bright neutral background, white cards, restrained teal search/active accents. Team colours and result semantics preserved.
- System font stack: Segoe UI Variable, Segoe UI, Apple SD Gothic Neo, Malgun Gothic, Arial; tabular numerals. Korean uses the available Korean fallback. No new font network dependency.
- Persistent desktop left menu at 1050px+, top navigation on smaller screens. Visible focus, keyboard-accessible search and reduced-motion support.
- One shared CSS and JS source embedded into all three canonical pages; Vercel still ships the three standalone pages. UI components can generate their legacy styles without overriding the shared presentation.
- Search is local name lookup, not a new natural-language AI capability. Football club / F1 driver and team name matches route to existing profiles. English name input clearly indicated in Korean. No API call or provider credit consumed by name search.

## Preservation / 보존
No data/model changes. Release checker validates exact CSS/JS embedding, removes only those verified additions, then compares football application code against the archived accepted viewer. Original archives unchanged. F1 data regression also checked.

## Verification / 검증
Browser: 390/768/1440px football, English team and F1 driver/race routes; overflow and fonts. Search-to-profile, football metrics/league, F1 face toggle, keyboard search and language change. Screenshots under design/release-0.21.0. Participant visual confirmation pending.
