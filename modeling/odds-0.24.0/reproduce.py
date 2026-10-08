"""Re-fit the published experiment from generated pre-match inputs (NumPy only).

python reproduce.py --out <new-directory>
Raw-source generation/publication timestamps are not re-verified by this script.
"""
from pathlib import Path
import argparse, importlib.util, json
import numpy as np

HERE = Path(__file__).resolve().parent

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=False)
    spec = importlib.util.spec_from_file_location('baseline', HERE.parent/'train_baseline.py')
    core = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(core)
    rows = json.loads((HERE/'training-inputs.json').read_text())
    assert len(rows) == 2395 and all(not r['history_latest_date'] or r['history_latest_date'] < r['date'] for r in rows)
    train = [r for r in rows if r['season'] == '2023/24']
    validation = [r for r in rows if r['season'] == '2024/25']
    evaluation = [r for r in rows if r['season'] in ['2025/26', '2026/27']]
    expected = {r['match_key']: r for r in json.loads((HERE/'evaluation-predictions.json').read_text())}
    checks = []
    for kind in ['stats_only', 'odds_only', 'stats_plus_odds']:
        saved = json.loads((HERE/(kind+'-model.json')).read_text())
        swap = saved['swap']
        def matrix(records):
            x = np.asarray([r['features'] for r in records], dtype=float)
            odds = np.log(np.asarray([r['market_probability'] for r in records]))
            return x if kind == 'stats_only' else odds if kind == 'odds_only' else np.column_stack([x, odds])
        def fit(records, reg):
            x = matrix(records)
            x = np.vstack([x, x[:, swap]])
            fill = np.asarray([np.mean(c[np.isfinite(c)]) if np.isfinite(c).any() else 0 for c in x.T])
            x = np.where(np.isfinite(x), x, fill)
            y = np.r_[[r['label'] for r in records], [2-r['label'] for r in records]]
            model = core.fit([dict(features=v.tolist(), label=int(label)) for v, label in zip(x, y)], reg)
            model['features'] = saved['model']['features']
            design = np.column_stack([np.ones(len(x)), (x-model['mean'])/model['scale']])
            weights = np.asarray(model['weights'])
            rate = .8/(np.linalg.eigvalsh(design.T@design/len(x)).max()+reg)
            for extra in range(40000):
                gradient = design.T@(core.softmax(design@weights)-np.eye(3)[y])/len(x)
                gradient[1:] += reg*weights[1:]
                if np.max(np.abs(gradient)) < (1e-6 if extra == 0 else 1e-7):
                    break
                weights -= rate*gradient
            assert np.max(np.abs(gradient)) < 1e-6
            model['weights'] = weights.tolist()
            return dict(model=model, imputation=fill.tolist(), swap=swap, kind=kind)
        def predict(bundle, records):
            x = matrix(records)
            x = np.where(np.isfinite(x), x, bundle['imputation'])
            a = core.predict(bundle['model'], [dict(features=v.tolist()) for v in x])
            b = core.predict(bundle['model'], [dict(features=v.tolist()) for v in x[:, swap]])[:, [2,1,0]]
            return (a+b)/2
        trials = []
        for reg in [.01,.1,1.]:
            candidate = fit(train, reg)
            trials.append((reg, core.metrics(validation, predict(candidate, validation))['log_loss']))
        reg = min(trials, key=lambda x:x[1])[0]
        model = fit(train+validation, reg)
        actual = predict(model, evaluation)
        reference = np.asarray([expected[r['match_key']][kind] for r in evaluation])
        difference = float(np.max(np.abs(actual-reference)))
        assert reg == saved['model']['regularization'] and difference < 1e-9
        (args.out/(kind+'-model.json')).write_text(json.dumps(model, allow_nan=False), encoding='utf8')
        checks.append(dict(model=kind, regularization=reg, max_probability_difference=difference, passed=True))
        print(checks[-1], flush=True)
    (args.out/'reproduction.json').write_text(json.dumps(dict(checks=checks, matched_predictions=877), indent=2), encoding='utf8')

if __name__ == '__main__':
    main()
