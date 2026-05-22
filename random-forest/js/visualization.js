// Canvas renderer for Random Forest visualisation.

(function () {

  const C0_FILL  = '#e74c3c';
  const C1_FILL  = '#3498db';
  const LEAF_C1  = 'rgba(52,  152, 219, 0.17)';
  const LEAF_C0  = 'rgba(231,  76,  60, 0.17)';
  const ENS_C1   = 'rgba(52,  152, 219, 0.20)';
  const ENS_C0   = 'rgba(231,  76,  60, 0.20)';
  const OOB_FILL = 'rgba(178, 190, 195, 0.55)';
  const GRID_RES = 60;  // grid resolution for ensemble region rendering

  // ── Local predict helpers ──────────────────────────────────────────────────

  function predictTree(tree, x1, x2) {
    const leaf = tree.leaves.find(l =>
      x1 >= l.region.x1Min && x1 <= l.region.x1Max &&
      x2 >= l.region.x2Min && x2 <= l.region.x2Max);
    return leaf ? leaf.label : 0;
  }

  function ensemblePredict(trees, x1, x2) {
    const v1 = trees.map(t => predictTree(t, x1, x2)).filter(v => v === 1).length;
    return v1 * 2 > trees.length ? 1 : 0;
  }

  // ── Main class ─────────────────────────────────────────────────────────────

  class RandomForestViz {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx    = this.canvas.getContext('2d');
      this.W      = this.canvas.width;
      this.H      = this.canvas.height;
      this.pad    = 48;
    }

    px(wx) { return this.pad + (wx / 10) * (this.W - 2 * this.pad); }
    py(wy) { return (this.H - this.pad) - (wy / 10) * (this.H - 2 * this.pad); }

    _clear() {
      const { ctx, W, H, pad } = this;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.strokeStyle = '#f0f2f5';
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 3]);
      for (let v = 2; v < 10; v += 2) {
        const gx = this.px(v);
        ctx.beginPath(); ctx.moveTo(gx, pad); ctx.lineTo(gx, H - pad); ctx.stroke();
        const gy = this.py(v);
        ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = '#dfe6e9';
      ctx.strokeRect(pad, pad, W - 2 * pad, H - 2 * pad);
      ctx.restore();
      ctx.save();
      ctx.font = '10px Segoe UI, sans-serif'; ctx.fillStyle = '#b2bec3';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let v = 0; v <= 10; v += 2) ctx.fillText(v, this.px(v), H - pad + 4);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let v = 0; v <= 10; v += 2) ctx.fillText(v, pad - 5, this.py(v));
      ctx.restore();
    }

    // Draw one tree's leaf regions as colored rectangles
    _drawTreeRegions(tree, alpha) {
      const { ctx } = this;
      tree.leaves.forEach(lf => {
        const x = this.px(lf.region.x1Min);
        const y = this.py(lf.region.x2Max);
        const w = this.px(lf.region.x1Max) - x;
        const h = this.py(lf.region.x2Min) - y;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = lf.label === 1 ? C1_FILL : C0_FILL;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      });
    }

    // Draw split lines for a tree
    _drawSplits(tree, color) {
      const { ctx } = this;
      tree.splits.forEach(s => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth   = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        if (s.feature === 'x1') {
          const x = this.px(s.threshold);
          ctx.moveTo(x, this.py(s.region.x2Min));
          ctx.lineTo(x, this.py(s.region.x2Max));
        } else {
          const y = this.py(s.threshold);
          ctx.moveTo(this.px(s.region.x1Min), y);
          ctx.lineTo(this.px(s.region.x1Max), y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });
    }

    // Draw all points, optionally with bootstrap highlighting
    _drawPoints(data, opts = {}) {
      const { ctx } = this;
      const { counts = null, oobMask = null } = opts;

      data.forEach((p, i) => {
        const x  = this.px(p.x1);
        const y  = this.py(p.x2);
        const cnt = counts ? counts[i] : 1;
        const isOOB = oobMask ? oobMask[i] : false;

        const r = isOOB ? 3.5 : 3.5 + Math.min(cnt - 1, 3) * 2.5;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);

        if (isOOB) {
          ctx.fillStyle   = OOB_FILL;
          ctx.strokeStyle = 'rgba(150,150,150,0.3)';
        } else {
          ctx.fillStyle   = p.y === 1 ? C1_FILL : C0_FILL;
          ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        }
        ctx.lineWidth = 0.8;
        ctx.fill();
        ctx.stroke();

        // Count badge for duplicates
        if (!isOOB && counts && cnt > 1) {
          ctx.save();
          ctx.font = `bold 8px Segoe UI, sans-serif`;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`×${cnt}`, x, y);
          ctx.restore();
        }
      });
    }

    // Draw ensemble decision regions via grid sampling
    _drawEnsembleRegions(trees) {
      const { ctx, W, H, pad } = this;
      const cw = (W - 2 * pad) / GRID_RES;
      const ch = (H - 2 * pad) / GRID_RES;

      for (let row = 0; row < GRID_RES; row++) {
        for (let col = 0; col < GRID_RES; col++) {
          const wx = (col + 0.5) / GRID_RES * 10;
          const wy = (1 - (row + 0.5) / GRID_RES) * 10;
          const pred = ensemblePredict(trees, wx, wy);
          ctx.fillStyle = pred === 1 ? ENS_C1 : ENS_C0;
          ctx.fillRect(pad + col * cw, pad + row * ch, cw + 0.5, ch + 0.5);
        }
      }
    }

    // Draw single-tree decision regions via grid (for tree step)
    _drawSingleTreeRegions(tree) {
      const { ctx, W, H, pad } = this;
      const cw = (W - 2 * pad) / GRID_RES;
      const ch = (H - 2 * pad) / GRID_RES;

      for (let row = 0; row < GRID_RES; row++) {
        for (let col = 0; col < GRID_RES; col++) {
          const wx   = (col + 0.5) / GRID_RES * 10;
          const wy   = (1 - (row + 0.5) / GRID_RES) * 10;
          const pred = predictTree(tree, wx, wy);
          ctx.fillStyle = pred === 1 ? LEAF_C1 : LEAF_C0;
          ctx.fillRect(pad + col * cw, pad + row * ch, cw + 0.5, ch + 0.5);
        }
      }
    }

    // Draw the query star
    _drawQueryStar(qp, predClass) {
      const { ctx } = this;
      const x  = this.px(qp.x1);
      const y  = this.py(qp.x2);
      const r  = 10;
      const color = predClass === undefined ? '#f39c12' : (predClass === 1 ? C1_FILL : C0_FILL);

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a1 = (i * 4 * Math.PI / 5) - Math.PI / 2;
        const a2 = (i * 4 * Math.PI / 5 + 2 * Math.PI / 5) - Math.PI / 2;
        ctx.lineTo(x + r * Math.cos(a1), y + r * Math.sin(a1));
        ctx.lineTo(x + (r * 0.4) * Math.cos(a2), y + (r * 0.4) * Math.sin(a2));
      }
      ctx.closePath();
      ctx.fillStyle   = color;
      ctx.strokeStyle = '#2d3436';
      ctx.lineWidth   = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Draw coloured vote rings around the query star (one per tree)
    _drawVoteRings(qp, votes, treeColors) {
      const { ctx } = this;
      const cx = this.px(qp.x1);
      const cy = this.py(qp.x2);
      const angles = [-Math.PI / 2 - 0.6, -Math.PI / 2, -Math.PI / 2 + 0.6];
      const RING_R = 22;

      votes.forEach((vote, i) => {
        const ax = cx + RING_R * Math.cos(angles[i]);
        const ay = cy + RING_R * Math.sin(angles[i]);

        ctx.save();
        ctx.beginPath();
        ctx.arc(ax, ay, 6, 0, Math.PI * 2);
        ctx.fillStyle   = vote === 1 ? C1_FILL : C0_FILL;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth   = 2;
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 7px Segoe UI, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`T${i + 1}`, ax, ay);
        ctx.restore();
      });
    }

    // Draw a label above canvas showing which tree is active
    _drawTreeLabel(idx, color) {
      const { ctx, W, pad } = this;
      ctx.save();
      ctx.font      = 'bold 12px Segoe UI, sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`Tree ${idx + 1}`, W / 2, pad - 16);
      ctx.restore();
    }

    // ── Main render entry ────────────────────────────────────────────────────

    render(step, data) {
      this._clear();

      if (step.type === 'raw') {
        this._drawPoints(data);
        return;
      }

      if (step.type === 'bootstrap') {
        this._drawPoints(data, { counts: step.counts, oobMask: step.oobMask });
        this._drawTreeLabel(step.treeIdx, step.treeColor);
        return;
      }

      if (step.type === 'tree') {
        this._drawSingleTreeRegions(step.currentTree);
        this._drawSplits(step.currentTree, step.treeColor);
        this._drawPoints(data);
        this._drawTreeLabel(step.treeIdx, step.treeColor);
        return;
      }

      if (step.type === 'query') {
        this._drawPoints(data);
        this._drawQueryStar(step.queryPoint);
        this._drawVoteRings(step.queryPoint, step.votes, step.treeColors);
        return;
      }

      if (step.type === 'final') {
        this._drawEnsembleRegions(step.trees);
        this._drawPoints(data);
        this._drawQueryStar(step.queryPoint, step.finalPred);
        this._drawVoteRings(step.queryPoint, step.votes, step.treeColors);
        return;
      }
    }
  }

  window.RandomForestViz = RandomForestViz;
})();
