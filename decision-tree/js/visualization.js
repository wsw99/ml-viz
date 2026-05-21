// Canvas renderer for Decision Tree visualisation.

(function () {
  const C0_FILL     = '#e74c3c';
  const C1_FILL     = '#3498db';
  const SPLIT_CLR   = '#6c5ce7';
  const PENDING_CLR = '#fdcb6e';
  const NODE_FILL   = 'rgba(108, 92, 231, 0.06)';
  const NODE_STROKE = '#6c5ce7';
  const LEAF_C1     = 'rgba(52, 152, 219, 0.18)';
  const LEAF_C0     = 'rgba(231, 76,  60, 0.18)';

  class DecisionTreeViz {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx    = this.canvas.getContext('2d');
      this.W      = this.canvas.width;
      this.H      = this.canvas.height;
      this.pad    = 48;
    }

    px(wx) { return this.pad + (wx / 10) * (this.W - 2 * this.pad); }
    py(wy) { return (this.H - this.pad) - (wy / 10) * (this.H - 2 * this.pad); }

    // Returns canvas coords for a world-space region rectangle
    _rc(region) {
      return {
        x: this.px(region.x1Min),
        y: this.py(region.x2Max),
        w: this.px(region.x1Max) - this.px(region.x1Min),
        h: this.py(region.x2Min) - this.py(region.x2Max),
      };
    }

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

    _drawLeaves(leaves) {
      leaves.forEach(lf => {
        const r = this._rc(lf.region);
        this.ctx.save();
        this.ctx.fillStyle = lf.label === 1 ? LEAF_C1 : LEAF_C0;
        this.ctx.fillRect(r.x, r.y, r.w, r.h);
        this.ctx.restore();
      });
    }

    _drawLeafLabels(leaves) {
      const { ctx } = this;
      leaves.forEach(lf => {
        const r = this._rc(lf.region);
        ctx.save();
        ctx.font = 'bold 15px Segoe UI, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = lf.label === 1 ? 'rgba(52,152,219,0.38)' : 'rgba(231,76,60,0.38)';
        ctx.fillText(`y=${lf.label}`, r.x + r.w / 2, r.y + r.h / 2);
        ctx.restore();
      });
    }

    _drawNodeHighlight(region) {
      const r = this._rc(region);
      const { ctx } = this;
      ctx.save();
      ctx.fillStyle = NODE_FILL;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = NODE_STROKE;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.setLineDash([]);
      ctx.restore();
    }

    _drawSplit(split, color, dash = []) {
      const { ctx } = this;
      const { feature, threshold, region } = split;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.setLineDash(dash);
      ctx.beginPath();
      if (feature === 'x1') {
        const x = this.px(threshold);
        ctx.moveTo(x, this.py(region.x2Min));
        ctx.lineTo(x, this.py(region.x2Max));
      } else {
        const y = this.py(threshold);
        ctx.moveTo(this.px(region.x1Min), y);
        ctx.lineTo(this.px(region.x1Max), y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    _drawPoints(data, step) {
      const { ctx } = this;
      data.forEach(p => {
        const x = this.px(p.x1), y = this.py(p.x2);

        if (step.type === 'final') {
          const lf = step.leaves.find(l =>
            p.x1 >= l.region.x1Min && p.x1 <= l.region.x1Max &&
            p.x2 >= l.region.x2Min && p.x2 <= l.region.x2Max);
          const ok = lf && lf.label === p.y;
          ctx.save();
          ctx.font = 'bold 12px Segoe UI, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = ok ? '#00b894' : '#d63031';
          ctx.fillText(ok ? '✓' : '✗', x + 8, y - 8);
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle   = p.y === 0 ? C0_FILL : C1_FILL;
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth   = 0.8;
        ctx.fill(); ctx.stroke();
      });
    }

    render(step, data) {
      this._clear();

      if (step.type === 'final') {
        this._drawLeaves(step.leaves);
        this._drawLeafLabels(step.leaves);
      }

      if (step.region && step.type !== 'raw') {
        this._drawNodeHighlight(step.region);
      }

      step.appliedSplits.forEach(s => this._drawSplit(s, SPLIT_CLR));

      if (step.pendingSplit) {
        this._drawSplit(
          { ...step.pendingSplit, region: step.region },
          PENDING_CLR, [6, 4]
        );
      }

      this._drawPoints(data, step);
    }
  }

  window.DecisionTreeViz = DecisionTreeViz;
})();
