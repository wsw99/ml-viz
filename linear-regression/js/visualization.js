// Canvas renderer for Linear Regression visualisation.

(function () {
  const LINE_COLOR     = '#6c5ce7';   // current regression line
  const PREV_COLOR     = '#b2bec3';   // previous line (dashed, shown on update step)
  const POINT_COLOR    = '#74b9ff';   // data point fill
  const RESIDUAL_COLOR = '#e74c3c';   // residual lines
  const FOCUS_COLOR    = '#fdcb6e';   // highlighted point ring
  const FOCUS_RES      = '#e17055';   // highlighted residual line

  class LinearRegressionViz {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx    = this.canvas.getContext('2d');
      this.W      = this.canvas.width;
      this.H      = this.canvas.height;
      this.pad    = 48;
    }

    // World [0, 10] → canvas pixels
    px(wx) { return this.pad + (wx / 10) * (this.W - 2 * this.pad); }
    py(wy) { return (this.H - this.pad) - (wy / 10) * (this.H - 2 * this.pad); }

    _clear() {
      const { ctx, W, H, pad } = this;
      ctx.clearRect(0, 0, W, H);

      // Light grid lines
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
      ctx.restore();

      // Border
      ctx.save();
      ctx.strokeStyle = '#dfe6e9';
      ctx.lineWidth   = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(pad, pad, W - 2 * pad, H - 2 * pad);
      ctx.restore();

      // Axis tick labels
      ctx.save();
      ctx.font         = '10px Segoe UI, sans-serif';
      ctx.fillStyle    = '#b2bec3';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      for (let v = 0; v <= 10; v += 2) {
        ctx.fillText(v, this.px(v), H - pad + 4);
      }
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'middle';
      for (let v = 0; v <= 10; v += 2) {
        ctx.fillText(v, pad - 5, this.py(v));
      }
      ctx.restore();
    }

    _drawLine(w, b, color, dash = []) {
      const { ctx } = this;
      // Clip line to y ∈ [0, 10] for clean rendering
      const yAt  = x => w * x + b;
      let x0 = 0, x1 = 10;
      // Simple clip: if slope extreme, clamp x range so y stays near [0,10]
      if (Math.abs(w) > 0.001) {
        const xAtY0 = (0  - b) / w;
        const xAtY10 = (10 - b) / w;
        x0 = Math.max(0,  Math.min(xAtY0, xAtY10));
        x1 = Math.min(10, Math.max(xAtY0, xAtY10));
        if (x0 >= x1) { x0 = 0; x1 = 10; }
      }
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.px(x0), this.py(yAt(x0)));
      ctx.lineTo(this.px(x1), this.py(yAt(x1)));
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.setLineDash(dash);
      ctx.stroke();
      ctx.restore();
    }

    _drawResiduals(data, w, b, focusIdx) {
      const { ctx } = this;
      ctx.save();
      data.forEach((p, i) => {
        const x    = this.px(p.x);
        const yD   = this.py(p.y);
        const yP   = this.py(w * p.x + b);
        const isFocus = i === focusIdx;
        ctx.beginPath();
        ctx.moveTo(x, yD);
        ctx.lineTo(x, yP);
        ctx.strokeStyle = isFocus ? FOCUS_RES       : RESIDUAL_COLOR + '88';
        ctx.lineWidth   = isFocus ? 2.5             : 1.2;
        ctx.setLineDash([]);
        ctx.stroke();
      });
      ctx.restore();
    }

    _drawPoints(data, highlightIdx) {
      const { ctx } = this;
      data.forEach((p, i) => {
        const x = this.px(p.x), y = this.py(p.y);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle   = POINT_COLOR;
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth   = 0.8;
        ctx.fill();
        ctx.stroke();
      });

      // Yellow highlight ring for focus point
      if (highlightIdx >= 0) {
        const p  = data[highlightIdx];
        const x  = this.px(p.x);
        const y  = this.py(p.y);
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = FOCUS_COLOR;
        ctx.lineWidth   = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = FOCUS_COLOR;
        ctx.fill();
        ctx.restore();
      }
    }

    _drawFocusAnnotation(p, w, b) {
      const { ctx } = this;
      const err = w * p.x + b - p.y;
      const lbl = `eᵢ = ${err > 0 ? '+' : ''}${err.toFixed(3)}`;
      const fx  = this.px(p.x);
      const fy  = this.py(p.y);
      const fyP = this.py(w * p.x + b);
      const midY = (fy + fyP) / 2;
      const lx   = fx + 12;

      ctx.save();
      ctx.font         = 'bold 11px Segoe UI, sans-serif';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(lbl).width;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.roundRect(lx - 3, midY - 8, tw + 10, 16, 3);
      ctx.fill();
      ctx.strokeStyle = FOCUS_RES;
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.fillStyle = FOCUS_RES;
      ctx.fillText(lbl, lx + 2, midY);
      ctx.restore();
    }

    _drawGradientArrows(dw, dc) {
      const { ctx, W, H, pad } = this;
      // Show gradient direction as small arrows in bottom-right corner
      const bx = W - pad - 12, by = H - pad - 18;
      const scale = Math.min(40, 5 / (Math.abs(dw) + 1e-9));
      const dx = -dw * scale; // negative because we move opposite gradient

      ctx.save();
      ctx.font      = '10px Segoe UI, sans-serif';
      ctx.fillStyle = '#636e72';
      ctx.textAlign = 'right';
      ctx.fillText(`∂L/∂w = ${dw > 0 ? '+' : ''}${dw.toFixed(4)}`, bx, by - 2);
      ctx.fillText(`∂L/∂c = ${dc > 0 ? '+' : ''}${dc.toFixed(4)}`, bx, by + 12);
      ctx.restore();
    }

    render(step, data) {
      this._clear();

      // Previous line (dashed gray) on update step
      if (step.type === 'update' && step.prevW !== null) {
        this._drawLine(step.prevW, step.prevB, PREV_COLOR, [6, 4]);
      }

      // Current regression line (all steps except raw)
      if (step.type !== 'raw') {
        this._drawLine(step.w, step.b, LINE_COLOR);
      }

      // Residual lines
      if (step.type === 'residuals' || step.type === 'gradient') {
        this._drawResiduals(data, step.w, step.b, step.focusIdx);
      }

      // Data points (with highlight on gradient step)
      const highlightIdx = (step.type === 'gradient' || step.type === 'residuals')
        ? (step.focusIdx !== undefined ? step.focusIdx : -1)
        : -1;
      this._drawPoints(data, highlightIdx);

      // Focus annotation for gradient step
      if (step.type === 'gradient' && step.focusIdx !== undefined) {
        this._drawFocusAnnotation(data[step.focusIdx], step.w, step.b);
        this._drawGradientArrows(step.dw, step.dc);
      }
    }
  }

  window.LinearRegressionViz = LinearRegressionViz;
})();
