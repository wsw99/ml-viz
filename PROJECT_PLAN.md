# Project Plan: ML Algorithm Visualizer

## 1. Project Overview

**Goal:** Build interactive HTML visualizations that walk through each computational step of machine learning algorithms, making the internal mechanics easy to understand.

**Delivery format:** GitHub repository. The `main` branch holds the README and shared code. Each algorithm has its own branch. Run locally via a Python HTTP server — no deployment needed.

**Core experience:** The user clicks a "Next Step" button to advance through the algorithm step by step. Each step updates the visualization, shows a plain-English caption, and highlights the corresponding line in the pseudocode panel.

---

## 2. Repository Structure

### Main Branch (README + shared code source of truth)

```
README.md             ← Project overview, branch link table, screenshot previews
shared/               ← Shared code — single source of truth for all branches
lib/                  ← Third-party library files (D3, Chart.js, KaTeX)
index.html.template   ← Unified page template for all algorithms
```

### Per-Algorithm Branch Structure

```
index.html            ← Entry point — open in browser
shared/               ← Shared code (synced from main, see strategy below)
  controls.js         ← Step controller (Next / Prev / Reset / Auto Play)
  step-engine.js      ← Step state machine (snapshot array + index render)
  layout.css          ← Unified layout and animation styles
  draw-utils.js       ← Common drawing helpers (axes, scatter, color palette)
js/
  algorithm.js        ← Algorithm logic in pure JS (no ML libraries)
  visualization.js    ← Algorithm-specific rendering (D3 / Canvas)
data/
  sample_data.js      ← Inline sample dataset as a global variable
lib/                  ← Third-party library files (d3.min.js, chart.min.js, katex)
```

### Shared Code Sync Strategy (Multi-Branch)

Since each algorithm lives in its own branch, `shared/` and `lib/` exist in every branch. To avoid editing five copies whenever shared code changes:

1. **`main` is the single source of truth** for `shared/`, `lib/`, and the page template.
2. **Algorithm branches are cut from `main`**: `git checkout -b kmeans main` — they inherit shared code automatically.
3. **To sync updates**: edit `shared/` on `main`, then merge into each algorithm branch: `git checkout kmeans && git merge main`.

> This preserves the one-branch-per-algorithm structure while keeping shared code in one place.

### Planned Branches

| Branch | Algorithm | Core Visualization |
|--------|-----------|--------------------|
| `decision-tree` | Decision Tree | Node splitting process, tree growing step by step |
| `random-forest` | Random Forest | Bootstrap sampling animation + multi-tree voting |
| `linear-regression` | Linear Regression | Gradient descent line update, residuals, loss curve |
| `logistic-regression` | Logistic Regression | Sigmoid curve, decision boundary shifting |
| `kmeans` | K-Means | Centroid movement, point re-assignment, Voronoi regions |

---

## 3. Tech Stack

**No backend. Runs entirely in the browser.**

| Library | Purpose | How |
|---------|---------|-----|
| D3.js v7 | Decision tree hierarchy layout, axes | Local file |
| Chart.js | Loss curves, line charts | Local file |
| KaTeX | Math formula rendering (∂L/∂w, Sigmoid, Gini, etc.) | Local file |
| Native Canvas API | K-Means animation, regression line drawing | Built-in |
| Plain CSS animations | Step transitions, highlight effects | Local file |

> Algorithm logic is implemented **from scratch in pure JavaScript** — no sklearn.js or similar ML libraries — so the code directly mirrors the algorithm steps shown.

### How to Run Locally

Clone the repo, check out the algorithm branch you want, start a local server, and open `localhost:8000`:

```bash
git clone <repo-url>
cd ml-visualizer
git checkout kmeans          # switch to the algorithm you want
python -m http.server 8000   # built into Python, zero install
# open http://localhost:8000 in your browser
```

> Alternative: VS Code Live Server extension — right-click `index.html` → Open with Live Server.

### Data Loading Convention

Data is written as a global variable in `data/sample_data.js` and loaded with `<script src>`:

```js
// data/sample_data.js
window.DATA = [{ x: 1.2, y: 3.4, label: 0 }, ...];
```

> This works with both the local server and direct file open (no fetch/CORS issues).

### Data Dimensionality Convention

**All algorithms use 2-feature (2D) data only.** This is required for scatter plots, decision boundaries, and region coloring to be drawable:

- K-Means / Regression: synthetic Gaussian cluster data (`make_blobs` style) or noisy linear data.
- Decision Tree / Random Forest / Logistic Regression: 2-feature slice of Iris, or synthetic 2D separable data.

---

## 4. Page Layout (Unified Across All Algorithms)

```
┌─────────────────────────────────────────────────────┐
│  [Algorithm Name]                      Step 3 / 8   │
├──────────────────────┬──────────────────────────────┤
│                      │  Step caption (plain text)   │
│   Main visualization │  ──────────────────────────  │
│   (D3 / Canvas)      │  Pseudocode (current line    │
│                      │  highlighted)                │
│                      │  ──────────────────────────  │
│                      │  Parameter panel             │
│                      │  w=0.32  b=-0.11  MSE=2.4    │
├──────────────────────┴──────────────────────────────┤
│  [⏮ Reset]  [◀ Prev]  [▶ Next]  [⏩ Auto Play]      │
└─────────────────────────────────────────────────────┘
```

---

## 5. Step-by-Step Design Per Algorithm

### 5.1 K-Means (`kmeans` branch)

| Step | What is shown |
|------|---------------|
| Step 0 | Scatter plot: unlabeled gray data points |
| Step 1 | K centroids placed randomly (large star markers, one color per centroid) |
| Step 2 | Each point recolored by nearest centroid; lines drawn to centroids |
| Step 3 | Centroids move to group means (animated trail lines) |
| Step 4 | Points recolored; highlight any that changed assignment |
| Step N | Repeat Steps 2–4 until convergence |
| Final | Final clusters + Voronoi region fill + WCSS history chart |

**Parameter panel shows:** iteration count, centroid coordinates, current WCSS.

### 5.2 Linear Regression (`linear-regression` branch)

| Step | What is shown |
|------|---------------|
| Step 0 | Scatter plot: raw data points |
| Step 1 | Random initial line (current w and b displayed) |
| Step 2 | Red vertical residual lines drawn, current MSE shown |
| Step 3 | Gradient values ∂L/∂w and ∂L/∂b computed and displayed |
| Step 4 | Parameters updated; line moves, residuals shrink |
| Steps 5–N | Loss curve on the right appends a new point each iteration |
| Final | Converged line + final parameter values |

### 5.3 Logistic Regression (`logistic-regression` branch)

| Step | What is shown |
|------|---------------|
| Step 0 | Binary classification scatter plot (two colors) |
| Step 1 | Initial weights; initial decision boundary drawn |
| Step 2 | One sample highlighted; its predicted probability via Sigmoid shown |
| Step 3 | Binary cross-entropy loss computed and shown |
| Step 4 | Weights updated; decision boundary rotates/shifts |
| Final | Converged boundary + correct/wrong classification markers + loss curve |

### 5.4 Decision Tree (`decision-tree` branch)

| Step | What is shown |
|------|---------------|
| Step 0 | Scatter plot: labeled dataset (multi-class colors) |
| Step 1 | Root node: Gini/Entropy for each feature compared |
| Step 2 | Best split chosen; split line drawn; data divided into left/right |
| Step 3 | New node appears in the tree diagram with feature, threshold, Gini, samples |
| Step N | Recursive splits; tree grows until leaves are pure or max depth reached |
| Final | Full tree + decision region fill on the scatter plot (one color per leaf) |

**Node info box:**
```
feature: petal_length ≤ 2.45
samples: 100
gini: 0.32
class distribution: [50, 30, 20]
```

### 5.5 Random Forest (`random-forest` branch)

| Step | What is shown |
|------|---------------|
| Step 0 | Full training set scatter plot |
| Step 1 | Bootstrap sampling: animated highlight of which points are selected (with replacement) |
| Step 2 | One decision tree trained on the subset (compact tree visualization) |
| Step 3 | Trees 2 and 3 shown with different samples and different structures |
| Step 4 | A new query point added; each tree's prediction shown |
| Final | Majority vote aggregated → final prediction with confidence |

---

## 6. Step State Management (Shared Core Mechanism)

Prev / Next step traversal is the core of the project. All algorithms use the same **snapshot array + index render** pattern, implemented in `shared/step-engine.js`:

1. The algorithm runs to completion up front and pushes a full state snapshot into `steps[]` at each step:
   ```js
   // K-Means example
   steps.push({
     centroids: [...],       // current centroid positions
     assignments: [...],     // which cluster each point belongs to
     wcss: 12.34,            // current WCSS value
     codeLine: 3,            // pseudocode line to highlight
     caption: "Reassign points to nearest centroid"
   });
   ```
2. The render layer is a pure function: `render(steps[currentIndex])` — no internal state.
3. Next / Prev only change `currentIndex`. Reset sets it to 0. Auto Play advances it on a timer.

> Benefit: backtracking is free (just read the stored snapshot), algorithm logic is fully decoupled from rendering, and the controller is reused unchanged across all five algorithms.

---

## 7. Algorithm Correctness Verification

Each algorithm is verified against a known reference before the visualization is finalized:

| Algorithm | Verification method |
|-----------|---------------------|
| K-Means | Compare final centroids against sklearn with the same seed and dataset |
| Linear / Logistic Regression | Compare learned coefficients against sklearn or the normal equation solution |
| Decision Tree | Hand-calculate the root node Gini and first split on a small dataset |
| Random Forest | Verify a single tree first, then validate voting logic with a constructed example |

---

## 8. Implementation Order and Milestones

| Week | Task | Output |
|------|------|--------|
| Week 1 | Set up repo + shared framework + complete K-Means | `kmeans` branch running |
| Week 2 | Linear Regression + Logistic Regression | Both branches running |
| Week 3 | Decision Tree (including D3 tree layout) | `decision-tree` branch running |
| Week 4 | Random Forest + polish README + screenshots | All branches complete |

> **Why K-Means first:** It has the most visually immediate animation, the simplest logic, and serves as the proving ground for the shared step engine, layout, and pseudocode highlight panel. Everything built here is reused by all later algorithms.

---

## 9. Risks and Fallbacks

| Risk | Fallback |
|------|----------|
| D3.js tree layout debugging takes too long | Hand-compute node positions with BFS layering — no D3 hierarchy needed |
| Custom tree struct → D3 hierarchy format conversion is tedious | Write a `treeToD3()` adapter in `shared/`, reused across decision tree and random forest |
| Random forest step design is too complex | Simplify to showing 3 tree results and a vote tally — skip full Bootstrap animation |
| `shared/` merge conflicts when syncing branches | Only ever edit shared code on `main`; algorithm branches only receive `merge main`, never push back |
| Too many steps, animation feels long | Add a "Skip to End" button that jumps directly to the final state |

---

## 10. Final Deliverables

- GitHub repository (5 algorithm branches + `main`)
- Each branch: `index.html` + `shared/` + `js/` + `data/` + `lib/`
- `main` README: project description, branch link table, run instructions, screenshot previews
- Optional: screen-recorded GIF per algorithm embedded in README

---

*Plan date: 2026-05-20*
