// Seeded LCG random number generator — must be defined before algorithm.js loads.
function seededRand(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function randGaussian(rand) {
  const u = rand() + 1e-10;
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// 2D binary classification data: two Gaussian clusters in [0, 10] × [0, 10].
// Class 0 (negative) centred at (3, 3), Class 1 (positive) centred at (7, 7).
(function () {
  const rand = seededRand(77);
  const STD  = 1.1;
  const clusters = [
    { cx: 3.0, cy: 3.0, label: 0, n: 20 },
    { cx: 7.0, cy: 7.0, label: 1, n: 20 },
  ];

  const points = [];
  clusters.forEach(({ cx, cy, label, n }) => {
    for (let i = 0; i < n; i++) {
      points.push({
        x1: cx + randGaussian(rand) * STD,
        x2: cy + randGaussian(rand) * STD,
        y:  label,
      });
    }
  });

  // Fisher-Yates shuffle
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }

  window.DATA = points;
})();
