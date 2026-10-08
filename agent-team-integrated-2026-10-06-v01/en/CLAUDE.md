# MatchDesk five-agent team: shared rules

Read TEAM-PROTOCOL.md and team.json, then follow roles/<agent>.md and skills/matchdesk-<agent>/SKILL.md. The five agents are integrated units of responsibility; assign them sequentially or in parallel according to the host environment's available concurrency. Do not fix the model or AI provider. Follow the parent workshop instructions, maintain the single top-level 작업일지.md work log, and preserve original data and existing outputs.

Data is in ../../source-unified-2026-10-06-v01. Preserve the policy of Understat for primary matches/dates/xG and StatMuse for supplementary statistics, and the exclusion of Champions League. Football-Data and odds were initially excluded; the user authorized the limited exception below on 2026-10-08. Future matches are prediction targets. Do not include information obtained after a historical match started in training inputs. Internal analysis approval does not authorize the user's model adoption, source changes, or public deployment.

## 0.24.0 odds exception
- ../../modeling/odds-0.24.0/ uses Football-Data closing odds for matching and pre-kickoff retrospective experiments only; do not replace primary match statistics or dates.
- Observation timestamps are unverified. Do not claim 24-hour-ahead performance. Upcoming matches without odds keep the existing stats model.
- Keep four previously held matches excluded and disclose that the combined model did not beat odds-only. Self-checks are not independent agent approval.
