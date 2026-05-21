// Decision Tree (CART) with Gini impurity — step-by-step snapshot generator.
// Max depth = 2, 2D XOR binary dataset.
// Produces window.STEPS consumed by the step controller.

(function () {

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

  function runDecisionTree(data, maxDepth) {
    const steps       = [];
    const committed   = [];   // applied splits — grows as tree is built
    const giniHistory = [];
    const giniLabels  = [];
    const giniIsLeaf  = [];   // true = leaf node (pure/max-depth), false = internal

    function snap(type, region, extra) {
      return Object.assign({
        type,
        appliedSplits: committed.map(s => ({ ...s, region: { ...s.region } })),
        region: region ? { ...region } : null,
        giniHistory: [...giniHistory],
        giniLabels:  [...giniLabels],
        giniIsLeaf:  [...giniIsLeaf],
      }, extra || {});
    }

    // Step 0: raw data
    steps.push(snap('raw', null, {
      caption: `Raw dataset — ${data.length} points, two classes (red = 0, blue = 1). ` +
               `4 clusters, not linearly separable. ` +
               `CART recursively splits the feature space to minimise Gini impurity.`,
      codeLine: -1,
    }));

    function build(nodeData, region, depth, pathLabel) {
      const g  = gini(nodeData);
      const n1 = nodeData.filter(p => p.y === 1).length;
      const n0 = nodeData.length - n1;
      const p1 = n1 / nodeData.length;
      const p0 = 1 - p1;
      const isLeaf = depth >= maxDepth || g < 1e-4;

      giniHistory.push(g);
      giniLabels.push(pathLabel);
      giniIsLeaf.push(isLeaf);

      steps.push(snap(isLeaf ? 'leaf' : 'node', region, {
        gini:   g,
        nodeN:  nodeData.length,
        nodeN1: n1,
        nodeN0: n0,
        depth,
        codeLine: isLeaf ? 1 : 2,
        caption: isLeaf
          ? `Leaf "${pathLabel}" (depth ${depth}): n=${nodeData.length}, ` +
            `class-1=${n1}, class-0=${n0}. Gini = ${g.toFixed(4)}. ` +
            `${depth >= maxDepth ? 'Max depth reached' : 'Pure node'}. Predict class ${majority(nodeData)}.`
          : `Node "${pathLabel}" (depth ${depth}): n=${nodeData.length}, ` +
            `class-1=${n1}, class-0=${n0}. ` +
            `Gini = 2×${p1.toFixed(3)}×${p0.toFixed(3)} = ${g.toFixed(4)}. Searching for best split…`,
      }));

      if (isLeaf) {
        return { type: 'leaf', label: majority(nodeData), region: { ...region },
                 gini: g, n: nodeData.length, n1, n0 };
      }

      const { feature, threshold, gain } = findBestSplit(nodeData);
      const left  = nodeData.filter(p => p[feature] <= threshold);
      const right = nodeData.filter(p => p[feature] > threshold);
      const gL = gini(left), gR = gini(right);

      steps.push(snap('split', region, {
        pendingSplit: { feature, threshold },
        giniGain:  gain,
        giniLeft:  gL,
        giniRight: gR,
        leftN:  left.length,
        rightN: right.length,
        depth,
        codeLine: 3,
        caption: `"${pathLabel}" best split: ${feature} ≤ ${threshold.toFixed(2)}, ` +
                 `Gini gain = ${gain.toFixed(4)}. ` +
                 `Left: n=${left.length}, Gini=${gL.toFixed(4)}. ` +
                 `Right: n=${right.length}, Gini=${gR.toFixed(4)}.`,
      }));

      // Commit the split
      committed.push({ feature, threshold, region: { ...region }, depth });

      const leftReg  = { ...region };
      const rightReg = { ...region };
      if (feature === 'x1') { leftReg.x1Max = threshold; rightReg.x1Min = threshold; }
      else                  { leftReg.x2Max = threshold; rightReg.x2Min = threshold; }

      const leftNode  = build(left,  leftReg,  depth + 1, pathLabel === 'Root' ? 'L' : pathLabel + 'L');
      const rightNode = build(right, rightReg, depth + 1, pathLabel === 'Root' ? 'R' : pathLabel + 'R');

      return { type: 'internal', feature, threshold,
               left: leftNode, right: rightNode, region: { ...region } };
    }

    const tree = build(data, { x1Min: 0, x1Max: 10, x2Min: 0, x2Max: 10 }, 0, 'Root');

    function collectLeaves(node) {
      return node.type === 'leaf' ? [node] : [...collectLeaves(node.left), ...collectLeaves(node.right)];
    }
    const leaves = collectLeaves(tree);

    const acc = data.filter(p => {
      const lf = leaves.find(l =>
        p.x1 >= l.region.x1Min && p.x1 <= l.region.x1Max &&
        p.x2 >= l.region.x2Min && p.x2 <= l.region.x2Max);
      return lf && lf.label === p.y;
    }).length / data.length;

    steps.push(snap('final', null, {
      leaves,
      accuracy: acc,
      codeLine: 7,
      caption: `Tree complete: ${leaves.length} leaf regions, max depth ${maxDepth}. ` +
               `Accuracy = ${(acc * 100).toFixed(1)}%. ` +
               `Colored regions show predicted class (blue = 1, red = 0). ✓/✗ = correct/wrong.`,
    }));

    return steps;
  }

  window.STEPS = runDecisionTree(window.DATA, 2);
})();
