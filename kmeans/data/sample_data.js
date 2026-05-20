// Seeded LCG random number generator for reproducible data
function seededRand(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function randGaussian(rand) {
  // Box-Muller transform
  const u = rand() + 1e-10;
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

(function () {
  const rand = seededRand(42);
  const clusters = [
    { cx: 2.5, cy: 2.5, n: 25 },
    { cx: 7.5, cy: 3.0, n: 25 },
    { cx: 5.0, cy: 7.5, n: 25 },
  ];

  const points = [];
  clusters.forEach(({ cx, cy, n }, label) => {
    for (let i = 0; i < n; i++) {
      points.push({
        x: cx + randGaussian(rand) * 0.85,
        y: cy + randGaussian(rand) * 0.85,
        trueLabel: label,
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
