// Canvas renderer for K-Means visualisation.

(function () {
  const PALETTE      = ['#e74c3c', '#3498db', '#2ecc71'];
  const DARK_PALETTE = ['#c0392b', '#2980b9', '#27ae60'];
  const UNASSIGNED   = '#b2bec3';

  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  class KMeansViz {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx    = this.canvas.getContext('2d');
      this.W      = this.canvas.width;
      this.H      = this.canvas.height;
      this.pad    = 44;
    }

    // World [0,10]x[0,10]  →  canvas pixels
    px(wx) { return this.pad + (wx / 10) * (this.W - 2 * this.pad); }
    py(wy) { return (this.H - this.pad) - (wy / 10) * (this.H - 2 * this.pad); }

    _clear() {
      const { ctx, W, H, pad } = this;
      ctx.clearRect(0, 0, W, H);
      // border
      ctx.save();
      ctx.strokeStyle = '#dfe6e9';
      ctx.lineWidth = 1;
      ctx.strokeRect(pad, pad, W - 2 * pad, H - 2 * pad);
      ctx.restore();
    }

    _drawVoronoi(centroids) {
      const { ctx, W, H, pad } = this;
      const step = 4; // px per cell
      const img  = ctx.createImageData(W, H);

      for (let py = pad; py < H - pad; py += step) {
        for (let px = pad; px < W - pad; px += step) {
          const wx = (px - pad) / (W - 2 * pad) * 10;
          const wy = 10 - (py - pad) / (H - 2 * pad) * 10;

          let best = 0, bestD = Infinity;
          centroids.forEach((c, i) => {
            const d = (wx - c.x) ** 2 + (wy - c.y) ** 2;
            if (d < bestD) { bestD = d; best = i; }
          });

          const col = hexToRgb(PALETTE[best]);
          for (let dy = 0; dy < step; dy++) {
            for (let dx = 0; dx < step; dx++) {
              const idx = ((py + dy) * W + (px + dx)) * 4;
              if (idx + 3 >= img.data.length) continue;
              img.data[idx]     = col.r;
              img.data[idx + 1] = col.g;
              img.data[idx + 2] = col.b;
              img.data[idx + 3] = 38;
            }
          }
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    _drawLines(points, centroids) {
      const ctx = this.ctx;
      ctx.save();
      ctx.lineWidth = 0.8;
      points.forEach(p => {
        if (p.cluster < 0) return;
        const c = centroids[p.cluster];
        ctx.beginPath();
        ctx.moveTo(this.px(p.x), this.py(p.y));
        ctx.lineTo(this.px(c.x), this.py(c.y));
        ctx.strokeStyle = PALETTE[p.cluster] + '55';
        ctx.stroke();
      });
      ctx.restore();
    }

    _drawTrails(prev, next) {
      const ctx = this.ctx;
      ctx.save();
      ctx.lineWidth   = 2;
      ctx.setLineDash([5, 4]);
      prev.forEach((p, i) => {
        const x1 = this.px(p.x),    y1 = this.py(p.y);
        const x2 = this.px(next[i].x), y2 = this.py(next[i].y);
        ctx.strokeStyle = DARK_PALETTE[i];
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

        // arrowhead
        ctx.setLineDash([]);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - 10 * Math.cos(angle - 0.4), y2 - 10 * Math.sin(angle - 0.4));
        ctx.lineTo(x2 - 10 * Math.cos(angle + 0.4), y2 - 10 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = DARK_PALETTE[i];
        ctx.fill();
        ctx.setLineDash([5, 4]);
      });
      ctx.restore();
    }

    _drawPoints(points) {
      const ctx = this.ctx;
      points.forEach(p => {
        const x = this.px(p.x), y = this.py(p.y);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle   = p.cluster >= 0 ? PALETTE[p.cluster] : UNASSIGNED;
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth   = 0.6;
        ctx.fill();
        ctx.stroke();
      });
    }

    _drawStar(cx, cy, outerR, color) {
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const oa = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const ia = oa + Math.PI / 5;
        const fn = i === 0 ? 'moveTo' : 'lineTo';
        ctx[fn](cx + outerR * Math.cos(oa), cy + outerR * Math.sin(oa));
        ctx.lineTo(cx + (outerR / 2.2) * Math.cos(ia), cy + (outerR / 2.2) * Math.sin(ia));
      }
      ctx.closePath();
      ctx.fillStyle   = color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    _drawCentroids(centroids) {
      centroids.forEach((c, i) => {
        this._drawStar(this.px(c.x), this.py(c.y), 13, DARK_PALETTE[i]);
      });
    }

    _drawDistanceFocus(focusPoint, dists, nearestCi) {
      const ctx = this.ctx;
      const fx  = this.px(focusPoint.x);
      const fy  = this.py(focusPoint.y);

      dists.forEach(({ ci, d }) => {
        const cx = this.px(this.lastCentroids[ci].x);
        const cy = this.py(this.lastCentroids[ci].y);
        const isNearest = ci === nearestCi;

        // Line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = isNearest ? DARK_PALETTE[ci] : DARK_PALETTE[ci] + '70';
        ctx.lineWidth   = isNearest ? 2.2 : 1.2;
        ctx.setLineDash(isNearest ? [] : [5, 4]);
        ctx.stroke();
        ctx.restore();

        // Distance label at midpoint
        const mx  = (fx + cx) / 2;
        const my  = (fy + cy) / 2;
        const lbl = `d${ci + 1} = ${d.toFixed(2)}`;
        ctx.save();
        ctx.font         = `${isNearest ? 'bold ' : ''}11px Segoe UI, sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(lbl).width;
        // background pill
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        const r = 3;
        ctx.roundRect(mx - tw / 2 - 5, my - 8, tw + 10, 16, r);
        ctx.fill();
        ctx.strokeStyle = DARK_PALETTE[ci] + (isNearest ? 'ff' : '88');
        ctx.lineWidth   = isNearest ? 1.5 : 0.8;
        ctx.stroke();
        ctx.fillStyle = DARK_PALETTE[ci];
        ctx.fillText(lbl, mx, my);
        ctx.restore();
      });

      // Highlight ring around focus point
      ctx.save();
      ctx.beginPath();
      ctx.arc(fx, fy, 9, 0, Math.PI * 2);
      ctx.strokeStyle = '#fdcb6e';
      ctx.lineWidth   = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fdcb6e';
      ctx.fill();
      ctx.restore();
    }

    render(step) {
      this._clear();
      this.lastCentroids = step.centroids; // needed by _drawDistanceFocus

      if (step.type === 'final' && step.centroids.length)  this._drawVoronoi(step.centroids);
      if (step.type === 'assign')                          this._drawLines(step.points, step.centroids);
      if (step.type === 'update' && step.prevCentroids)    this._drawTrails(step.prevCentroids, step.centroids);
      this._drawPoints(step.points);
      if (step.centroids.length)                           this._drawCentroids(step.centroids);
      if (step.type === 'distance')
        this._drawDistanceFocus(step.focusPoint, step.focusDistances, step.focusNearest);
    }
  }

  window.KMeansViz = KMeansViz;
})();
