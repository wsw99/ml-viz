// Pure Linear Regression via Gradient Descent.
// Uses x-centered features (x_c = x − x̄) for a well-conditioned Hessian,
// which keeps convergence fast without needing a tiny learning rate.
// All step snapshots store standard-form (w, b) so the renderer stays simple.
// Produces window.STEPS — array of snapshots consumed by the step controller.

(function () {
  // ── Centered model ────────────────────────────────────────────────────────
  // ŷ = w·(x − xMean) + c      (c = predicted y at x = x̄)
  // Standard form: y = w·x + b  where  b = c − w·xMean

  function predictC(x, w, c, xMean) {
    return w * (x - xMean) + c;
  }

  function computeMSE(data, w, c, xMean) {
    return data.reduce((s, p) => s + (predictC(p.x, w, c, xMean) - p.y) ** 2, 0) / data.length;
  }

  function computeGrads(data, w, c, xMean) {
    const n = data.length;
    let dw = 0, dc = 0;
    data.forEach(p => {
      const err = predictC(p.x, w, c, xMean) - p.y;
      dw += err * (p.x - xMean);
      dc += err;
    });
    return { dw: 2 / n * dw, dc: 2 / n * dc };
  }

  function computeR2(data, w, c, xMean) {
    const yMean = data.reduce((s, p) => s + p.y, 0) / data.length;
    const ssTot = data.reduce((s, p) => s + (p.y - yMean) ** 2, 0);
    const ssRes = data.reduce((s, p) => s + (predictC(p.x, w, c, xMean) - p.y) ** 2, 0);
    return 1 - ssRes / ssTot;
  }

  // Convert (w, c) → standard form (w, b = c − w·x̄)
  function toStd(w, c, xMean) {
    return { w, b: c - w * xMean };
  }

  function snap(type, w, b, prevW, prevB, caption, codeLine, lossHistory, iteration, extra) {
    return Object.assign({
      type, w, b, prevW, prevB,
      caption, codeLine,
      lossHistory: [...lossHistory],
      iteration,
    }, extra || {});
  }

  // ── Main algorithm ────────────────────────────────────────────────────────
  function runLinearRegression(data, lr, seed) {
    const rand = seededRand(seed);
    const steps = [];
    const lossHistory = [];

    const xMean = data.reduce((s, p) => s + p.x, 0) / data.length;

    // ── Step 0: raw data ──────────────────────────────────────────────────
    steps.push(snap('raw', 0, 5, null, null,
      `Raw dataset — ${data.length} points with a noisy linear relationship (true line: y ≈ 0.65x + 1.5). ` +
      `Goal: learn w and b so that ŷ = wx + b minimises Mean Squared Error.  x̄ = ${xMean.toFixed(2)}.`,
      -1, [], 0));

    // ── Initialise w, c ───────────────────────────────────────────────────
    let w = (rand() - 0.5) * 0.3;          // small random slope
    let c = 3.5 + rand() * 3;              // intercept at x = x̄, random in [3.5, 6.5]
    let { w: wS, b: bS } = toStd(w, c, xMean);
    const initMSE = computeMSE(data, w, c, xMean);

    steps.push(snap('init', wS, bS, null, null,
      `Random init: w = ${w.toFixed(3)},  c = ${c.toFixed(3)}  (c is predicted ŷ at x = x̄ = ${xMean.toFixed(2)}). ` +
      `Standard form: ŷ = ${wS.toFixed(3)}x + ${bS.toFixed(3)}.  Initial MSE = ${initMSE.toFixed(3)}.`,
      0, [], 0));

    // ── Gradient descent loop ─────────────────────────────────────────────
    for (let iter = 0; iter < 50; iter++) {
      const mse = computeMSE(data, w, c, xMean);
      const { w: curWS, b: curBS } = toStd(w, c, xMean);

      // Focus point: largest absolute residual
      let focusIdx = 0, maxRes = -Infinity;
      data.forEach((p, i) => {
        const r = Math.abs(predictC(p.x, w, c, xMean) - p.y);
        if (r > maxRes) { maxRes = r; focusIdx = i; }
      });
      const fp = data[focusIdx];
      const fErr = predictC(fp.x, w, c, xMean) - fp.y;

      // ── Sub-step A: residuals ───────────────────────────────────────────
      steps.push(snap('residuals', curWS, curBS, null, null,
        `Iter ${iter + 1}: ŷᵢ = ${w.toFixed(3)}·(xᵢ − ${xMean.toFixed(1)}) + ${c.toFixed(3)}. ` +
        `Vertical lines = residuals eᵢ = ŷᵢ − yᵢ. ` +
        `MSE = (1/n)Σeᵢ² = ${mse.toFixed(4)}.  ` +
        `Highlighted point (largest |eᵢ|): eᵢ = ${fErr.toFixed(3)}.`,
        2, lossHistory, iter + 1, { focusIdx }));

      // ── Sub-step B: gradients ───────────────────────────────────────────
      const { dw, dc } = computeGrads(data, w, c, xMean);
      steps.push(snap('gradient', curWS, curBS, null, null,
        `Iter ${iter + 1}: ∂L/∂w = (2/n)Σeᵢ·(xᵢ−x̄) = ${dw.toFixed(5)},  ` +
        `∂L/∂c = (2/n)Σeᵢ = ${dc.toFixed(5)}. ` +
        `Focus point: eᵢ = ${fErr.toFixed(3)},  eᵢ·(xᵢ−x̄) = ${(fErr * (fp.x - xMean)).toFixed(3)}.`,
        3, lossHistory, iter + 1, { focusIdx, dw, dc }));

      // ── Sub-step C: parameter update ────────────────────────────────────
      const { w: prevWS, b: prevBS } = toStd(w, c, xMean);
      w -= lr * dw;
      c -= lr * dc;
      const { w: newWS, b: newBS } = toStd(w, c, xMean);
      wS = newWS;
      bS = newBS;
      const newMSE = computeMSE(data, w, c, xMean);
      const r2 = computeR2(data, w, c, xMean);
      lossHistory.push(newMSE);

      steps.push(snap('update', wS, bS, prevWS, prevBS,
        `Iter ${iter + 1}: w ← ${(w + lr * dw).toFixed(4)} − ${lr}×${dw.toFixed(4)} = ${w.toFixed(4)},  ` +
        `c ← ${(c + lr * dc).toFixed(4)} − ${lr}×${dc.toFixed(4)} = ${c.toFixed(4)}. ` +
        `Standard form: ŷ = ${wS.toFixed(4)}x + ${bS.toFixed(4)}.  ` +
        `MSE ${mse.toFixed(4)} → ${newMSE.toFixed(4)},  R² = ${r2.toFixed(4)}.`,
        4, lossHistory, iter + 1, { dw, dc, r2 }));

      if (Math.abs(dw) < 1e-5 && Math.abs(dc) < 1e-5) break;
    }

    // ── Final step ────────────────────────────────────────────────────────
    const finalMSE  = computeMSE(data, w, c, xMean);
    const finalRMSE = Math.sqrt(finalMSE);
    const finalR2   = computeR2(data, w, c, xMean);

    steps.push(snap('final', wS, bS, null, null,
      `Converged in ${lossHistory.length} iteration${lossHistory.length !== 1 ? 's' : ''}. ` +
      `Fitted line: ŷ = ${wS.toFixed(4)}x + ${bS.toFixed(4)}.  ` +
      `MSE = ${finalMSE.toFixed(4)},  RMSE = ${finalRMSE.toFixed(4)},  R² = ${finalR2.toFixed(4)}.`,
      5, lossHistory, lossHistory.length, { r2: finalR2, rmse: finalRMSE }));

    return steps;
  }

  window.STEPS = runLinearRegression(window.DATA, 0.06, 7);
})();
