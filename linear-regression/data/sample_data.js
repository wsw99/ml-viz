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

(function () {
  const rand = seededRand(99);
  const W_TRUE = 0.65, B_TRUE = 1.5, NOISE = 0.85;

  const points = [];
  for (let i = 0; i < 40; i++) {
    const x = 0.5 + rand() * 9.0;          // x ∈ [0.5, 9.5]
    const y = W_TRUE * x + B_TRUE + randGaussian(rand) * NOISE;
    points.push({ x, y });
  }

  window.DATA = points;
})();
