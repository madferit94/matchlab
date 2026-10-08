'use strict';
// This module accepts already-computed PRE-MATCH features. It never builds them from results.
function probability(odds) {
  if (!Array.isArray(odds) || odds.length !== 3 || !odds.every(x => typeof x === 'number' && Number.isFinite(x) && x > 1)) throw new Error('invalid_odds');
  const inverse = odds.map(x => 1 / x), total = inverse.reduce((a, b) => a + b, 0);
  return inverse.map(x => x / total);
}
function predict(bundle, features, odds) {
  if (!Array.isArray(features) || features.length !== 111 || !features.every(x => x === null || (typeof x === 'number' && Number.isFinite(x)))) throw new Error('invalid_features');
  if (bundle.kind !== 'stats_plus_odds' || bundle.model.features.length !== 114) throw new Error('invalid_model');
  const x = features.concat(probability(odds).map(Math.log)).map((v, i) => v === null ? bundle.imputation[i] : v);
  function forward(values) {
    const m = bundle.model, z = m.weights[0].slice();
    values.forEach((v, i) => z.forEach((_, j) => { z[j] += ((v - m.mean[i]) / m.scale[i]) * m.weights[i + 1][j]; }));
    const maximum = Math.max(...z), exp = z.map(v => Math.exp(v - maximum)), sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(v => v / sum);
  }
  const a = forward(x), b = forward(bundle.swap.map(i => x[i])).reverse();
  const result = a.map((v, i) => (v + b[i]) / 2);
  if (!result.every(Number.isFinite) || Math.abs(result.reduce((a, b) => a + b, 0) - 1) > 1e-10) throw new Error('invalid_probabilities');
  return result;
}
module.exports = { probability, predict };
