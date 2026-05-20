# Project Plan: ML Algorithm Visualizer

## 1. Project Overview

**Goal:** Build interactive HTML visualizations that walk through each computational step of machine learning algorithms, making the internal mechanics easy to understand.

**Delivery format:** GitHub repository. The `main` branch holds **only the README and project plan** — no algorithm code. Each algorithm has its own dedicated branch. Run locally via a Python HTTP server — no deployment needed.

**Core experience:** The user clicks a "Next Step" button to advance through the algorithm step by step. Each step updates the visualization, shows a plain-English caption, and highlights the corresponding line in the pseudocode panel.

---

## 2. Repository Structure

### Main Branch — README only

```
README.md          ← Project overview, branch link table, how-to-run instructions
PROJECT_PLAN.md    ← This document
```

> **Rule:** No algorithm code ever goes into `main`. Main is purely for documentation.

### Per-Algorithm Branch Structure

Each algorithm lives entirely in its own branch. The branch root is the algorithm's working directory — clone, check out the branch, and serve from there.

```
index.html            ← Entry point — open in browser
shared/
  controls.js         ← Step controller (Next / Prev / Reset / Auto Play)
  layout.css          ← Unified layout and animation styles
js/
  algorithm.js        ← Algorithm logic in pure JS (no ML libraries)
  visualization.js    ← Algorithm-specific rendering (D3 / Canvas)
  main.js             ← Page initialisation
data/
  sample_data.js      ← Inline sample dataset (global variable, no fetch needed)
```

### Branch Naming

| Branch | Algorithm |
|--------|-----------|
| `main` | README + PROJECT_PLAN only |
| `kmeans` | K-Means Clustering |
| `linear-regression` | Linear Regression |
| `logistic-regression` | Logistic Regression |
| `decision-tree` | Decision Tree |
| `random-forest` | Random Forest |

### Shared Code Sync Strategy

Since each algorithm branch is independent, shared utilities (controls, layout) are duplicated across branches. To keep them consistent:

1. Develop and finalise shared code on the **first algorithm branch** (`kmeans`).
2. When starting a new algorithm branch, cut it from `kmeans`: `git checkout -b linear-regression kmeans` — shared code is inherited automatically.
3. If shared code changes later, cherry-pick or manually apply the diff to other branches.

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

## 8. Evaluation Metrics (All Algorithms)

Every abbreviation, metric, and concept that appears in any visualization must show its full English name and Chinese translation.

### 8.1 K-Means Clustering

| Abbreviation | Full Name | 中文名称 | Description |
|---|---|---|---|
| WCSS | Within-Cluster Sum of Squares | 簇内平方和 | Sum of squared distances from each point to its assigned centroid. Lower = tighter clusters. Formula: Σᵢ Σₓ∈Cᵢ ‖x − μᵢ‖² |
| Silhouette Score | Silhouette Coefficient | 轮廓系数 | For each point: s = (b−a)/max(a,b), where a = mean intra-cluster distance, b = mean distance to nearest other cluster. Range [−1, 1], higher is better. |
| DBI | Davies-Bouldin Index | 戴维斯-鲍尔丁指数 | Mean ratio of within-cluster scatter to between-cluster separation. Lower is better. |
| CHI | Calinski-Harabasz Index | 卡林斯基-哈拉巴斯指数 | Ratio of between-cluster dispersion to within-cluster dispersion. Higher is better. |
| K | Number of clusters | 簇的数量 | Hyperparameter — must be set before running the algorithm. |
| μᵢ | Centroid of cluster i | 第 i 个簇的质心 | Mean position of all points in cluster i. |

### 8.2 Linear Regression

| Abbreviation | Full Name | 中文名称 | Description |
|---|---|---|---|
| MSE | Mean Squared Error | 均方误差 | Mean of squared differences between predicted and actual values. Formula: (1/n)Σ(ŷᵢ − yᵢ)² |
| RMSE | Root Mean Squared Error | 均方根误差 | Square root of MSE. Same unit as the target variable. Formula: √MSE |
| MAE | Mean Absolute Error | 平均绝对误差 | Mean of absolute differences. Less sensitive to outliers than MSE. Formula: (1/n)Σ|ŷᵢ − yᵢ| |
| R² | Coefficient of Determination | 决定系数 | Proportion of variance in y explained by the model. Range [0, 1], higher is better. Formula: 1 − SS_res/SS_tot |
| w | Weight / Slope | 权重 / 斜率 | Learned parameter — slope of the regression line. |
| b | Bias / Intercept | 偏置 / 截距 | Learned parameter — y-intercept of the regression line. |
| ∂L/∂w | Gradient w.r.t. weight | 损失对权重的梯度 | Direction and magnitude of loss change as w changes. Used in gradient descent. |
| lr | Learning Rate | 学习率 | Step size for gradient descent parameter update. |

### 8.3 Logistic Regression

| Abbreviation | Full Name | 中文名称 | Description |
|---|---|---|---|
| Log Loss | Binary Cross-Entropy Loss | 二元交叉熵损失 | Loss for binary classification. Formula: −(1/n)Σ[yᵢ log(ŷᵢ) + (1−yᵢ)log(1−ŷᵢ)] |
| Accuracy | Classification Accuracy | 准确率 | Fraction of correctly classified points. Formula: (TP+TN)/(TP+TN+FP+FN) |
| Precision | Precision | 精确率 | Of all predicted positives, how many are truly positive. Formula: TP/(TP+FP) |
| Recall | Recall / Sensitivity | 召回率 / 灵敏度 | Of all actual positives, how many were found. Formula: TP/(TP+FN) |
| F1 | F1 Score | F1 分数 | Harmonic mean of Precision and Recall. Formula: 2×P×R/(P+R) |
| AUC-ROC | Area Under ROC Curve | ROC 曲线下面积 | Probability that the model ranks a positive example higher than a negative one. Range [0, 1]. |
| σ | Sigmoid Function | Sigmoid 函数 | Maps any real value to (0, 1). Formula: σ(z) = 1/(1+e^−z) |
| TP / TN / FP / FN | True/False Positive/Negative | 真阳性 / 真阴性 / 假阳性 / 假阴性 | Components of the confusion matrix. |

### 8.4 Decision Tree

| Abbreviation | Full Name | 中文名称 | Description |
|---|---|---|---|
| Gini | Gini Impurity | 基尼不纯度 | Probability of misclassifying a randomly chosen element. Formula: 1 − Σ pᵢ². Range [0, 0.5], lower = purer node. |
| Entropy | Information Entropy | 信息熵 | Measure of disorder. Formula: −Σ pᵢ log₂(pᵢ). Range [0, 1]. |
| IG | Information Gain | 信息增益 | Reduction in entropy after a split. Formula: H(parent) − Σ wᵢ H(childᵢ) |
| Accuracy | Classification Accuracy | 准确率 | Same as Logistic Regression above. |
| Precision / Recall / F1 | — | 精确率 / 召回率 / F1 分数 | Same as Logistic Regression above. |
| Depth | Tree Depth | 树的深度 | Number of levels from root to deepest leaf. Controls model complexity. |

### 8.5 Random Forest

| Abbreviation | Full Name | 中文名称 | Description |
|---|---|---|---|
| OOB Error | Out-of-Bag Error | 袋外误差 | Error rate on samples not included in a tree's bootstrap sample. Free validation estimate. |
| Feature Importance | Feature Importance | 特征重要性 | Mean decrease in impurity across all trees for each feature. Higher = more influential. |
| Bootstrap | Bootstrap Sampling | Bootstrap 采样 | Sampling n points with replacement from n training points. Each tree sees ~63% unique samples. |
| Voting | Majority Vote | 多数投票 | Final prediction = class chosen by the most trees. |
| Accuracy / Precision / Recall / F1 / AUC-ROC | — | 准确率 / 精确率 / 召回率 / F1 / AUC-ROC | Same as Logistic Regression above. |

---

## 9. Implementation Order and Milestones

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
