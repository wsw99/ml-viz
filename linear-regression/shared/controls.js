// Reusable step controller.
// Usage: new StepController({ steps, onRender, interval })
//
// onRender(step, index, total) is called whenever the displayed step changes.

class StepController {
  constructor({ steps, onRender, interval = 1200 }) {
    this.steps    = steps;
    this.onRender = onRender;
    this.interval = interval;
    this.idx      = 0;
    this.timer    = null;

    this._bind();
    this.goTo(0);
  }

  goTo(i) {
    this.idx = Math.max(0, Math.min(this.steps.length - 1, i));
    this.onRender(this.steps[this.idx], this.idx, this.steps.length);
    document.getElementById('btn-prev').disabled = this.idx === 0;
    document.getElementById('btn-next').disabled = this.idx === this.steps.length - 1;
  }

  stopAuto() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const btn = document.getElementById('btn-auto');
    if (btn) btn.textContent = '⏩ Auto Play';
  }

  _bind() {
    const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
    on('btn-reset', () => { this.stopAuto(); this.goTo(0); });
    on('btn-prev',  () => { this.stopAuto(); this.goTo(this.idx - 1); });
    on('btn-next',  () => { this.stopAuto(); this.goTo(this.idx + 1); });
    on('btn-end',   () => { this.stopAuto(); this.goTo(this.steps.length - 1); });
    on('btn-auto',  () => {
      if (this.timer) {
        this.stopAuto();
      } else {
        document.getElementById('btn-auto').textContent = '⏸ Pause';
        this.timer = setInterval(() => {
          if (this.idx >= this.steps.length - 1) { this.stopAuto(); return; }
          this.goTo(this.idx + 1);
        }, this.interval);
      }
    });
  }
}
