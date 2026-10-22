---
title: 指标、交叉验证与类别不平衡
description: 根据任务目标选择分类回归指标，正确使用交叉验证，并处理少数类和阈值问题。
---

# 指标、交叉验证与类别不平衡

## 先问“错在哪里”

指标不是越多越好，而是要对应错误成本、预测输出和部署决策。先明确模型输出的是连续值、概率还是最终类别，以及假阳性（把负例判成正例）和假阴性的代价谁更高。

二分类混淆矩阵如下：

|  | 实际正例 | 实际负例 |
| --- | ---: | ---: |
| 预测正例 | TP | FP |
| 预测负例 | FN | TN |

## 分类指标

最常用的指标为

$$
\operatorname{precision}=\frac{TP}{TP+FP},\qquad
\operatorname{recall}=\frac{TP}{TP+FN},
$$

$$
\operatorname{specificity}=\frac{TN}{TN+FP},\qquad
F_1=\frac{2\cdot\operatorname{precision}\cdot\operatorname{recall}}
{\operatorname{precision}+\operatorname{recall}}.
$$

- precision 高表示“报为正的样本里更可靠”，适合误报成本高的场景。
- recall 高表示“真正的正例尽量不漏”，适合漏报成本高的场景。
- 调整分类阈值通常会让 precision 和 recall 此消彼长；阈值必须在验证数据上选择。
- accuracy $=(TP+TN)/(TP+FP+FN+TN)$ 在类别极不平衡时可能误导。例如正例占 1% 时，全预测负例也有 99% accuracy。

当模型输出连续分数时，可以扫过阈值画 ROC 曲线（横轴 FPR、纵轴 TPR），其面积 ROC-AUC 衡量排序能力，和具体阈值无关。正例非常稀少时，PR 曲线更关注正类质量，PR-AUC 往往比 ROC-AUC 更能反映实际筛选效果；两者都不替代固定业务阈值下的 precision/recall。

若输出要作为概率使用，还应检查**校准**：预测为 0.8 的样本是否大约 80% 为正例。Brier score 是平方概率误差的一种度量：

$$
\operatorname{Brier}=\frac1n\sum_{i=1}^n(p_i-y_i)^2.
$$

对数损失会惩罚过度自信的错误概率：

$$
\operatorname{LogLoss}=-\frac1n\sum_{i=1}^n\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right].
$$

| **维度**              | **Macro-F1（宏平均）**              | **Micro-F1（微平均）**                       |
| --------------------- | ----------------------------------- | -------------------------------------------- |
| **计算逻辑**          | 各自算 F1，再求算术平均（平权类别） | 汇总所有 $TP, FP, FN$，统一算 F1（平权样本） |
| **大类/常见类的影响** | 与小类权重完全一样（$1/N$）         | 贡献巨大，大类表现直接主导指标高低           |
| **小类/罕见类的影响** | 极其敏感，小类掉点会导致指标暴跌    | 影响很小，小类即使全判错也掀不起风浪         |
| **衡量目标**          | “模型是否做到了**各类兼顾**”        | “模型在**全量样本总量**上的总体判对率”       |

### ROC-AUC

**ROC-AUC** 是衡量二分类模型排序能力（Ranking Ability）的核心指标，它解耦了分类阈值的选取，专门用来评估模型区分正负样本的内在判别水平。

#### 核心坐标轴定义

ROC（Receiver Operating Characteristic，受试者工作特征曲线）的横纵坐标定义如下：

- **纵轴：真正例率（True Positive Rate, TPR）**，也即**召回率（Recall）**：

  $$\text{TPR} = \frac{TP}{P} = \frac{TP}{TP + FN}$$

  *含义：所有实际正例中，被正确找出来的比例。*

- **横轴：假正例率（False Positive Rate, FPR）**：

  $$\text{FPR} = \frac{FP}{N} = \frac{FP}{FP + TN}$$

  *含义：所有实际负例中，被错误预测为正例的比例。*

随着分类截断阈值（Threshold）从 1 逐渐降到 0，模型预测为正例的样本越来越多，TPR 与 FPR 都会随之单调递增，在坐标系中画出一条从 $(0, 0)$ 到 $(1, 1)$ 的单调曲线。

#### AUC（Area Under Curve）

AUC 是 **ROC 曲线下方的面积**，取值范围在 $[0, 1]$ 之间：

- $\text{AUC} = 1.0$：完美分类器，所有正例的预测分都高于负例。
- $\text{AUC} = 0.5$：等同于随机猜测（对角线），完全没有排序能力。
- $\text{AUC} < 0.5$：比随机还差，通常意味着正负标签反转。

#### 概率统计学本质（最关键的理解角度）

> **AUC 等价于：从所有正样本中随机抽取一个正样本 $x^+$，从所有负样本中随机抽取一个负样本 $x^-$，模型对正样本给出的预测概率 $P(x^+)$ 大于负样本预测概率 $P(x^-)$ 的概率。**
>
> $$\text{AUC} = P\big(\hat{y}(x^+) > \hat{y}(x^-)\big) + \frac{1}{2} P\big(\hat{y}(x^+) = \hat{y}(x^-)\big)$$

#### 使用场景与优缺点

- **阈值无关性**：在评估模型架构、超参数调优时，不需要提前拍脑袋决定 0.5 还是 0.3 作为阈值。
- **对样本不均衡鲁棒**：即使负样本是正样本的 1000 倍，只要正样本打分整体排在负样本前面，AUC 就不会受偏斜影响（这与 Precision-Recall 曲线形成鲜明对比）。
- **局限性**：AUC 只关心**相对排序（Order）**，不关心**绝对标定（Calibration）**。如果把所有预测概率整体缩放或平移，AUC 完全不变，但实际业务如果直接依赖阈值决策，模型打分可能已经严重失真。

#### 最符合直觉的基准实现：暴力两两配对 ($O(M \times N)$)

根据定义：

$$\text{AUC} = \frac{\sum_{x^+ \in \text{Pos}} \sum_{x^- \in \text{Neg}} I(P(x^+), P(x^-))}{M \times N}$$

其中指示函数为：

$$I(P(x^+), P(x^-)) = \begin{cases} 1.0, & P(x^+) > P(x^-) \\ 0.5, & P(x^+) = P(x^-) \\ 0.0, & P(x^+) < P(x^-) \end{cases}$$

```python
def calculate_auc_intuitive(labels: list, preds: list) -> float:
    # 1. 拆分正负样本预测值
    pos_scores = [p for p, y in zip(preds, labels) if y == 1]
    neg_scores = [p for p, y in zip(preds, labels) if y == 0]
    
    if not pos_scores or not neg_scores:
        raise ValueError("数据中必须同时包含正负样本")
        
    score_sum = 0.0
    
    # 2. 遍历所有 (正样本, 负样本) 对，比较大小
    for p in pos_scores:
        for n in neg_scores:
            if p > n:
                score_sum += 1.0
            elif p == n:
                score_sum += 0.5
                
    # 3. 统计得分除以总对数
    total_pairs = len(pos_scores) * len(neg_scores)
    return score_sum / total_pairs
```

- **优点**：记忆成本为 0，只要知道“正样本打分大于负样本的概率”就能直接手写，完全不用背复杂的 Rank 公式。
- **局限**：时间复杂度是 $O(M \times N)$。如果样本量上万，双重循环会超时（但在很多输入规模 $N \le 1000$ 的笔试题中完全能 AC）。

#### 兼顾直觉与性能的写法：排序 + 双指针/二分 ($O(K \log K)$)

可以**完全基于概率统计的“比较对”思想**，用排序加二分（或双指针）加速比对过程：

> 对负样本打分排好序：
>
> - 针对每个正样本得分 $p$，用二分查找（`bisect`）快速统计出**有多少个负样本打分严格小于 $p$**，以及**有多少个负样本与 $p$ 相等**。

```python
import bisect

def calculate_auc_bisect(labels: list, preds: list) -> float:
    pos_scores = [p for p, y in zip(preds, labels) if y == 1]
    neg_scores = sorted([p for p, y in zip(preds, labels) if y == 0])
    
    if not pos_scores or not neg_scores:
        raise ValueError("数据中必须同时包含正负样本")
        
    score_sum = 0.0
    for p in pos_scores:
        # bisect_left 找到严格小于 p 的负样本数量
        lt_count = bisect.bisect_left(neg_scores, p)
        # bisect_right 找到小于等于 p 的负样本数量
        le_count = bisect.bisect_right(neg_scores, p)
        
        eq_count = le_count - lt_count  # 与 p 相等的负样本数量
        
        score_sum += lt_count * 1.0 + eq_count * 0.5
        
    total_pairs = len(pos_scores) * len(neg_scores)
    return score_sum / total_pairs
```

- **时间复杂度**：排序负样本需要 $O(N \log N)$，遍历正样本并二分需要 $O(M \log N)$，总耗时 $O((M + N) \log N)$，非常高效。
- **记忆难度**：依然牢牢扣死“数有多少个负样本比我小，有多少个跟我打平”，符合直觉且逻辑极度清晰。

### PR-AUC

**PR-AUC（Precision-Recall Area Under Curve）**，即**精确率-召回率曲线下面积**，常被称为 **AP（Average Precision，平均精度）**。

如果说 ROC-AUC 关注的是“正负样本的相对排序”，那么 PR-AUC 关注的就是“模型在捞取正样本时的查准率与查全率权衡”**。它针对**极度不平衡数据（正样本极少）场景而生。

### PR 曲线与面积定义

- **横轴：召回率（Recall）**：$\frac{TP}{TP + FN}$（找出了多少比例的正例）。
- **纵轴：精确率（Precision）**：$\frac{TP}{TP + FP}$（找出来的正例里有多少是真的）。

当分类阈值从 1 逐渐降到 0：

- 召回率单调递增（从 0 到 1）。
- 精确率整体呈下降趋势（但常伴随局部锯齿抖动）。
- 曲线下方包围的积分面积就是 **PR-AUC**。

### 基准线与极度不平衡下的敏感性

PR-AUC 与 ROC-AUC 最本质的区别在于**基线（Baseline）\**和\**对大量负样本的敏感度**：

1.  随机猜测的基准线完全不同

- **ROC-AUC 的基线恒为 0.5**：无论正负比例是 1:1 还是 1:10000，随机盲猜模型的 ROC-AUC 永远是 0.5。
- **PR-AUC 的基线等于正样本占比（正例率 $P / N$）**：
  - 如果数据正负 1:1，随机盲猜的 PR-AUC 是 **0.5**；
  - 如果数据极度不平衡，正样本只占 1%，盲猜的基线就是 **0.01**。此时一个 PR-AUC 为 0.4 的模型实际上已经具有极高的实用价值。

2. 对大量真负例（TN）的“冷酷无情”

回顾公式：

$$\text{FPR} = \frac{FP}{FP + TN}, \quad \text{Precision} = \frac{TP}{TP + FP}$$

假设正样本 100 个，负样本 100,000 个（负样本是背景噪音）：

- 模型不小心误报了 100 个负样本（$FP = 100$）。
- 在 ROC 中：$TN \approx 100000$，$FPR = \frac{100}{100100} \approx 0.001$，横轴微乎其微，**ROC 曲线几乎不受影响，依然显得非常“漂亮”**。
- 在 PR 中：$TP = 100$ 时，$Precision = \frac{100}{100 + 100} = 50\%$，**精确率直接腰斩暴跌**。

> **结论**：在信用卡盗刷、罕见病筛查、广告点击预估等**正样本占比极低（如千分之一）**的场景中，ROC-AUC 往往会给出虚高的“虚假乐观”评估，而 **PR-AUC 才能真实反映模型误报对业务的冲击**。

#### PR-AUC vs ROC-AUC 核心对比

| **维度**        | **ROC-AUC**                    | **PR-AUC (Average Precision)**                            |
| --------------- | ------------------------------ | --------------------------------------------------------- |
| **坐标轴**      | 横轴 FPR vs 纵轴 TPR           | 横轴 Recall vs 纵轴 Precision                             |
| **是否包含 TN** | **包含**（$FPR$ 分母含 $TN$）  | **完全不包含**                                            |
| **随机基线**    | 固定为 **0.5**                 | **$\frac{\text{Pos}}{\text{Total}}$**（随样本正负比变化） |
| **主导能力**    | 全局正负排序能力               | 稀有正样本捕获与防误报能力                                |
| **适用场景**    | 类别相对平衡，或需全域无偏排序 | 极度不平衡（正样本 $< 5\%$），误报代价极高                |

#### 笔试/面试中的编程计算（AP 实现）

在算法笔试中，计算 PR-AUC 通常采用 **Average Precision (AP)** 的矩形积分定义（即每个正样本被召回瞬间的 Precision 累加平均）：

$$\text{AP} = \sum_{k=1}^K P(k) \times \Delta R(k) = \frac{1}{M} \sum_{i \in \text{Pos}} \text{Precision at rank } i$$

当阈值每放宽一步使召回率发生跳变时（即遇到一个正样本时），记录此时的 Precision，最后对所有正样本处的 Precision 求算术平均即可。

```python
def calculate_pr_auc(labels: list, preds: list) -> float:
    """计算 PR-AUC (Average Precision)
    :param labels: 真实标签列表 (0 或 1)
    :param preds:  模型预测分数
    """
    assert len(labels) == len(preds)
    n_pos = sum(labels)
    if n_pos == 0:
        raise ValueError("数据中至少需要一个正样本")
        
    # 1. 按预测分数从高到低排序 (降序)
    paired = sorted(zip(preds, labels), key=lambda x: x[0], reverse=True)
    
    tp = 0
    fp = 0
    ap = 0.0
    
    # 2. 依次降低阈值扫描样本
    for i, (_, label) in enumerate(paired):
        if label == 1:
            tp += 1
            # 遇到正样本，当前精确率 = tp / (tp + fp)
            precision = tp / (i + 1)
            # 召回率跳变量 delta_recall = 1 / n_pos
            ap += precision / n_pos
        else:
            fp += 1
            
    return ap


# --- 测试用例 ---
if __name__ == "__main__":
    y_true = [1, 0, 1, 0, 1]
    y_pred = [0.9, 0.8, 0.7, 0.4, 0.2]
    
    # 样本从高到低排序:
    # 1. 得分 0.9 (标签 1): TP=1, 样本总数=1 -> Precision = 1/1 = 1.0
    # 2. 得分 0.8 (标签 0): FP=1, 样本总数=2
    # 3. 得分 0.7 (标签 1): TP=2, 样本总数=3 -> Precision = 2/3 ≈ 0.667
    # 4. 得分 0.4 (标签 0): FP=2, 样本总数=4
    # 5. 得分 0.2 (标签 1): TP=3, 样本总数=5 -> Precision = 3/5 = 0.6
    # AP = (1.0 + 2/3 + 0.6) / 3 ≈ 0.7556
    print(f"PR-AUC (AP): {calculate_pr_auc(y_true, y_pred):.4f}")  # 输出: 0.7556
```

该算法时间复杂度为 $O(K \log K)$（由排序决定），单次线性扫描即可完成累计，易于在机试与白板推导中快速书写。

## 回归指标

给定真实值 $y_i$ 和预测值 $\hat y_i$：

$$
\operatorname{MAE}=\frac1n\sum_i|y_i-\hat y_i|,
\qquad
\operatorname{MSE}=\frac1n\sum_i(y_i-\hat y_i)^2,
$$

$$
\operatorname{RMSE}=\sqrt{\operatorname{MSE}}.
$$

MAE 对异常值更稳健，且与原目标单位相同；MSE/RMSE 更重视大误差，常用于大偏差代价高的任务。MAPE 在真实值接近 0 时不稳定，不能无条件使用。$R^2=1-\mathrm{SSE}/\mathrm{SST}$ 表示相对于“预测当前评估样本均值”的改进，测试集上的 $R^2$ 也可能为负，并不等于准确率。

在回归任务中，评估指标用于衡量模型预测值 $\hat{y}_i$ 与真实值 $y_i$ 之间的偏差。不同的指标对误差的敏感度、单位量纲以及业务解释性各有侧重。

设样本量为 $n$，$y_i$ 为真实值，$\hat{y}_i$ 为预测值，$\bar{y}$ 为真实值的均值。

### 1. MAE (Mean Absolute Error，平均绝对误差)

$$\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} \vert{}y_i - \hat{y}_i\vert{}$$

- **特点**：
  - **量纲一致**：误差单位与原始目标变量单位相同，解释直观（“平均偏差了多少”）。
  - **鲁棒性强**：误差按线性比例惩罚，不会对离群点（Outliers）进行平方放大，抗异常值能力优于基于平方的指标。
  - **统计学意义**：以 MAE 为损失函数进行优化时，模型拟合的是目标分布的**中位数（Median）**。
- **局限**：在误差为 0 处不可导（实际中通常使用次梯度或 Huber loss 平滑处理）。

### 2. MSE (Mean Squared Error，均方误差)

$$\text{MSE} = \frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2$$

- **特点**：
  - **强惩罚大误差**：由于平方项的存在，单个极端误差会被剧烈放大。适合对大偏差容忍度极低的场景。
  - **数学性质优良**：处处平滑可导，凸优化性质好，是最小二乘法与许多梯度优化算法的标准损失函数。
  - **统计学意义**：以 MSE 为优化目标时，模型拟合的是目标分布的**条件均值（Conditional Mean）**。
- **局限**：量纲变为了真实值的平方（例如目标是“元”，MSE 单位是“元²”），无法直观解释业务含义；极度容易被异常值带偏。

### 3. RMSE (Root Mean Squared Error，均方根误差)

$$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2}$$

- **特点**：
  - **兼具 MSE 与 MAE 的优点**：既保留了 MSE 对大误差的高敏感度惩罚机制，又通过开方将量纲还原到与 $y$ 相同的物理单位。
  - **与 MAE 的相对关系**：数学上有 $\text{RMSE} \ge \text{MAE}$。两者差距越大（$\text{RMSE} - \text{MAE}$ 显著），说明数据中存在越多大误差或极端离群值。
- **局限**：对离群点依然敏感。

### 4. MAPE (Mean Absolute Percentage Error，平均绝对百分比误差)

$$\text{MAPE} = \frac{100\%}{n} \sum_{i=1}^{n} \left\vert{} \frac{y_i - \hat{y}_i}{y_i} \right\vert{}$$

- **特点**：
  - **无量纲与相对尺度**：输出百分比，便于在量纲不同或数值跨度极大（如不同品类商品的销量预测）的任务之间横向对比。
- **缺陷与陷阱**：
  - **零除风险**：若真实值 $y_i = 0$，公式无法计算；若 $y_i \to 0$，指标会发生数值爆炸。
  - **惩罚不对称**：对正负向偏差惩罚严重失衡。例如：
    - 当 $y=10, \hat{y}=0$ 时，$\text{APE} = 100\%$；
    - 当 $y=10, \hat{y}=30$ 时，$\text{APE} = 200\%$；
    - 模型倾向于偏向保守预测（低估），以降低整体 MAPE。
  - *改进方案*：常用 **SMAPE**（Symmetric MAPE）缓解分母不对称问题。

### 5. $R^2$ (Coefficient of Determination，决定系数)

$$R^2 = 1 - \frac{\text{SS}_{\text{res}}}{\text{SS}_{\text{tot}}} = 1 - \frac{\sum_{i=1}^{n} (y_i - \hat{y}_i)^2}{\sum_{i=1}^{n} (y_i - \bar{y})^2}$$

- **核心含义**：

  - 衡量**模型解释了因变量总方差的比例**。
  - 基准（Baseline）是无脑预测均值 $\hat{y}_i = \bar{y}$（此时 $\text{SS}_{\text{res}} = \text{SS}_{\text{tot}}$，$R^2 = 0$）。

- **取值解读**：

  - $R^2 = 1$：完全拟合，无残差。
  - $0 < R^2 < 1$：模型比均值基线表现更好，$R^2 = 0.8$ 意味着模型解释了 80% 的目标波动。
  - $R^2 < 0$：在测试集上可能发生，说明模型的预测效果比直接取常数均值预测还要差（存在严重过拟合或模型设定错误）。

- **局限**：

  - 在多元线性回归中，增加冗余特征总会使训练集 $R^2$ 单调不减。因此实际中常参考**调整后决定系数（Adjusted $R^2$）**：

    $$R^2_{\text{adj}} = 1 - (1 - R^2) \frac{n - 1}{n - p - 1}$$

    其中 $p$ 为特征个数，通过自由度惩罚多余变量。

### 综合对比与选型参考

| **指标**  | **物理量纲**          | **异常值敏感度** | **适用场景**                                       | **核心关注点**           |
| --------- | --------------------- | ---------------- | -------------------------------------------------- | ------------------------ |
| **MAE**   | 原始单位              | **低**           | 存在噪点、长尾分布的业务（如物流履约时间）         | 均等惩罚，预测中位数     |
| **MSE**   | 单位平方              | **极高**         | 算法反向传播、理论推导                             | 强惩罚大偏差，平滑可导   |
| **RMSE**  | 原始单位              | **高**           | 容忍度低、重惩罚极端误差且需直观汇报（如电力负荷） | 量纲一致的大误差探测器   |
| **MAPE**  | 百分比 (%)            | **非对称**       | 跨尺度横向对比（如电商各品类销量）                 | 相对误差，注意规避 $y=0$ |
| **$R^2$** | 无量纲 $[-\infty, 1]$ | **同 MSE**       | 模型整体解释力评估、学术汇报                       | 相对基线的拟合质量       |

## 交叉验证

$k$ 折交叉验证把训练数据分成 $k$ 份，每次用 $k-1$ 份训练、剩下一份验证，平均验证分数用于估计模型在该数据分布上的表现和选择超参数。注意：

- 预处理、特征选择和模型训练必须只在当前训练折拟合。
- 分类任务通常使用分层 $k$ 折，以保持每折类别比例；少数类样本太少时仍会导致高方差。
- 同一用户、患者、设备或文档的记录应使用 group split，不能让同一 group 跨折。
- 时间序列应按时间向前验证，不能随机打乱未来。
- 如果同时用交叉验证选择大量方案又反复查看结果，仍会对验证过程过拟合；样本足够时可使用嵌套交叉验证。

最终测试分数只在方案和阈值固定后报告。应同时给平均分、折间波动和有效样本数；一个很高但波动巨大的均值不等于稳定模型。

## 类别不平衡

少数类任务要先确定目标：找全正例、减少误报，还是输出可信概率。常见策略是：

1. 用分层或分组切分，避免验证集中没有正例。
2. 训练时使用 class weight 或重采样；重采样只能作用于训练折，不能改验证/测试分布。
3. 在验证集根据业务成本选阈值；不要默认 0.5。
4. 报告少数类 precision、recall、F1、PR-AUC 和固定阈值表现，必要时补充混淆矩阵。
5. 评估概率任务时检查校准；重采样会改变训练先验，概率可能需要重新校准。

加权交叉熵可写为

$$
L=-\frac1n\sum_i w_{y_i}\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right].
$$

权重的选择反映训练时的代价，不会自动解决标签噪声、分布漂移或业务阈值问题。

## 易错点与比较

- ROC-AUC 衡量排序，不能直接告诉你某个阈值下的 precision；PR-AUC 也不能替代业务阈值下的召回率。
- F1 是 precision 和 recall 的调和平均，不能表达 FP 与 FN 的不同金钱代价；此时应使用成本函数或明确约束。
- macro-F1 对每个类别等权，micro-F1 按所有样本汇总；类别不均衡时两者可能差很多。
- 回归指标的平均值可能掩盖长尾样本和分组差异，应按关键群体分层查看。
- 用测试集调阈值会让测试集失去独立性；阈值属于模型方案的一部分。

## 闭卷题

### 题 1：不平衡数据

正例率为 0.5%，模型把所有样本预测为负，accuracy 约 99.5%。能否据此认为模型很好？至少应报告什么？

<details>
<summary>展开解析</summary>

不能。模型的正例 recall 为 0，无法完成发现正例的任务。应至少报告正类 precision、recall、F1、PR-AUC，并给出一个在验证集按业务代价选定的阈值下的混淆矩阵；如果输出概率，还应评估校准。
</details>

### 题 2：指标选择

在垃圾邮件过滤和癌症筛查中，哪一个更应该优先关注 recall？为什么不能只写“F1 更高的模型一定更好”？

<details>
<summary>展开解析</summary>

癌症筛查通常漏掉真实病例的代价更高，优先保证 recall，再在可接受的误报水平上比较 precision。垃圾邮件过滤往往更在意误删正常邮件，precision 或指定 recall 下的误报率可能更重要。F1 假设 precision 和 recall 同等重要，不能表达不同错误的业务代价，也不能说明阈值下的稳定性。
</details>

### 题 3：交叉验证泄漏

你先在全量训练数据上做标准化和选出相关性最高的 100 个特征，再进行 5 折交叉验证。这个分数还能作为无偏估计吗？

<details>
<summary>展开解析</summary>

不能保证。标准化统计量和特征选择使用了每一折的验证数据，验证信息进入训练流程。正确做法是把预处理和特征选择放入 pipeline，在每一折只用该折训练部分拟合，然后转换验证部分。
</details>

### 题 4：ROC 与 PR

两个模型 ROC-AUC 接近，但正例只占 0.1%，模型 A 的 PR-AUC 更高。你会优先选 A 吗？还要补看什么？

<details>
<summary>展开解析</summary>

在发现少数正例的任务里，A 的 PR-AUC 更高通常是有利信号，但还要看验证集上业务阈值的 precision、recall、覆盖量、成本和概率校准。PR-AUC 的基线也随正例率变化，不能脱离数据分布直接比较。
</details>

## 来源

- [AI-interview-cards](https://github.com/zixian2021/AI-interview-cards)：用于指标、交叉验证和不平衡题型查漏。
- [Stanford CS229 main notes](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)：用于损失、评估和统计学习背景。
