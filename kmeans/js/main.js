// Initialises the K-Means visualisation page.

// KaTeX formula to show per step type
const FORMULAS = {
  distance: String.raw`d(p,\,c) = \sqrt{(x_p - x_c)^2 + (y_p - y_c)^2}`,
  assign:   String.raw`\hat{c}(p) = \arg\min_{i} \; d(p,\, \mu_i)`,
  mean:     String.raw`\bar{x} = \frac{\sum_{i=1}^{n} x_i}{n}, \quad \bar{y} = \frac{\sum_{i=1}^{n} y_i}{n}`,
  update:   String.raw`\mu_i \leftarrow \frac{1}{|C_i|}\sum_{x \in C_i} x`,
  final:    String.raw`\text{WCSS} = \sum_{i=1}^{K}\sum_{x \in C_i}\|x - \mu_i\|^2 \qquad s(i)=\frac{b(i)-a(i)}{\max(a(i),\,b(i))}`,
};

document.addEventListener('DOMContentLoaded', function () {
  // Render static KaTeX formulas in the metrics reference section
  const staticFormulas = {
    'f-wcss':     String.raw`\text{WCSS} = \sum_{i=1}^{K} \sum_{x \in C_i} \|x - \mu_i\|^2`,
    'f-sil':      String.raw`s(i) = \frac{b(i) - a(i)}{\max\bigl(a(i),\; b(i)\bigr)}, \quad \bar{s} = \frac{1}{n}\sum_{i=1}^{n} s(i)`,
    'f-k':        String.raw`\text{Elbow: choose } K \text{ where } \frac{d(\text{WCSS})}{dK} \text{ drops sharply}`,
    'f-centroid': String.raw`\mu_i = \frac{1}{|C_i|} \sum_{x \in C_i} x \;=\; \left(\frac{\sum x_j}{|C_i|},\; \frac{\sum y_j}{|C_i|}\right)`,
  };
  Object.entries(staticFormulas).forEach(([id, tex]) => {
    const el = document.getElementById(id);
    if (el) katex.render(tex, el, { throwOnError: false, displayMode: true });
  });

  const viz        = new KMeansViz('main-canvas');
  const formulaBox = document.getElementById('formula-box');
  const formulaEl  = document.getElementById('formula-render');

  // WCSS chart (Chart.js)
  const wcssChart = new Chart(
    document.getElementById('wcss-chart').getContext('2d'),
    {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'WCSS',
          data: [],
          borderColor: '#e67e22',
          backgroundColor: 'rgba(230,126,34,0.08)',
          borderWidth: 2,
          pointRadius: 4,
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
          tooltip: { callbacks: { label: ctx => ` WCSS: ${ctx.parsed.y.toFixed(2)}` } },
        },
        scales: {
          x: { title: { display: true, text: 'Iteration', font: { size: 11 } }, ticks: { font: { size: 10 } } },
          y: { title: { display: true, text: 'WCSS',      font: { size: 11 } }, ticks: { font: { size: 10 } }, beginAtZero: false },
        },
      },
    }
  );

  function render(step, idx, total) {
    // Canvas
    viz.render(step);

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
    document.getElementById('p-iter').textContent =
      step.iteration > 0 ? step.iteration : '—';
    document.getElementById('p-wcss').textContent =
      step.wcssHistory.length
        ? step.wcssHistory[step.wcssHistory.length - 1].toFixed(2)
        : '—';
    document.getElementById('p-assigned').textContent =
      step.points.filter(p => p.cluster >= 0).length + ' / ' + step.points.length;
    document.getElementById('p-sil').textContent =
      step.silhouette != null ? step.silhouette.toFixed(3) : '—';

    // WCSS chart
    wcssChart.data.labels            = step.wcssHistory.map((_, i) => i + 1);
    wcssChart.data.datasets[0].data  = step.wcssHistory;
    wcssChart.update();
  }

  new StepController({ steps: window.STEPS, onRender: render, interval: 1000 });
});
