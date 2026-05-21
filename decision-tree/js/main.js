// Initialises the Decision Tree visualisation page.

const FORMULAS = {
  node:  String.raw`\text{Gini}(t) = 1 - \sum_k p_k^2 = 2p_1(1-p_1)`,
  leaf:  String.raw`\hat{y} = \operatorname{majority}\{y_i \mid x_i \in \text{leaf}\}`,
  split: String.raw`\Delta\text{Gini} = \text{Gini}_P - \tfrac{|L|}{n}\,\text{Gini}_L - \tfrac{|R|}{n}\,\text{Gini}_R`,
  final: String.raw`\hat{y} = \arg\!\max_k \sum_{i \in \text{leaf}} \mathbf{1}[y_i = k]`,
};

document.addEventListener('DOMContentLoaded', function () {
  // ── Static KaTeX in metrics reference ────────────────────────────────────
  const staticFormulas = {
    'f-gini':     String.raw`\text{Gini}(t) = 1 - \sum_{k} p_k^2 = 2p_1(1-p_1) \quad (\text{binary})`,
    'f-gain':     String.raw`\Delta\text{Gini} = \text{Gini}_P - \frac{|L|}{n}\,\text{Gini}_L - \frac{|R|}{n}\,\text{Gini}_R`,
    'f-leaf':     String.raw`\hat{y} = \arg\max_k \sum_{i \in \text{leaf}} \mathbf{1}[y_i = k]`,
    'f-accuracy': String.raw`\text{Accuracy} = \frac{1}{n}\sum_{i=1}^{n}\mathbf{1}[\hat{y}_i = y_i]`,
    'f-depth':    String.raw`|\text{leaves}| \le 2^{d},\quad \text{nodes} \le 2^{d+1}-1`,
  };
  Object.entries(staticFormulas).forEach(([id, tex]) => {
    const el = document.getElementById(id);
    if (el) katex.render(tex, el, { throwOnError: false, displayMode: true });
  });

  const viz        = new DecisionTreeViz('main-canvas');
  const formulaBox = document.getElementById('formula-box');
  const formulaEl  = document.getElementById('formula-render');

  // ── Gini history chart (bar) ──────────────────────────────────────────────
  // Purple = internal node (still splitting), green = leaf node (pure/done)
  const CLR_INTERNAL = 'rgba(108, 92, 231, 0.55)';
  const CLR_LEAF     = 'rgba(0, 184, 148, 0.55)';
  const BDR_INTERNAL = '#6c5ce7';
  const BDR_LEAF     = '#00b894';

  const giniChart = new Chart(
    document.getElementById('loss-chart').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Gini',
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 1.5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const isLeaf = ctx.chart.data.datasets[0].borderColor[ctx.dataIndex] === BDR_LEAF;
                return ` Gini: ${ctx.parsed.y.toFixed(4)}${isLeaf ? '  ✓ leaf' : '  ↓ splits'}`;
              },
            },
          },
        },
        scales: {
          x: { title: { display: true, text: 'Node (depth-first order)', font: { size: 10 } }, ticks: { font: { size: 10 } } },
          y: {
            title: { display: true, text: 'Gini Impurity', font: { size: 11 } },
            min: 0, max: 0.55,
            ticks: { font: { size: 10 } },
          },
        },
      },
    }
  );

  // ── Render callback ───────────────────────────────────────────────────────
  function render(step, idx, total) {
    viz.render(step, window.DATA);

    document.getElementById('step-counter').textContent = `Step ${idx + 1} / ${total}`;
    document.getElementById('caption').textContent = step.caption;

    const formula = FORMULAS[step.type];
    if (formula) {
      formulaBox.style.display = '';
      katex.render(formula, formulaEl, { throwOnError: false, displayMode: true });
    } else {
      formulaBox.style.display = 'none';
    }

    document.querySelectorAll('#pseudo-lines li').forEach((li, i) => {
      li.classList.toggle('active', i === step.codeLine);
    });

    document.getElementById('p-depth').textContent     = step.depth !== undefined ? step.depth : '—';
    document.getElementById('p-n').textContent         = step.nodeN  !== undefined ? step.nodeN  : '—';
    document.getElementById('p-n1').textContent        = step.nodeN1 !== undefined ? step.nodeN1 : '—';
    document.getElementById('p-gini').textContent      = step.gini   !== undefined ? step.gini.toFixed(4) : '—';
    document.getElementById('p-feature').textContent   = step.pendingSplit ? step.pendingSplit.feature : '—';
    document.getElementById('p-threshold').textContent = step.pendingSplit ? step.pendingSplit.threshold.toFixed(3) : '—';
    document.getElementById('p-gain').textContent      = step.giniGain !== undefined ? step.giniGain.toFixed(4) : '—';
    document.getElementById('p-acc').textContent       = step.accuracy !== undefined ? (step.accuracy * 100).toFixed(1) + '%' : '—';

    giniChart.data.labels                       = step.giniLabels;
    giniChart.data.datasets[0].data             = step.giniHistory;
    giniChart.data.datasets[0].backgroundColor  = step.giniIsLeaf.map(l => l ? CLR_LEAF : CLR_INTERNAL);
    giniChart.data.datasets[0].borderColor      = step.giniIsLeaf.map(l => l ? BDR_LEAF : BDR_INTERNAL);
    giniChart.update();
  }

  new StepController({ steps: window.STEPS, onRender: render, interval: 1100 });
});
