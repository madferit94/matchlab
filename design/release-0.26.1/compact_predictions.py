"""Build data/football/predictions.js with a compact score grid (0.26.1).

Source: the original prematch-predictions-v22 JSON kept in the archived v50
page. Each prediction's scoreDistribution (169 {home, away, probability}
objects, home goals 0..12 then away goals 0..12) becomes scoreGrid: 169
numbers in the same order, each rounded to 8 significant digits. Every other
field, the key order and the compact JSON settings stay as they were.

Usage (standard library only, deterministic):
  python3 -I design/release-0.26.1/compact_predictions.py          # write file
  python3 -I design/release-0.26.1/compact_predictions.py --check  # compare only
"""
from pathlib import Path
import json, re, sys

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / 'archive/visualizations/visualization-design-2026-10-08-v50/index.html'
TARGET = ROOT / 'data/football/predictions.js'
HEAD = 'window.MatchLabData=window.MatchLabData||{};window.MatchLabData.predictions='
TAIL = ';\n'
SIZE = 13  # goals 0..12 for each side


def original_text():
    html = ARCHIVE.read_text(encoding='utf8')
    blocks = re.findall(r'<script id="prematch-predictions-v22" type="application/json">([\s\S]*?)</script>', html)
    assert len(blocks) == 1, 'Expected exactly one archived prediction block'
    return blocks[0]


def dumps(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))


def round8(value):
    return float(f'{value:.8g}')


def compact_prediction(p):
    cells = p['scoreDistribution']
    assert len(cells) == SIZE * SIZE, 'Score distribution must have 169 cells: ' + p['match_key']
    grid = []
    for i, cell in enumerate(cells):
        assert list(cell) == ['home', 'away', 'probability'], 'Unexpected score cell keys: ' + p['match_key']
        assert cell['home'] == i // SIZE and cell['away'] == i % SIZE, 'Score cells are not home-major: ' + p['match_key']
        value = cell['probability']
        assert isinstance(value, float) and value >= 0, 'Invalid score probability: ' + p['match_key']
        grid.append(round8(value))
    # Rebuild the dict so scoreGrid sits exactly where scoreDistribution was.
    return {('scoreGrid' if key == 'scoreDistribution' else key): (grid if key == 'scoreDistribution' else value)
            for key, value in p.items()}


def build():
    text = original_text()
    bundle = json.loads(text)
    assert dumps(bundle) == text, 'Archived JSON is not reproduced by the compact json.dumps settings'
    assert 'scoreDistribution' not in dumps({k: v for k, v in bundle.items() if k != 'predictions'})
    bundle['predictions'] = [compact_prediction(p) for p in bundle['predictions']]
    assert len(bundle['predictions']) == 641, 'Expected 641 predictions'
    return HEAD + dumps(bundle) + TAIL


def main():
    output = build()
    if '--check' in sys.argv[1:]:
        current = TARGET.read_bytes() if TARGET.exists() else b''
        if current != output.encode('utf8'):
            print('FAIL: ' + TARGET.relative_to(ROOT).as_posix() + ' differs from regenerated output')
            return 1
        print('PASS: data/football/predictions.js equals regenerated output (' + str(len(current)) + ' bytes)')
        return 0
    TARGET.write_bytes(output.encode('utf8'))
    print('Wrote ' + TARGET.relative_to(ROOT).as_posix() + ' (' + str(len(output.encode('utf8'))) + ' bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
