# ML Algorithm Visualizer

Interactive step-by-step visualizations of classic machine learning algorithms. Each algorithm lives in its own folder. Clone the repo, start a local server, and open the folder you want in your browser.

---

## Algorithms

| Folder | Algorithm | What you'll see |
|--------|-----------|-----------------|
| [`kmeans/`](kmeans/) | K-Means Clustering | Centroid movement, point re-assignment, Voronoi regions |
| [`linear-regression/`](linear-regression/) | Linear Regression | Gradient descent line update, residuals, loss curve |
| [`logistic-regression/`](logistic-regression/) | Logistic Regression | Sigmoid curve, decision boundary shifting |
| [`decision-tree/`](decision-tree/) | Decision Tree | Node splitting, tree growing, decision region fill |
| [`random-forest/`](random-forest/) | Random Forest | Bootstrap sampling, multi-tree voting |

---

## How to Run

```bash
git clone git@github.com:wsw99/ml-viz.git
cd ml-viz
python -m http.server 8000
# open http://localhost:8000/kmeans/ in your browser
```

> Alternatively, use the **VS Code Live Server** extension: right-click any `index.html` → Open with Live Server.

---

## Tech Stack

- **Chart.js** — loss curves and line charts
- **D3.js v7** — decision tree layout and axes
- **KaTeX** — math formula rendering (∂L/∂w, Gini, Sigmoid, etc.)
- **Native Canvas API** — K-Means animation and regression drawing
- **Pure JavaScript** — all algorithm logic implemented from scratch, no ML libraries

---

## Project Structure (per algorithm folder)

```
<algorithm>/
  index.html          ← open this in your browser
  shared/             ← step controller, layout, drawing utilities
  js/
    algorithm.js      ← algorithm logic in pure JS
    visualization.js  ← rendering (D3 / Canvas)
    main.js           ← page initialisation
  data/
    sample_data.js    ← built-in 2D sample dataset
```
