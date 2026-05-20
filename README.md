# ML Algorithm Visualizer

Interactive step-by-step visualizations of classic machine learning algorithms. Each algorithm lives on its own branch. Clone the repo, check out a branch, and run a local server to see the visualization in your browser.

---

## Algorithms

| Branch | Algorithm | What you'll see |
|--------|-----------|-----------------|
| [`kmeans`](../../tree/kmeans) | K-Means Clustering | Centroid movement, point re-assignment, Voronoi regions |
| [`linear-regression`](../../tree/linear-regression) | Linear Regression | Gradient descent line update, residuals, loss curve |
| [`logistic-regression`](../../tree/logistic-regression) | Logistic Regression | Sigmoid curve, decision boundary shifting |
| [`decision-tree`](../../tree/decision-tree) | Decision Tree | Node splitting, tree growing, decision region fill |
| [`random-forest`](../../tree/random-forest) | Random Forest | Bootstrap sampling, multi-tree voting |

---

## How to Run

```bash
git clone git@github.com:wsw99/ml-visualizer.git
cd ml-visualizer
git checkout kmeans          # switch to the algorithm you want
python -m http.server 8000
# open http://localhost:8000 in your browser
```

> Alternatively, use the **VS Code Live Server** extension: right-click `index.html` → Open with Live Server.

---

## Tech Stack

- **D3.js v7** — decision tree layout and axes
- **Chart.js** — loss curves and line charts
- **KaTeX** — math formula rendering (∂L/∂w, Gini, Sigmoid, etc.)
- **Native Canvas API** — K-Means animation and regression drawing
- **Pure JavaScript** — all algorithm logic implemented from scratch, no ML libraries

---

## Project Structure (per algorithm branch)

```
index.html          ← open this in your browser
shared/             ← step controller, layout, drawing utilities
js/
  algorithm.js      ← algorithm logic in pure JS
  visualization.js  ← rendering (D3 / Canvas)
data/
  sample_data.js    ← built-in 2D sample dataset
lib/                ← local copies of D3, Chart.js, KaTeX
```
