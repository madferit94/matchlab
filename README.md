# MatchLab

**English** · [한국어](README.ko.md)

A web service for looking up football and F1 records, choosing metrics in plain language, and viewing charts and experimental predictions.

**[Open the site](https://matchlab-zeta.vercel.app/)** · [F1 view](https://matchlab-zeta.vercel.app/f1/index.html) · **[Presentation PDF](docs/presentations/matchlab-2026-10-08-v17.pdf)** · [Original PPT (v16)](docs/presentations/matchlab-2026-10-08-v16.pptx)

## Main features

- **Football** — Premier League and La Liga club records, match previews, win/draw/loss predictions and automatic analysis reports
- **F1** — Driver records, past Grand Prix lookups, and prediction-versus-result comparison and replay
- **Data queries** — Type a question to see a chart right away, ask follow-up questions, and get asked only when a criterion is unclear

The service uses saved data. Predictions are experimental results, and replays are screens rebuilt from records.

## How to run

Install Node.js 22 (the program needed to run the service), then run this in a terminal from the repository folder.

```sh
npm start
```

Open [localhost:8765](http://127.0.0.1:8765/) in your browser.

[Setup and deployment guide](docs/VERCEL.ko.md) · [Detailed documents](docs/README.md) · [Changelog](CHANGELOG.md) (documents are in Korean)

Current version: **0.26.3**
