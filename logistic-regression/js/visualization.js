// Canvas renderer for Logistic Regression visualisation.

(function () {
  const C0_FILL    = '#e74c3c';   // class 0 fill (red)
  const C1_FILL    = '#3498db';   // class 1 fill (blue)
  const BOUNDARY   = '#6c5ce7';   // current decision boundary (purple)
  const PREV_BOUND = '#b2bec3';   // previous boundary on update step (gray)
  const FOCUS_RING = '#fdcb6e';   // uncertain-point highlight ring

  // Light background shading colours for probability regions (final step)
  const BG0 = { r: 231, g: 76,  b: 60  }; // red
  const BG1 = { r:  52, g: 152, b: 219 }; // blue

  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  class LogisticRegressionViz {
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

      // Axis labels
      ctx.save();
      ctx.font = '10px Segoe UI, sans-serif'; ctx.fillStyle = '#b2bec3';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let v = 0; v <= 10; v += 2) ctx.fillText(v, this.px(v), H - pad + 4);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let v = 0; v <= 10; v += 2) ctx.fillText(v, pad - 5, this.py(v));
      ctx.restore();
    }

    // Pixel-fill background by predicted class (final step only)
    _drawBackground(w1, w2, b) {
      const { ctx, W, H, pad } = this;
      const step = 5;
      const img  = ctx.createImageData(W, H);
      for (let py = pad; py < H - pad; py += step) {
        for (let px = pad; px < W - pad; px += step) {
          const wx = (px - pad) / (W - 2 * pad) * 10;
          const wy = 10 - (py - pad) / (H - 2 * pad) * 10;
          const z  = w1 * wx + w2 * wy + b;
          const p  = 1 / (1 + Math.exp(-z));
          const bg = p >= 0.5 ? BG1 : BG0;
          for (let dy = 0; dy < step; dy++) {
            for (let dx = 0; dx < step; dx++) {
              const idx = ((py + dy) * W + (px + dx)) * 4;
              if (idx + 3 >= img.data.length) continue;
              img.data[idx]     = bg.r;
              img.data[idx + 1] = bg.g;
              img.data[idx + 2] = bg.b;
              img.data[idx + 3] = 35;
            }
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    // Draw decision boundary line: w1·x1 + w2·x2 + b = 0
    _drawBoundary(w1, w2, b, color, dash = []) {
      const { ctx, pad } = this;
      if (Math.abs(w1) < 1e-9 && Math.abs(w2) < 1e-9) return;

      // Find intersections with the [0,10] box
      const pts = [];
      const tryPush = (x1, x2) => {
        if (x1 >= -0.01 && x1 <= 10.01 && x2 >= -0.01 && x2 <= 10.01)
          pts.push({ x1, x2 });
      };
      if (Math.abs(w2) > 1e-9) {
        tryPush(0,  -(w1 * 0  + b) / w2);
        tryPush(10, -(w1 * 10 + b) / w2);
      }
      if (Math.abs(w1) > 1e-9) {
        tryPush(-(w2 * 0  + b) / w1, 0);
        tryPush(-(w2 * 10 + b) / w1, 10);
      }
      if (pts.length < 2) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.px(pts[0].x1), this.py(pts[0].x2));
      ctx.lineTo(this.px(pts[1].x1), this.py(pts[1].x2));
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.setLineDash(dash);
      ctx.stroke();
      ctx.restore();
    }

    _drawPoints(data, step) {
      const { ctx } = this;
      data.forEach((p, i) => {
        const x = this.px(p.x1), y = this.py(p.x2);
        const isFocus = i === step.focusIdx &&
          (step.type === 'predict' || step.type === 'gradient');

        // On final step: show ✓/✗ markers
        if (step.type === 'final') {
          const z    = step.w1 * p.x1 + step.w2 * p.x2 + step.b;
          const pred = 1 / (1 + Math.exp(-z)) >= 0.5 ? 1 : 0;
          const ok   = pred === p.y;
          ctx.save();
          ctx.font      = 'bold 13px Segoe UI, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
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

        if (isFocus) {
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.strokeStyle = FOCUS_RING;
          ctx.lineWidth   = 3;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = FOCUS_RING;
          ctx.fill();
        }
      });
    }

    _drawProbAnnotation(p, yHat, zVal) {
      const { ctx } = this;
      const x   = this.px(p.x1);
      const y   = this.py(p.x2);
      const lbl = `σ(${zVal.toFixed(2)}) = ${yHat.toFixed(3)}`;
      ctx.save();
      ctx.font         = 'bold 11px Segoe UI, sans-serif';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(lbl).width;
      const lx = x + 12, ly = y - 14;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.roundRect(lx - 3, ly - 8, tw + 10, 16, 3); ctx.fill();
      ctx.strokeStyle = '#fdcb6e'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle   = '#e17055';
      ctx.fillText(lbl, lx + 2, ly);
      ctx.restore();
    }

    render(step, data) {
      this._clear();

      // Background probability shading (final only)
      if (step.type === 'final') this._drawBackground(step.w1, step.w2, step.b);

      // Previous boundary (dashed) on update step
      if (step.type === 'update' && step.prevW1 !== null)
        this._drawBoundary(step.prevW1, step.prevW2, step.prevB, PREV_BOUND, [6, 4]);

      // Current boundary (all except raw)
      if (step.type !== 'raw')
        this._drawBoundary(step.w1, step.w2, step.b, BOUNDARY);

      // Data points
      this._drawPoints(data, step);

      // Prob annotation for predict / gradient step focus point
      if ((step.type === 'predict' || step.type === 'gradient') &&
          step.focusIdx !== undefined && step.yHat !== undefined)
        this._drawProbAnnotation(data[step.focusIdx], step.yHat, step.zVal);
    }
  }

  window.LogisticRegressionViz = LogisticRegressionViz;
})();
