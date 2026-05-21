// Asymmetric 4-cluster dataset for Decision Tree visualizer.
// Root split: x2 ≈ 5 (horizontal); child splits: x1 ≈ 5 (vertical in each half).
// Cluster sizes (15/15/5/5) ensure ΔGini = 0.125 for root, beating any degenerate split.

function seededRand(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randGaussian(rand, mu, sigma) {
  const u1 = rand(), u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2);
  return mu + sigma * z;
}

(function () {
  const rand = seededRand(42);
  const std  = 0.7;
  const raw  = [];

  // Lower-left (class 0) and upper-right (class 0) are the "majority" clusters (15 pts each)
  // Upper-left (class 1) and lower-right (class 1) are the "minority" clusters (5 pts each)
  // This asymmetry makes x2=5 the best root split (ΔGini ≈ 0.125 >> degenerate alternatives)
  const clusters = [
    { cx: 3.0, cy: 3.0, y: 0, n: 15 },  // lower-left,  class 0
    { cx: 3.0, cy: 7.0, y: 1, n: 15 },  // upper-left,  class 1
    { cx: 7.0, cy: 7.0, y: 0, n:  5 },  // upper-right, class 0
    { cx: 7.0, cy: 3.0, y: 1, n:  5 },  // lower-right, class 1
  ];

  clusters.forEach(cl => {
    for (let i = 0; i < cl.n; i++) {
      raw.push({
        x1: Math.max(0.4, Math.min(9.6, randGaussian(rand, cl.cx, std))),
        x2: Math.max(0.4, Math.min(9.6, randGaussian(rand, cl.cy, std))),
        y:  cl.y,
      });
    }
  });

  // Fisher-Yates shuffle
  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }

  window.DATA = raw;
})();
