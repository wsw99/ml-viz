// Pure K-Means implementation.
// Produces window.STEPS — an array of snapshots, one per visualisation step.

(function () {
  function dist2(a, b) {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  }

  function nearestCentroid(point, centroids) {
    let best = 0, bestD = Infinity;
    centroids.forEach((c, i) => {
      const d = dist2(point, c);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function updateCentroids(points, assignments, k) {
    return Array.from({ length: k }, (_, ci) => {
      const members = points.filter((_, i) => assignments[i] === ci);
      if (members.length === 0) return { x: 5, y: 5 };
      return {
        x: members.reduce((s, p) => s + p.x, 0) / members.length,
        y: members.reduce((s, p) => s + p.y, 0) / members.length,
      };
    });
  }

  function computeWCSS(points, assignments, centroids) {
    return points.reduce((sum, p, i) => sum + dist2(p, centroids[assignments[i]]), 0);
  }

  function converged(a, b) {
    return a.every((c, i) => Math.abs(c.x - b[i].x) < 1e-6 && Math.abs(c.y - b[i].y) < 1e-6);
  }

  // Pick the point nearest to a cluster boundary (most "borderline" point).
  // Criterion: smallest ratio of d_nearest / d_second_nearest (closest to 1).
  function pickBorderlinePoint(points, centroids) {
    let bestRatio = 0, bestIdx = 0;
    points.forEach((p, i) => {
      const dists = centroids.map(c => Math.sqrt(dist2(p, c))).sort((a, b) => a - b);
      if (dists.length < 2 || dists[1] === 0) return;
      const ratio = dists[0] / dists[1];
      if (ratio > bestRatio) { bestRatio = ratio; bestIdx = i; }
    });
    return bestIdx;
  }

  function snap(type, points, centroids, prevCentroids, caption, codeLine, wcssHistory, iteration, extra) {
    return Object.assign({
      type,
      points: points.map(p => ({ ...p })),
      centroids: centroids.map(c => ({ ...c })),
      prevCentroids: prevCentroids ? prevCentroids.map(c => ({ ...c })) : null,
      caption,
      codeLine,
      wcssHistory: [...wcssHistory],
      iteration,
    }, extra || {});
  }

  function runKMeans(data, k, seed) {
    const steps = [];
    const rand  = seededRand(seed);

    // ── Step 0: raw unlabelled data ──────────────────────────────────────
    const raw = data.map(p => ({ ...p, cluster: -1 }));
    steps.push(snap('raw', raw, [], null,
      `Raw dataset — ${data.length} unlabelled 2D points drawn from ${k} Gaussian clusters. ` +
      `No labels. K-Means will discover the groups from scratch.`,
      -1, [], 0));

    // ── Step 1: initialise centroids ─────────────────────────────────────
    const chosen = new Set();
    while (chosen.size < k) chosen.add(Math.floor(rand() * data.length));
    let centroids = [...chosen].map(i => ({ x: data[i].x, y: data[i].y }));

    steps.push(snap('init', raw, centroids, null,
      `Initialise ${k} centroids by sampling ${k} random data points (shown as stars). ` +
      `These are the starting guesses for the cluster centres.`,
      0, [], 0));

    let assignments = raw.map(() => -1);
    const wcssHistory = [];

    for (let iter = 0; iter < 15; iter++) {
      const prevAssigned = data.map((p, i) => ({ ...p, cluster: assignments[i] }));

      // ── Distance step: show one borderline point's distances ──────────
      const fIdx = pickBorderlinePoint(data, centroids);
      const fp   = data[fIdx];
      const dists = centroids.map((c, ci) => {
        const d = Math.sqrt(dist2(fp, c));
        return { ci, d, formula: `d${ci + 1} = √((${fp.x.toFixed(2)}−${c.x.toFixed(2)})²+(${fp.y.toFixed(2)}−${c.y.toFixed(2)})²) = ${d.toFixed(2)}` };
      });
      const nearest = dists.reduce((best, cur) => cur.d < best.d ? cur : best);

      steps.push(snap('distance', prevAssigned, centroids, null,
        `Iteration ${iter + 1} — distance check for the highlighted point (${fp.x.toFixed(2)}, ${fp.y.toFixed(2)}): ` +
        dists.map(d => d.formula).join('  |  ') +
        `  →  nearest: centroid ${nearest.ci + 1} (d = ${nearest.d.toFixed(2)}).`,
        2, wcssHistory, iter + 1,
        { focusPoint: { ...fp }, focusDistances: dists, focusNearest: nearest.ci }));

      // ── Assign step ───────────────────────────────────────────────────
      const newAssignments = data.map(p => nearestCentroid(p, centroids));
      const assigned = data.map((p, i) => ({ ...p, cluster: newAssignments[i] }));
      steps.push(snap('assign', assigned, centroids, null,
        `Iteration ${iter + 1}: assign every point to its nearest centroid. ` +
        `Lines connect each point to its assigned centroid.`,
        2, wcssHistory, iter + 1));

      // ── Update step ───────────────────────────────────────────────────
      const newCentroids = updateCentroids(data, newAssignments, k);
      const wcss = computeWCSS(data, newAssignments, newCentroids);
      wcssHistory.push(wcss);
      steps.push(snap('update', assigned, newCentroids, centroids,
        `Iteration ${iter + 1}: move each centroid to the mean of its cluster. ` +
        `Dashed arrows show movement. WCSS = ${wcss.toFixed(2)}.`,
        3, wcssHistory, iter + 1));

      const done = converged(centroids, newCentroids);
      centroids  = newCentroids;
      assignments = newAssignments;
      if (done) break;
    }

    // ── Final step: Voronoi regions ───────────────────────────────────────
    const final = data.map((p, i) => ({ ...p, cluster: assignments[i] }));
    steps.push(snap('final', final, centroids, null,
      `Converged after ${wcssHistory.length} iteration${wcssHistory.length > 1 ? 's' : ''}. ` +
      `Final WCSS = ${wcssHistory[wcssHistory.length - 1].toFixed(2)}. ` +
      `Background shows Voronoi regions — every pixel is coloured by its nearest centroid.`,
      4, wcssHistory, wcssHistory.length));

    return steps;
  }

  window.STEPS = runKMeans(window.DATA, 3, 7);
})();
