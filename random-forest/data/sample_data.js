// 4-cluster XOR dataset for Random Forest visualizer.
// Class 0: lower-left (3,3) and upper-right (7,7)
// Class 1: upper-left (3,7) and lower-right (7,3)
// 40 points total — same structure as decision-tree dataset.

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
  const rand = seededRand(99);
  const std  = 0.75;
  const raw  = [];

  const clusters = [
    { cx: 3.0, cy: 3.0, y: 0, n: 12 },
    { cx: 3.0, cy: 7.0, y: 1, n: 12 },
    { cx: 7.0, cy: 7.0, y: 0, n:  8 },
    { cx: 7.0, cy: 3.0, y: 1, n:  8 },
  ];

  clusters.forEach(cl => {
    for (let i = 0; i < cl.n; i++) {
      raw.push({
        x1: Math.max(0.5, Math.min(9.5, randGaussian(rand, cl.cx, std))),
        x2: Math.max(0.5, Math.min(9.5, randGaussian(rand, cl.cy, std))),
        y:  cl.y,
      });
    }
  });

  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }

  window.DATA = raw;
})();
