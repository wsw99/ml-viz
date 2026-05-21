// Initialises the Logistic Regression visualisation page.

const FORMULAS = {
  init:     String.raw`\hat{y} = \sigma(w_1 x_1 + w_2 x_2 + b), \quad \sigma(z) = \frac{1}{1+e^{-z}}`,
  predict:  String.raw`\hat{y}_i = \sigma(w_1 x_{1i} + w_2 x_{2i} + b)`,
  gradient: String.raw`\frac{\partial L}{\partial w_1} = \frac{1}{n}\sum(\hat{y}_i - y_i)x_{1i},\quad \frac{\partial L}{\partial b} = \frac{1}{n}\sum(\hat{y}_i - y_i)`,
  update:   String.raw`w_k \leftarrow w_k - \alpha\,\frac{\partial L}{\partial w_k}, \quad b \leftarrow b - \alpha\,\frac{\partial L}{\partial b}`,
  final:    String.raw`L = -\frac{1}{n}\sum\!\bigl[y_i\log\hat{y}_i + (1-y_i)\log(1-\hat{y}_i)\bigr]`,
};

document.addEventListener('DOMContentLoaded', function () {
  // ── Static KaTeX in metrics reference ────────────────────────────────────
  const staticFormulas = {
    'f-logloss':  String.raw`L = -\frac{1}{n}\sum_{i=1}^{n}\bigl[y_i\log\hat{y}_i + (1-y_i)\log(1-\hat{y}_i)\bigr]`,
    'f-sigmoid':  String.raw`\sigma(z) = \frac{1}{1+e^{-z}},\quad z = w_1 x_1 + w_2 x_2 + b`,
    'f-accuracy': String.raw`\text{Accuracy} = \frac{TP+TN}{TP+TN+FP+FN}`,
    'f-prf':      String.raw`\text{Precision} = \frac{TP}{TP+FP},\quad \text{Recall} = \frac{TP}{TP+FN},\quad F_1 = \frac{2PR}{P+R}`,
    'f-boundary': String.raw`\text{Decision boundary: } w_1 x_1 + w_2 x_2 + b = 0`,
  };
  Object.entries(staticFormulas).forEach(([id, tex]) => {
    const el = document.getElementById(id);
    if (el) katex.render(tex, el, { throwOnError: false, displayMode: true });
  });

  const viz        = new LogisticRegressionViz('main-canvas');
  const formulaBox = document.getElementById('formula-box');
  const formulaEl  = document.getElementById('formula-render');

  // ── Loss chart ────────────────────────────────────────────────────────────
  const lossChart = new Chart(
    document.getElementById('loss-chart').getContext('2d'),
    {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Log Loss',
          data: [],
          borderColor: '#e67e22',
          backgroundColor: 'rgba(230,126,34,0.08)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#e67e22',
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` Loss: ${ctx.parsed.y.toFixed(4)}` } },
        },
        scales: {
          x: { title: { display: true, text: 'Iteration', font: { size: 11 } }, ticks: { font: { size: 10 } } },
          y: { title: { display: true, text: 'Log Loss',  font: { size: 11 } }, ticks: { font: { size: 10 } }, beginAtZero: false },
        },
      },
    }
  );

  // ── Render callback ───────────────────────────────────────────────────────
  function render(step, idx, total) {
    viz.render(step, window.DATA);

    document.getElementById('step-counter').textContent = `Step ${idx + 1} / ${total}`;
    document.getElementById('caption').textContent = step.caption;

    // KaTeX formula
    const formula = FORMULAS[step.type];
    if (formula) {
      formulaBox.style.display = '';
      katex.render(formula, formulaEl, { throwOnError: false, displayMode: true });
    } else {
      formulaBox.style.display = 'none';
    }

    // Pseudocode highlight
    document.querySelectorAll('#pseudo-lines li').forEach((li, i) => {
      li.classList.toggle('active', i === step.codeLine);
    });

    const fmt = v => v !== undefined && v !== null ? v.toFixed(4) : '—';

    // Parameters
    document.getElementById('p-w1').textContent  = fmt(step.w1);
    document.getElementById('p-w2').textContent  = fmt(step.w2);
    document.getElementById('p-b').textContent   = fmt(step.b);
    document.getElementById('p-iter').textContent =
      step.iteration > 0 ? step.iteration : '—';

    // Metrics
    document.getElementById('p-sigma').textContent =
      step.yHat !== undefined ? step.yHat.toFixed(4) : '—';
    document.getElementById('p-loss').textContent =
      step.lossHistory.length
        ? step.lossHistory[step.lossHistory.length - 1].toFixed(4)
        : '—';
    document.getElementById('p-acc').textContent =
      step.acc !== undefined ? (step.acc * 100).toFixed(1) + '%' : '—';
    document.getElementById('p-dw1').textContent =
      step.dw1 !== undefined ? step.dw1.toFixed(5) : '—';
    document.getElementById('p-dw2').textContent =
      step.dw2 !== undefined ? step.dw2.toFixed(5) : '—';
    document.getElementById('p-db').textContent  =
      step.dbc !== undefined ? step.dbc.toFixed(5) : '—';

    // Final metrics
    document.getElementById('p-precision').textContent =
      step.precision !== undefined ? step.precision.toFixed(3) : '—';
    document.getElementById('p-recall').textContent =
      step.recall !== undefined ? step.recall.toFixed(3) : '—';
    document.getElementById('p-f1').textContent =
      step.f1 !== undefined ? step.f1.toFixed(3) : '—';

    // Loss chart
    lossChart.data.labels           = step.lossHistory.map((_, i) => i + 1);
    lossChart.data.datasets[0].data = step.lossHistory;
    lossChart.update();
  }

  new StepController({ steps: window.STEPS, onRender: render, interval: 900 });
});
