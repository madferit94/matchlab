# MatchLab

**Explore football and F1 records through metric comparisons, visual analysis and race playback.**

[한국어](README.ko.md) · [Run & deploy](docs/VERCEL.ko.md) · [Documentation](docs/README.md)

## Features

| Football · Premier League / LaLiga | Formula 1 |
|---|---|
| Team profiles, match records and metric charts | Grand Prix and driver metrics with explanations |
| Fixtures and match previews | Conditional queries by lap range and pit-lap exclusion |
| Experimental outcome probabilities and pixel replay | Predicted order versus recorded progress and circuit playback |
| Korean/English viewers and an AI analyst adapter | Korean/English metric queries and charts |

## Run locally

Use Node.js 22 and run from the repository root:

```sh
npm start
```

- Football: http://127.0.0.1:8765/
- English football: http://127.0.0.1:8765/index.en.html
- F1: http://127.0.0.1:8765/f1/index.html

For the football AI analyst, copy `.env.example` to `.env`, set your credentials and an available model, then run `node --env-file=.env server/gemini.cjs`. Never publish `.env`. See the [Vercel deployment guide](docs/VERCEL.ko.md).

## Scope

- Analysis uses saved data, not an automatic live feed. The football snapshot runs through 2026-09-20.
- F1 metric queries use a deterministic parser. The football AI adapter requires separate configuration and live-call verification.
- Predictions are experimental. Playback is not actual footage; F1 combines recorded coordinates with lap-based reconstruction.
- Vercel configuration is ready; a public deployment still requires account connection and verification.

## Repository map

| Location | Purpose |
|---|---|
| `index.html`, `index.en.html`, `f1/` | Current viewers and F1 assets |
| `analysis/`, `modeling/`, `simulation/` | Calculations, prediction experiments and playback |
| `server/`, `api/`, `tools/` | Local server, Vercel adapter, build and checks |
| `agent-team-integrated-2026-10-06-v01/`, `skills/` | Agent responsibilities and workflows |
| `docs/` | Design, verification and deployment documentation |
| `archive/` | Previous viewer and design snapshots |

[Agent & skill guide](docs/AGENTS-AND-SKILLS.en.md) · [Folder guide](docs/STRUCTURE.md)

See [VERSION](VERSION) for the current release and [CHANGELOG](CHANGELOG.md) for detailed history.
