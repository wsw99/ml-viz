// Random Forest (3 trees, CART, max_depth=2) — step-by-step snapshot generator.
// Produces window.STEPS consumed by the step controller.

(function () {

  // ── CART helpers ──────────────────────────────────────────────────────────

  function gini(data) {
    if (!data.length) return 0;
    const p1 = data.filter(p => p.y === 1).length / data.length;
    return 2 * p1 * (1 - p1);
  }

  function majority(data) {
    return data.filter(p => p.y === 1).length >= data.length / 2 ? 1 : 0;
  }

  function findBestSplit(data) {
    const parentGini = gini(data);
    const n = data.length;
    let bestGain = -Infinity, bestFeature = null, bestThreshold = null;

    for (const feat of ['x1', 'x2']) {
      const vals = [...new Set(data.map(p => p[feat]))].sort((a, b) => a - b);
      for (let i = 0; i < vals.length - 1; i++) {
        const t     = (vals[i] + vals[i + 1]) / 2;
        const left  = data.filter(p => p[feat] <= t);
        const right = data.filter(p => p[feat] > t);
        if (!left.length || !right.length) continue;
        const gain = parentGini
          - (left.length / n)  * gini(left)
          - (right.length / n) * gini(right);
        if (gain > bestGain) { bestGain = gain; bestFeature = feat; bestThreshold = t; }
      }
    }
    return { feature: bestFeature, threshold: bestThreshold, gain: bestGain };
  }

  function buildTree(data, maxDepth) {
    const splits = [];
    const leaves = [];

    function build(nodeData, reg, depth) {
      const g      = gini(nodeData);
      const isLeaf = depth >= maxDepth || g < 1e-4;

      if (isLeaf) {
        leaves.push({ label: majority(nodeData), region: { ...reg }, n: nodeData.length, gini: g });
        return;
      }

      const { feature, threshold, gain } = findBestSplit(nodeData);
      if (feature === null) {
        leaves.push({ label: majority(nodeData), region: { ...reg }, n: nodeData.length, gini: g });
        return;
      }

      splits.push({ feature, threshold, region: { ...reg }, gain, nSamples: nodeData.length });

      const left  = nodeData.filter(p => p[feature] <= threshold);
      const right = nodeData.filter(p => p[feature] > threshold);

      const leftReg  = { ...reg };
      const rightReg = { ...reg };
      if (feature === 'x1') { leftReg.x1Max = threshold; rightReg.x1Min = threshold; }
      else                  { leftReg.x2Max = threshold; rightReg.x2Min = threshold; }

      build(left,  leftReg,  depth + 1);
      build(right, rightReg, depth + 1);
    }

    build(data, { x1Min: 0, x1Max: 10, x2Min: 0, x2Max: 10 }, 0);
    return { splits, leaves };
  }

  // ── Prediction / OOB helpers ───────────────────────────────────────────────

  function predictPoint(tree, p) {
    const leaf = tree.leaves.find(l =>
      p.x1 >= l.region.x1Min && p.x1 <= l.region.x1Max &&
      p.x2 >= l.region.x2Min && p.x2 <= l.region.x2Max);
    return leaf ? leaf.label : 0;
  }

  function oobAccuracy(tree, data, oobMask) {
    const oob = data.filter((_, i) => oobMask[i]);
    if (!oob.length) return null;
    return oob.filter(p => predictPoint(tree, p) === p.y).length / oob.length;
  }

  function ensembleOOBAccuracy(trees, bootstrapInfos, data) {
    let correct = 0, total = 0;
    data.forEach((p, i) => {
      const oobPreds = trees
        .map((t, ti) => bootstrapInfos[ti].oobMask[i] ? predictPoint(t, p) : -1)
        .filter(v => v >= 0);
      if (!oobPreds.length) return;
      const v1   = oobPreds.filter(v => v === 1).length;
      const pred = v1 * 2 > oobPreds.length ? 1 : 0;
      if (pred === p.y) correct++;
      total++;
    });
    return total > 0 ? correct / total : null;
  }

  function featureImportance(trees, nTotal) {
    const imp = { x1: 0, x2: 0 };
    let tot = 0;
    trees.forEach(tree => {
      tree.splits.forEach(s => {
        const w = s.gain * s.nSamples / nTotal;
        imp[s.feature] += w;
        tot += w;
      });
    });
    if (tot > 0) { imp.x1 /= tot; imp.x2 /= tot; }
    return imp;
  }

  // ── Bootstrap sampling ────────────────────────────────────────────────────

  function bootstrap(data, rand) {
    const counts = new Array(data.length).fill(0);
    const sample = [];
    for (let i = 0; i < data.length; i++) {
      const j = Math.floor(rand() * data.length);
      counts[j]++;
      sample.push(data[j]);
    }
    const oobMask     = counts.map(c => c === 0);
    const uniqueCount = counts.filter(c => c > 0).length;
    return { sample, counts, oobMask, uniqueCount };
  }

  // ── Main runner ───────────────────────────────────────────────────────────

  function run(data) {
    const steps         = [];
    const rand          = seededRand(77);
    const N_TREES       = 3;
    const MAX_DEPTH     = 2;
    const QUERY         = { x1: 5.0, x2: 4.9 };

    const treeColor = ['#6c5ce7', '#00b894', '#e17055'];  // per-tree colors

    // Step 0: raw data
    steps.push({
      type:           'raw',
      trees:          [],
      oobAccuracies:  [],
      codeLine:       -1,
      caption:        `Raw training set — ${data.length} points, 2D binary classification ` +
                      `(red = class 0, blue = class 1). Four Gaussian clusters in XOR pattern. ` +
                      `Random Forest will build ${N_TREES} trees on bootstrap samples and combine votes.`,
    });

    const trees          = [];
    const bootstrapInfos = [];
    const oobAccuracies  = [];

    for (let t = 0; t < N_TREES; t++) {
      const bs = bootstrap(data, rand);
      bootstrapInfos.push(bs);

      // Bootstrap step
      steps.push({
        type:          'bootstrap',
        treeIdx:       t,
        treeColor:     treeColor[t],
        counts:        bs.counts,
        oobMask:       bs.oobMask,
        uniqueCount:   bs.uniqueCount,
        trees:         trees.map(tr => ({ splits: tr.splits.slice(), leaves: tr.leaves.slice() })),
        oobAccuracies: oobAccuracies.slice(),
        codeLine:      1,
        caption:       `Tree ${t + 1} — Bootstrap sampling: ${data.length} points drawn ` +
                       `with replacement. ` +
                       `${bs.uniqueCount} unique (~${(bs.uniqueCount / data.length * 100).toFixed(0)}%), ` +
                       `${data.length - bs.uniqueCount} out-of-bag (OOB, grayed). ` +
                       `Larger dots = sampled multiple times.`,
      });

      // Train tree
      const tree   = buildTree(bs.sample, MAX_DEPTH);
      const oobAcc = oobAccuracy(tree, data, bs.oobMask);
      trees.push(tree);
      oobAccuracies.push(oobAcc);

      const oobAccStr = oobAcc !== null ? `${(oobAcc * 100).toFixed(1)}%` : 'N/A';

      // Tree step
      steps.push({
        type:          'tree',
        treeIdx:       t,
        treeColor:     treeColor[t],
        counts:        bs.counts,
        oobMask:       bs.oobMask,
        currentTree:   { splits: tree.splits.slice(), leaves: tree.leaves.slice() },
        trees:         trees.map(tr => ({ splits: tr.splits.slice(), leaves: tr.leaves.slice() })),
        oobAccuracies: oobAccuracies.slice(),
        codeLine:      2,
        caption:       `Tree ${t + 1} trained — ${tree.splits.length} split${tree.splits.length !== 1 ? 's' : ''}, ` +
                       `${tree.leaves.length} leaf regions. ` +
                       `OOB accuracy (on ${data.length - bs.uniqueCount} held-out points) = ${oobAccStr}.`,
      });
    }

    // Query step
    const votes    = trees.map(tr => predictPoint(tr, QUERY));
    const vote1    = votes.filter(v => v === 1).length;
    const finalPred = vote1 * 2 > trees.length ? 1 : 0;
    const agree     = Math.max(vote1, trees.length - vote1);

    steps.push({
      type:          'query',
      queryPoint:    { ...QUERY },
      votes,
      finalPred,
      treeColors:    treeColor,
      trees:         trees.map(tr => ({ splits: tr.splits.slice(), leaves: tr.leaves.slice() })),
      oobAccuracies: oobAccuracies.slice(),
      codeLine:      5,
      caption:       `Query point ★ at (${QUERY.x1}, ${QUERY.x2}) to classify. ` +
                     `Tree 1 → class ${votes[0]}, Tree 2 → class ${votes[1]}, Tree 3 → class ${votes[2]}. ` +
                     `Majority vote: class ${finalPred} (${agree}/${trees.length} trees agree). ` +
                     `Coloured rings around the star show each tree's vote.`,
    });

    // Final step
    const ensOOB  = ensembleOOBAccuracy(trees, bootstrapInfos, data);
    const featImp = featureImportance(trees, data.length);
    const ensOOBStr = ensOOB !== null ? `${((1 - ensOOB) * 100).toFixed(1)}%` : '—';

    steps.push({
      type:           'final',
      queryPoint:     { ...QUERY },
      votes,
      finalPred,
      treeColors:     treeColor,
      trees:          trees.map(tr => ({ splits: tr.splits.slice(), leaves: tr.leaves.slice() })),
      oobAccuracies:  oobAccuracies.slice(),
      ensembleOOB:    ensOOB,
      featureImportance: featImp,
      codeLine:       6,
      caption:        `Ensemble decision regions — majority vote of ${N_TREES} trees. ` +
                      `OOB error = ${ensOOBStr} (free estimate, no validation split needed). ` +
                      `Feature importance: x1 = ${(featImp.x1 * 100).toFixed(1)}%, ` +
                      `x2 = ${(featImp.x2 * 100).toFixed(1)}%.`,
    });

    return steps;
  }

  window.STEPS = run(window.DATA);
})();
