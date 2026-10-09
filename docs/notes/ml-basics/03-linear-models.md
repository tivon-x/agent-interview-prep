---
title: 线性模型、逻辑回归、MLE 与 MAP
description: 从线性回归和逻辑回归的概率假设出发，理解极大似然、最大后验、正则化和梯度。
---

# 线性模型、逻辑回归、MLE 与 MAP

## 线性回归

线性回归把预测写成

$$
\hat y=\mathbf w^\top\mathbf x+b.
$$

最小二乘目标为

$$
J(\mathbf w, b)=\frac1{2n}\sum_{i=1}^n(\hat y_i-y_i)^2.
$$

前面的 $1/2$ 只是让梯度更简洁，不改变最优解。写成矩阵 $\hat{\mathbf y}=X\mathbf w$（把偏置并入特征）时，若 $X^\top X$ 可逆，正规方程为

$$
\mathbf w=(X^\top X)^{-1}X^\top\mathbf y.
$$

高维、共线或大规模数据中更常用梯度下降或带正则的数值优化。平方误差对应一个常见概率假设：

$$
y_i\mid x_i\sim\mathcal N(\mathbf w^\top x_i,\sigma^2),
$$

并假设样本噪声相互独立且具有相同固定方差。这个假设不是说数据一定正态，而是说明为什么平方误差可以由极大似然推出。

## 逻辑回归

二分类中，先计算线性得分 $z=\mathbf w^\top x+b$，再用 sigmoid 得到正类概率：

$$
\sigma(z)=\frac1{1+e^{-z}},\qquad p(y=1\mid x)=\sigma(z).
$$

对标签 $y\in\{0,1\}$，Bernoulli 负对数似然（交叉熵）为

$$
J(\mathbf w, b)=-\frac1n\sum_{i=1}^n
\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right].
$$

令 $X$ 包含偏置列，批量梯度为

$$
\nabla_{\mathbf w}J=\frac1nX^\top(\mathbf p-\mathbf y),
$$

因此一次 Batch GD 更新是

$$
\mathbf w\leftarrow\mathbf w-\eta\frac1nX^\top(\mathbf p-\mathbf y).
$$

分类阈值默认常取 0.5，但它不是模型定理；应按验证集上的代价、precision/recall 约束或容量选择。逻辑回归的决策边界 $\mathbf w^\top x+b=0$ 是线性的，增加合理的特征变换后才能表示非线性边界。

## MLE：极大似然

给定独立样本，似然是参数生成这些观测的联合概率：

$$
L(\theta)=p(D\mid\theta)=\prod_{i=1}^np(y_i\mid x_i;\theta).
$$

极大似然估计为

$$
\hat\theta_{MLE}=\arg\max_\theta L(\theta)
=\arg\max_\theta\sum_i\log p(y_i\mid x_i;\theta).
$$

乘积可能下溢，所以实际最小化负对数似然 $-\sum_i\log p(y_i\mid x_i;\theta)$。在 Bernoulli 模型下它就是逻辑回归交叉熵；在固定方差高斯模型下它等价于最小二乘（差一个与参数无关的常数和缩放）。

“似然”把参数当变量、观测当已知；它不是把 $p(\theta\mid D)$ 直接称为概率。样本独立是把联合概率写成乘积的条件。

## MAP：最大后验

如果对参数有先验 $p(\theta)$，贝叶斯公式给出

$$
p(\theta\mid D)\propto p(D\mid\theta)p(\theta).
$$

最大后验估计为

$$
\hat\theta_{MAP}=\arg\max_\theta\left[\log p(D\mid\theta)+\log p(\theta)\right]
=\arg\min_\theta\left[-\log p(D\mid\theta)-\log p(\theta)\right].
$$

因此正则化可以看成对参数的先验约束：

- 若各维参数相互独立且 $w_j\sim\mathcal N(0,\tau^2)$，则 $-\log p(w)$ 与 $\|w\|_2^2/(2\tau^2)$ 相差常数，得到 L2/Ridge 惩罚。
- 若参数各维相互独立地服从以 0 为中心的 Laplace 先验，则 $-\log p(w)$ 与 $\|w\|_1$ 成正比，得到 L1/Lasso 惩罚，倾向产生稀疏参数。

带正则的逻辑回归可写成

$$
J_{MAP}(w)= -\sum_i\log p(y_i\mid x_i; w)+\lambda\Omega(w).
$$

这里 $\lambda$ 与先验尺度、是否取平均以及参数化方式有关，不应脱离目标函数随意比较数值。偏置通常不正则化，以便模型自由调整整体预测基线；这不是数学上的强制规定，是否正则化要以实现约定为准。

## L1、L2 与优化

L2 惩罚让大权重变小、目标保持光滑，通常更容易用梯度法优化；L1 的绝对值在 0 处不可导，可用次梯度或专门的近端方法，结果通常更稀疏。正则化强度越大，模型自由度通常越低，可能从过拟合转向欠拟合。

数值实现中用稳定形式计算 log-sigmoid 或交叉熵，避免 $e^{-z}$ 溢出和 $\log(0)$。批量梯度中的平均因子 $1/n$、学习率和正则梯度要保持一致；题目给的损失若是求和，梯度就不能擅自除以 $n$。

## 易错点与比较

- MLE 不需要参数先验；MAP 需要先验，正则化是其一种优化表达。
- MLE/MAP 的概率解释依赖假设；“用了交叉熵”不等于所有任务都自动满足校准或因果解释。
- 逻辑回归输出概率，最终分类还需要阈值；SVM 的间隔目标并不直接是概率。
- L2 会缩小权重但通常不会精确变成 0；L1 才有稀疏倾向。
- 训练前标准化特征常有助于正则化公平作用；否则量纲大的特征会受到不同有效惩罚。

## 闭卷题

### 题 1：一次逻辑回归梯度

只有一个样本，加入偏置后的 $x=[1,2]$，标签 $y=1$，当前 $w=[0,0]$，损失取单样本交叉熵。写出 $p$、梯度和学习率 $\eta=0.1$ 后的新权重。

<details>
<summary>展开解析</summary>

$z=w^\top x=0$，所以 $p=\sigma(0)=0.5$。梯度为 $(p-y)x=(-0.5)[1,2]=[-0.5,-1]$。更新 $w'=w-0.1\nabla w=[0.05,0.1]$。这里没有除以样本数，因为只有一个样本；若题目定义了正则项，还要把正则梯度加进去。
</details>

### 题 2：判断 MLE 与 MAP

下列说法哪些正确？①固定方差高斯回归的 MLE 等价于最小二乘；②给参数加零均值高斯先验会得到 L2 惩罚；③MAP 一定比 MLE 在测试集上好；④正则化项就是数据的额外观测。

<details>
<summary>展开解析</summary>

①②正确。③不一定，先验或正则强度不合适会造成偏差；④错误，正则项来自参数先验或工程约束，不是新增标签数据。
</details>

### 题 3：为什么是交叉熵

逻辑回归中 $y\in\{0,1\}$，模型给出 $p_i$。写出一条样本的负对数似然，并说明它与二分类交叉熵的关系。

<details>
<summary>展开解析</summary>

Bernoulli 概率为 $p_i^{y_i}(1-p_i)^{1-y_i}$，负对数为 $-[y_i\log p_i+(1-y_i)\log(1-p_i)]$，这正是该样本的二分类交叉熵。对样本求和或取平均只改变尺度，不改变无正则时的最优点。
</details>

### 题 4：正则化与特征尺度

同一个 L2 系数下，特征 $x_1$ 的数值范围是 $[0,1]$，$x_2$ 的范围是 $[0,10^4]$。为什么训练前通常要标准化？

<details>
<summary>展开解析</summary>

不同量纲会造成梯度和参数尺度差异，数值优化的等高线变得狭长；同时同一个 $\lambda w_j^2$ 对不同特征的有效约束并不直观。标准化有助于优化和让正则化对各特征更可比，但均值方差必须只在训练数据（或训练折）上拟合。
</details>

## 来源

- [AI-interview-cards](https://github.com/zixian2021/AI-interview-cards)：用于线性回归、逻辑回归和正则化常见题型。
- [Stanford CS229 main notes](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)：用于 MLE、MAP、正则化和逻辑回归推导。
