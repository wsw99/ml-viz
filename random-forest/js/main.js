// Initialises the Random Forest visualisation page.

const FORMULAS = {
  bootstrap: String.raw`S_t \sim \text{Bootstrap}(D,\,n) \quad (\text{sample with replacement})`,
  tree:      String.raw`T_t \leftarrow \text{CART}(S_t,\,\text{maxDepth})`,
  query:     String.raw`\hat{y}(x) = \arg\max_k \sum_{t=1}^{T} \mathbf{1}[T_t(x)=k]`,
  final:     String.raw`\text{OOB error} = \frac{1}{n}\sum_{i=1}^{n} \mathbf{1}\!\left[\hat{y}_{\text{OOB}}(x_i) \neq y_i\right]`,
};

const CLR_TREE = ['rgba(108,92,231,0.6)', 'rgba(0,184,148,0.6)', 'rgba(225,112,85,0.6)'];
const BDR_TREE = ['#6c5ce7', '#00b894', '#e17055'];
const CLR_ENS  = 'rgba(52,152,219,0.6)';
const BDR_ENS  = '#3498db';

document.addEventListener('DOMContentLoaded', function () {

  // ── Static KaTeX in metrics reference ────────────────────────────────────
  const staticFormulas = {
    'f-bootstrap': String.raw`P(\text{point } i \notin S_t) = \left(1 - \tfrac{1}{n}\right)^n \approx e^{-1} \approx 36.8\%`,
    'f-oob':       String.raw`\text{OOB Error} = \frac{1}{n}\sum_{i}\mathbf{1}\!\left[\hat{y}_{\text{OOB}}(x_i) \neq y_i\right]`,
    'f-vote':      String.raw`\hat{y}(x) = \arg\max_k \sum_{t=1}^{T} \mathbf{1}[T_t(x)=k]`,
    'f-fimp':      String.raw`\text{Importance}(f) = \frac{1}{T}\sum_{t}\sum_{\text{node}\,v \text{ splits on } f} \Delta\text{Gini}_v \cdot \frac{n_v}{n}`,
    'f-acc':       String.raw`\text{Accuracy} = \frac{1}{n}\sum_{i=1}^{n}\mathbf{1}[\hat{y}_i = y_i]`,
  };
  Object.entries(staticFormulas).forEach(([id, tex]) => {
    const el = document.getElementById(id);
    if (el) katex.render(tex, el, { throwOnError: false, displayMode: true });
  });

  const viz        = new RandomForestViz('main-canvas');
  const formulaBox = document.getElementById('formula-box');
  const formulaEl  = document.getElementById('formula-render');

  // ── OOB accuracy chart ────────────────────────────────────────────────────
  const oobChart = new Chart(
    document.getElementById('loss-chart').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels:   [],
        datasets: [{
          label:           'OOB Accuracy',
          data:            [],
          backgroundColor: [],
          borderColor:     [],
          borderWidth:     1.5,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        animation:           false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` OOB Acc: ${ctx.parsed.y.toFixed(1)}%`,
            },
          },
        },
        scales: {
          x: { ticks: { font: { size: 10 } } },
          y: {
            title: { display: true, text: 'OOB Accuracy (%)', font: { size: 11 } },
            min: 0, max: 105,
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
    document.getElementById('caption').textContent      = step.caption;

    // Formula box
    const fKey = step.type === 'bootstrap' ? 'bootstrap'
               : step.type === 'tree'      ? 'tree'
               : step.type === 'query'     ? 'query'
               : step.type === 'final'     ? 'final'
               : null;
    if (fKey) {
      formulaBox.style.display = '';
      katex.render(FORMULAS[fKey], formulaEl, { throwOnError: false, displayMode: true });
    } else {
      formulaBox.style.display = 'none';
    }

    // Pseudocode highlight
    document.querySelectorAll('#pseudo-lines li').forEach((li, i) => {
      li.classList.toggle('active', i === step.codeLine);
    });

    // ── Params panel ──────────────────────────────────────────────────────
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    const show = (id, vis) => {
      const el = document.getElementById(id);
      if (el) el.style.display = vis ? '' : 'none';
    };

    set('p-trees', step.trees.length + (step.type === 'bootstrap' ? ` (training ${step.treeIdx + 1}…)` : ''));

    const hasBS = step.type === 'bootstrap' || step.type === 'tree';
    show('row-unique', hasBS);
    show('row-oob-size', hasBS);
    if (hasBS) {
      set('p-unique',   `${step.uniqueCount} / ${window.DATA.length} (~${(step.uniqueCount / window.DATA.length * 100).toFixed(0)}%)`);
      set('p-oob-size', window.DATA.length - step.uniqueCount);
    }

    const hasOOBAcc = step.oobAccuracies.length > 0;
    show('row-oob-acc', hasOOBAcc);
    if (hasOOBAcc) {
      const last = step.oobAccuracies[step.oobAccuracies.length - 1];
      set('p-oob-acc', last !== null ? `${(last * 100).toFixed(1)}%` : '—');
    }

    const hasVotes = step.type === 'query' || step.type === 'final';
    show('row-votes', hasVotes);
    show('row-final-pred', hasVotes);
    if (hasVotes) {
      set('p-votes', step.votes.map((v, i) => `T${i + 1}→${v}`).join('  '));
      set('p-final-pred', `class ${step.finalPred}`);
    }

    const hasEns = step.type === 'final';
    show('row-ens-oob', hasEns);
    show('row-imp-x1', hasEns);
    show('row-imp-x2', hasEns);
    if (hasEns) {
      const e = step.ensembleOOB;
      set('p-ens-oob', e !== null ? `${((1 - e) * 100).toFixed(1)}%` : '—');
      set('p-imp-x1', `${(step.featureImportance.x1 * 100).toFixed(1)}%`);
      set('p-imp-x2', `${(step.featureImportance.x2 * 100).toFixed(1)}%`);
    }

    // ── OOB chart update ──────────────────────────────────────────────────
    const labels = step.oobAccuracies.map((_, i) => `Tree ${i + 1}`);
    const data   = step.oobAccuracies.map(a => a !== null ? +(a * 100).toFixed(1) : 0);
    const bgs    = step.oobAccuracies.map((_, i) => CLR_TREE[i] || CLR_TREE[0]);
    const bdrs   = step.oobAccuracies.map((_, i) => BDR_TREE[i] || BDR_TREE[0]);

    if (step.ensembleOOB !== undefined && step.ensembleOOB !== null) {
      labels.push('Ensemble');
      data.push(+(step.ensembleOOB * 100).toFixed(1));
      bgs.push(CLR_ENS);
      bdrs.push(BDR_ENS);
    }

    oobChart.data.labels                      = labels;
    oobChart.data.datasets[0].data            = data;
    oobChart.data.datasets[0].backgroundColor = bgs;
    oobChart.data.datasets[0].borderColor     = bdrs;
    oobChart.update();
  }

  new StepController({ steps: window.STEPS, onRender: render, interval: 1200 });
});
