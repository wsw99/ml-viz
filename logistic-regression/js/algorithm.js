// Pure Logistic Regression via Gradient Descent.
// Both features are centred (x_c = x − x̄) so the optimal bias ≈ 0,
// which keeps the Hessian well-conditioned and convergence fast.
// Every snapshot stores the standard-form (w1, w2, b) for the renderer.
// Produces window.STEPS — array of snapshots consumed by the step controller.

(function () {
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  // Centred-space prediction
  function predictC(p, w1, w2, bc, x1M, x2M) {
    return sigmoid(w1 * (p.x1 - x1M) + w2 * (p.x2 - x2M) + bc);
  }

  function computeLoss(data, w1, w2, bc, x1M, x2M) {
    const eps = 1e-12;
    return -data.reduce((s, p) => {
      const yh = predictC(p, w1, w2, bc, x1M, x2M);
      return s + p.y * Math.log(yh + eps) + (1 - p.y) * Math.log(1 - yh + eps);
    }, 0) / data.length;
  }

  function computeGrads(data, w1, w2, bc, x1M, x2M) {
    const n = data.length;
    let dw1 = 0, dw2 = 0, dbc = 0;
    data.forEach(p => {
      const err = predictC(p, w1, w2, bc, x1M, x2M) - p.y;
      dw1 += err * (p.x1 - x1M);
      dw2 += err * (p.x2 - x2M);
      dbc += err;
    });
    return { dw1: dw1 / n, dw2: dw2 / n, dbc: dbc / n };
  }

  function computeAccuracy(data, w1, w2, bc, x1M, x2M) {
    const correct = data.filter(p =>
      Math.round(predictC(p, w1, w2, bc, x1M, x2M)) === p.y
    ).length;
    return correct / data.length;
  }

  // Convert centred params → standard-form bias: b = bc − w1·x̄₁ − w2·x̄₂
  function toStd(w1, w2, bc, x1M, x2M) {
    return { w1, w2, b: bc - w1 * x1M - w2 * x2M };
  }

  function snap(type, w1, w2, b, pW1, pW2, pB, caption, codeLine, lossHistory, iter, extra) {
    return Object.assign({
      type, w1, w2, b,
      prevW1: pW1, prevW2: pW2, prevB: pB,
      caption, codeLine,
      lossHistory: [...lossHistory],
      iteration: iter,
    }, extra || {});
  }

  // ── Main algorithm ────────────────────────────────────────────────────────
  function runLogisticRegression(data, lr, seed) {
    const rand = seededRand(seed);
    const steps = [];
    const lossHistory = [];

    const x1M = data.reduce((s, p) => s + p.x1, 0) / data.length;
    const x2M = data.reduce((s, p) => s + p.x2, 0) / data.length;

    // ── Step 0: raw data ──────────────────────────────────────────────────
    steps.push(snap('raw', 0, 0, 0, null, null, null,
      `Raw dataset — ${data.length} points, two classes (red = 0, blue = 1). ` +
      `Goal: learn a linear boundary ŷ = σ(w₁x₁ + w₂x₂ + b) that separates the two classes.`,
      -1, [], 0));

    // ── Initialise ────────────────────────────────────────────────────────
    let w1 = (rand() - 0.5) * 0.4;
    let w2 = (rand() - 0.5) * 0.4;
    let bc = (rand() - 0.5) * 0.2;   // bias in centred space (should stay near 0)
    let { w1: ws1, w2: ws2, b: bs } = toStd(w1, w2, bc, x1M, x2M);

    steps.push(snap('init', ws1, ws2, bs, null, null, null,
      `Random init: w₁=${w1.toFixed(3)}, w₂=${w2.toFixed(3)}, bc=${bc.toFixed(3)}. ` +
      `Standard form: b=${bs.toFixed(3)}.  ` +
      `Initial log-loss = ${computeLoss(data, w1, w2, bc, x1M, x2M).toFixed(4)}.`,
      0, [], 0));

    // ── Gradient descent loop ─────────────────────────────────────────────
    for (let iter = 0; iter < 60; iter++) {
      const loss = computeLoss(data, w1, w2, bc, x1M, x2M);
      const { w1: cw1, w2: cw2, b: cb } = toStd(w1, w2, bc, x1M, x2M);

      // Focus: point closest to decision boundary (most uncertain prediction)
      let focusIdx = 0, minDist = Infinity;
      data.forEach((p, i) => {
        const dist = Math.abs(predictC(p, w1, w2, bc, x1M, x2M) - 0.5);
        if (dist < minDist) { minDist = dist; focusIdx = i; }
      });
      const fp   = data[focusIdx];
      const yHat = predictC(fp, w1, w2, bc, x1M, x2M);
      const zVal = w1 * (fp.x1 - x1M) + w2 * (fp.x2 - x2M) + bc;

      // ── Sub-step A: predict ─────────────────────────────────────────────
      steps.push(snap('predict', cw1, cw2, cb, null, null, null,
        `Iter ${iter + 1}: ŷᵢ = σ(w₁x₁ᵢ + w₂x₂ᵢ + b) for all points. ` +
        `Log-loss = ${loss.toFixed(4)}.  Accuracy = ${(computeAccuracy(data, w1, w2, bc, x1M, x2M) * 100).toFixed(1)}%. ` +
        `Most uncertain point (closest to boundary): z = ${zVal.toFixed(3)}, σ(z) = ${yHat.toFixed(3)}, true y = ${fp.y}.`,
        2, lossHistory, iter + 1, { focusIdx, yHat, zVal }));

      // ── Sub-step B: gradients ───────────────────────────────────────────
      const { dw1, dw2, dbc } = computeGrads(data, w1, w2, bc, x1M, x2M);
      const fErr = yHat - fp.y;
      steps.push(snap('gradient', cw1, cw2, cb, null, null, null,
        `Iter ${iter + 1}: ∂L/∂w₁ = ${dw1.toFixed(5)}, ∂L/∂w₂ = ${dw2.toFixed(5)}, ∂L/∂b = ${dbc.toFixed(5)}. ` +
        `Focus point: ŷ−y = ${fErr.toFixed(3)}, contrib to ∂L/∂w₁: ${(fErr*(fp.x1-x1M)/data.length).toFixed(5)}.`,
        3, lossHistory, iter + 1, { focusIdx, yHat, dw1, dw2, dbc }));

      // ── Sub-step C: update ──────────────────────────────────────────────
      const { w1: pw1, w2: pw2, b: pb } = toStd(w1, w2, bc, x1M, x2M);
      w1 -= lr * dw1;
      w2 -= lr * dw2;
      bc -= lr * dbc;
      const { w1: nw1, w2: nw2, b: nb } = toStd(w1, w2, bc, x1M, x2M);
      const newLoss = computeLoss(data, w1, w2, bc, x1M, x2M);
      const acc     = computeAccuracy(data, w1, w2, bc, x1M, x2M);
      lossHistory.push(newLoss);

      steps.push(snap('update', nw1, nw2, nb, pw1, pw2, pb,
        `Iter ${iter + 1}: w₁ ← ${(w1+lr*dw1).toFixed(4)}−${lr}×${dw1.toFixed(4)}=${w1.toFixed(4)}, ` +
        `w₂ ← ${w2.toFixed(4)}, b ← ${nb.toFixed(4)}.  ` +
        `Log-loss: ${loss.toFixed(4)} → ${newLoss.toFixed(4)},  Accuracy: ${(acc*100).toFixed(1)}%.`,
        4, lossHistory, iter + 1, { dw1, dw2, dbc, acc }));

      if (Math.abs(dw1) < 1e-4 && Math.abs(dw2) < 1e-4 && Math.abs(dbc) < 1e-4) break;
    }

    // ── Final step ────────────────────────────────────────────────────────
    const finalLoss = computeLoss(data, w1, w2, bc, x1M, x2M);
    const finalAcc  = computeAccuracy(data, w1, w2, bc, x1M, x2M);
    const { w1: fw1, w2: fw2, b: fb } = toStd(w1, w2, bc, x1M, x2M);

    // Compute precision, recall, F1 for final step
    let tp = 0, fp2 = 0, fn = 0, tn = 0;
    data.forEach(p => {
      const pred = Math.round(predictC(p, w1, w2, bc, x1M, x2M));
      if (p.y === 1 && pred === 1) tp++;
      else if (p.y === 0 && pred === 1) fp2++;
      else if (p.y === 1 && pred === 0) fn++;
      else tn++;
    });
    const precision = tp + fp2 > 0 ? tp / (tp + fp2) : 0;
    const recall    = tp + fn  > 0 ? tp / (tp + fn)  : 0;
    const f1        = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;

    steps.push(snap('final', fw1, fw2, fb, null, null, null,
      `Converged in ${lossHistory.length} iteration${lossHistory.length !== 1 ? 's' : ''}. ` +
      `ŷ = σ(${fw1.toFixed(4)}·x₁ + ${fw2.toFixed(4)}·x₂ + ${fb.toFixed(4)}).  ` +
      `Log-loss = ${finalLoss.toFixed(4)},  Accuracy = ${(finalAcc*100).toFixed(1)}%,  ` +
      `Precision = ${precision.toFixed(3)},  Recall = ${recall.toFixed(3)},  F1 = ${f1.toFixed(3)}.`,
      5, lossHistory, lossHistory.length,
      { acc: finalAcc, precision, recall, f1, tp, fp: fp2, fn, tn }));

    return steps;
  }

  window.STEPS = runLogisticRegression(window.DATA, 0.2, 13);
})();
