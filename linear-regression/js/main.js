// Initialises the Linear Regression visualisation page.

// KaTeX formula to show per step type
const FORMULAS = {
  init:      String.raw`\hat{y} = w \cdot (x - \bar{x}) + c \;\;\Longleftrightarrow\;\; \hat{y} = wx + b`,
  residuals: String.raw`\text{MSE} = \frac{1}{n}\sum_{i=1}^{n}(\hat{y}_i - y_i)^2, \quad e_i = \hat{y}_i - y_i`,
  gradient:  String.raw`\frac{\partial L}{\partial w} = \frac{2}{n}\sum e_i(x_i - \bar{x}), \quad \frac{\partial L}{\partial c} = \frac{2}{n}\sum e_i`,
  update:    String.raw`w \leftarrow w - \alpha\frac{\partial L}{\partial w}, \quad c \leftarrow c - \alpha\frac{\partial L}{\partial c}`,
  final:     String.raw`R^2 = 1 - \frac{SS_{res}}{SS_{tot}} = 1 - \frac{\sum(\hat{y}_i-y_i)^2}{\sum(y_i-\bar{y})^2}`,
};

document.addEventListener('DOMContentLoaded', function () {
  // ── Static KaTeX formulas in metrics reference ────────────────────────────
  const staticFormulas = {
    'f-mse':  String.raw`\text{MSE} = \frac{1}{n}\sum_{i=1}^{n}(\hat{y}_i - y_i)^2`,
    'f-rmse': String.raw`\text{RMSE} = \sqrt{\text{MSE}} = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(\hat{y}_i - y_i)^2}`,
    'f-r2':   String.raw`R^2 = 1 - \frac{SS_{res}}{SS_{tot}}, \quad SS_{res} = \sum(\hat{y}_i - y_i)^2, \quad SS_{tot} = \sum(y_i - \bar{y})^2`,
    'f-grad': String.raw`\frac{\partial L}{\partial w} = \frac{2}{n}\sum_{i=1}^{n}(\hat{y}_i - y_i)\,x_i, \quad \frac{\partial L}{\partial b} = \frac{2}{n}\sum_{i=1}^{n}(\hat{y}_i - y_i)`,
    'f-lr':   String.raw`\theta \leftarrow \theta - \alpha \nabla_\theta L(\theta)`,
  };
  Object.entries(staticFormulas).forEach(([id, tex]) => {
    const el = document.getElementById(id);
    if (el) katex.render(tex, el, { throwOnError: false, displayMode: true });
  });

  const viz        = new LinearRegressionViz('main-canvas');
  const formulaBox = document.getElementById('formula-box');
  const formulaEl  = document.getElementById('formula-render');

  // ── Loss curve chart ──────────────────────────────────────────────────────
  const lossChart = new Chart(
    document.getElementById('loss-chart').getContext('2d'),
    {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'MSE',
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
          tooltip: { callbacks: { label: ctx => ` MSE: ${ctx.parsed.y.toFixed(4)}` } },
        },
        scales: {
          x: {
            title: { display: true, text: 'Iteration', font: { size: 11 } },
            ticks:  { font: { size: 10 } },
          },
          y: {
            title: { display: true, text: 'MSE', font: { size: 11 } },
            ticks:  { font: { size: 10 } },
            beginAtZero: false,
          },
        },
      },
    }
  );

  // ── Render callback ───────────────────────────────────────────────────────
  function render(step, idx, total) {
    viz.render(step, window.DATA);

    // Step counter
    document.getElementById('step-counter').textContent = `Step ${idx + 1} / ${total}`;

    // Caption
    document.getElementById('caption').textContent = step.caption;

    // KaTeX formula box
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

    // Metrics panel
    const fmtW = v => (v === null ? '—' : v.toFixed(4));
    document.getElementById('p-iter').textContent =
      step.iteration > 0 ? step.iteration : '—';
    document.getElementById('p-w').textContent   = fmtW(step.w);
    document.getElementById('p-b').textContent   = fmtW(step.b);
    document.getElementById('p-dw').textContent  =
      step.dw !== undefined ? step.dw.toFixed(5) : '—';
    document.getElementById('p-dc').textContent  =
      step.dc !== undefined ? step.dc.toFixed(5) : '—';
    document.getElementById('p-mse').textContent =
      step.lossHistory.length
        ? step.lossHistory[step.lossHistory.length - 1].toFixed(4)
        : '—';
    document.getElementById('p-r2').textContent =
      step.r2 !== undefined ? step.r2.toFixed(4) : '—';

    // Loss chart
    lossChart.data.labels           = step.lossHistory.map((_, i) => i + 1);
    lossChart.data.datasets[0].data = step.lossHistory;
    lossChart.update();
  }

  new StepController({ steps: window.STEPS, onRender: render, interval: 900 });
});
