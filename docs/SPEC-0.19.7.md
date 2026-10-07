# 0.19.7 — Production deployment

Vercel project madferit/matchlab connected to GitHub madferit94/matchlab. Production URL: https://matchlab-zeta.vercel.app.

Initial deployment failed because the inverse allowlist omitted nested API files. Replaced .vercelignore with explicit exclusions for archives, private settings, data caches and irrelevant packages. Cloud build now succeeds; static output still contains only three canonical viewers.

GEMINI_API_KEY and GEMINI_MODEL transferred from local configuration to sensitive production environment variables, never to source. Public pages, health API and blocked secret paths are checked separately from live provider analysis. Participant confirmation pending.
