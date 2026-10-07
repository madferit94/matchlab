# 0.19.4 — Vercel deployment adapter

- Scope: existing football and F1, no 2.0 upload feature.
- Public files: index.html, index.en.html, f1/index.html; unchanged source/data/model contents.
- Function: /api/health and /api/analyze delegate to the same validated local handler. Supports pre-parsed request bodies and exact configured HTTPS origins. Secrets stay server-side.
- Local createServer remains compatible; prior implementation is preserved in Git 0.19.3.
- Verification: server/check.cjs, server/check-vercel.cjs, static allowlist and release audit. Real Vercel deployment/account login and live Gemini calls must be recorded separately; local tests do not establish cloud success.
- Documentation: VERCEL.ko.md includes Korean/English instructions. Participant confirmation pending.
