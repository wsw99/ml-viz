// Initialises the K-Means visualisation page.

document.addEventListener('DOMContentLoaded', function () {
  const viz = new KMeansViz('main-canvas');

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
          x: {
            title: { display: true, text: 'Iteration', font: { size: 11 } },
            ticks: { font: { size: 10 } },
          },
          y: {
            title: { display: true, text: 'WCSS', font: { size: 11 } },
            ticks: { font: { size: 10 } },
            beginAtZero: false,
          },
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

    // Pseudocode highlight
    document.querySelectorAll('#pseudo-lines li').forEach((li, i) => {
      li.classList.toggle('active', i === step.codeLine);
    });

    // Parameter panel
    document.getElementById('p-iter').textContent =
      step.iteration > 0 ? step.iteration : '—';
    document.getElementById('p-wcss').textContent =
      step.wcssHistory.length
        ? step.wcssHistory[step.wcssHistory.length - 1].toFixed(2)
        : '—';
    document.getElementById('p-assigned').textContent =
      step.points.filter(p => p.cluster >= 0).length + ' / ' + step.points.length;

    // WCSS chart
    wcssChart.data.labels   = step.wcssHistory.map((_, i) => i + 1);
    wcssChart.data.datasets[0].data = step.wcssHistory;
    wcssChart.update();
  }

  new StepController({ steps: window.STEPS, onRender: render, interval: 1000 });
});
