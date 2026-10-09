---
title: 决策树与集成学习
description: 掌握决策树、随机森林、AdaBoost、GBDT 和 XGBoost 的训练机制、目标函数与对比。
---

# 决策树与集成学习

## 决策树：递归切分特征空间

决策树在一个特征及其阈值上切分样本，递归地让子节点更“纯”。分类树常用熵或 Gini 不纯度：

$$
H(S)=-\sum_{c}p_c\log p_c,
\qquad
Gini(S)=1-\sum_cp_c^2.
$$

父节点不纯度与子节点加权不纯度之差就是切分带来的下降。例如 Gini 增益

$$
\Delta I=I(S)-\frac{|S_L|}{|S|}I(S_L)-\frac{|S_R|}{|S|}I(S_R).
$$

回归树通常最小化叶节点内平方误差，叶子预测为该叶样本均值。树深、叶子最小样本数、剪枝等控制复杂度；没有限制的树容易把训练样本切到很纯而过拟合。树能表示非线性和特征交互，通常不要求特征标准化，但外推到训练范围之外较弱。

## 随机森林：并行降低方差

随机森林对许多棵决策树做 bagging：每棵树从训练集 bootstrap 采样，并在每次切分时随机抽取一部分特征，再把分类结果投票或回归结果平均。单树之间的相关性越低，平均后的方差越可能下降；随机特征子集就是降低相关性的一种手段。

未被某棵树 bootstrap 抽中的样本是该树的 out-of-bag（OOB）样本，可用于近似验证，但如果反复用 OOB 选大量超参数，仍会对 OOB 估计过拟合。随机森林一般比单棵深树稳定，训练可并行，但模型大、解释和概率校准需要额外处理。

## AdaBoost：逐步关注难样本

二分类 AdaBoost 为每个样本维护权重，初始相等。第 $t$ 个弱分类器 $h_t$ 的加权错误率为

$$
\epsilon_t=\sum_iD_t(i)\mathbf 1[h_t(x_i)\ne y_i],
$$

其权重为

$$
\alpha_t=\frac12\log\frac{1-\epsilon_t}{\epsilon_t}
$$

（使用 $y_i\in\{-1,+1\}$ 的约定）。更新后

$$
D_{t+1}(i)\propto D_t(i)\exp(-\alpha_ty_ih_t(x_i)).
$$

错分样本的权重上升，下一轮更关注它们；最终模型是 $\operatorname{sign}(\sum_t\alpha_th_t(x))$。弱学习器错误率应低于随机猜测的 0.5 才能得到正的 $\alpha$。AdaBoost 对异常点和标签噪声可能敏感，因为它会持续关注难以拟合的样本。

## GBDT：拟合负梯度

梯度提升树逐轮添加树：

$$
F_t(x)=F_{t-1}(x)+\eta h_t(x),
$$

其中新树近似当前模型损失对预测值的负梯度，即伪残差。平方损失下它就是残差 $y-F_{t-1}(x)$；一般损失不一定是简单残差。学习率 $\eta$ 越小通常需要更多树，树深和叶子数控制每棵弱学习器的复杂度。

GBDT 与随机森林的差异：随机森林并行训练许多去相关的树，主要降低方差；GBDT 顺序训练下一棵树修正当前错误，主要逐步降低偏差，也更容易过拟合，需要学习率、树数、深度等配合。两者都可处理非线性和特征交互，但不能把“树模型不需要缩放”理解为所有预处理都不需要。

## XGBoost：二阶近似与正则化

XGBoost 在 GBDT 的逐步加树框架上使用二阶泰勒近似，并显式正则化新树。固定旧树并去掉其正则化常数项后，第 $t$ 轮与新树有关的目标写作

$$
\operatorname{Obj}^{(t)}
=\sum_{i=1}^n l(y_i,\hat y_i^{(t-1)}+f_t(x_i))
+\Omega(f_t),
$$

其中

$$
\Omega(f)=\gamma T+\frac12\lambda\sum_{j=1}^{T}w_j^2.
$$

$T$ 是叶子数，$w_j$ 是叶权重。令

$$
g_i=\partial_{\hat y}l(y_i,\hat y_i^{(t-1)}),
\qquad
h_i=\partial^2_{\hat y}l(y_i,\hat y_i^{(t-1)}),
$$

则忽略与当前树无关的常数项后

$$
\widetilde{\operatorname{Obj}}
=\sum_i\left[g_if_t(x_i)+\frac12h_if_t(x_i)^2\right]+\Omega(f_t).
$$

若叶 $j$ 中样本的梯度和、海森和为 $G_j=\sum_{i\in I_j}g_i$、$H_j=\sum_{i\in I_j}h_i$，该叶关于权重的部分为

$$
G_jw_j+\frac12(H_j+\lambda)w_j^2+\gamma.
$$

令导数为 0，得到叶子最优权重和该叶目标贡献：

$$
w_j^*=-\frac{G_j}{H_j+\lambda},
\qquad
\operatorname{Score}_j=-\frac12\frac{G_j^2}{H_j+\lambda}+\gamma.
$$

候选切分把父节点分成左、右两叶时，按“目标下降”定义的增益为

$$
\operatorname{Gain}=\frac12\left(
\frac{G_L^2}{H_L+\lambda}+
\frac{G_R^2}{H_R+\lambda}-
\frac{G^2}{H+\lambda}
\right)-\gamma,
$$

其中 $G=G_L+G_R$、$H=H_L+H_R$。增益不正时，按该目标不值得切分；实际实现还会检查最小子节点权重、深度等约束。XGBoost 的二阶项让切分和叶权重同时利用曲率信息，$\lambda$ 抑制叶权重，$\gamma$ 惩罚增加叶子。

### 一次分裂增益手算

设候选切分的统计量为

$$
(G_L, H_L)=(2,2),\quad(G_R, H_R)=(-1,1),
$$

所以父节点 $(G, H)=(1,3)$。取 $\lambda=1,\gamma=0.1$，两个子叶的最优权重为

$$
w_L^*=-\frac2{2+1}=-\frac23,\qquad
w_R^*=-\frac{-1}{1+1}=\frac12.
$$

分裂增益为

$$
\begin{aligned}
\operatorname{Gain}
&=\frac12\left(\frac{2^2}{2+1}+\frac{(-1)^2}{1+1}-\frac{1^2}{3+1}\right)-0.1\\
&=\frac12\left(\frac43+\frac12-\frac14\right)-0.1
\approx0.6917.
\end{aligned}
$$

增益为正，因此在没有其他约束时该切分优于保持一个叶子。这里的 $g_i, h_i$ 取决于损失和当前预测，不能把样本标签本身直接当作梯度。

## 易错点与比较

- 随机森林的树可以并行，GBDT/XGBoost 的树按轮次依赖前一轮预测，核心训练过程不能简单并行化。
- GBDT 的“残差”是平方损失下的直观说法；一般损失应说负梯度或伪残差。
- XGBoost 的 $\lambda$ 是叶权重 L2 正则，$\gamma$ 是叶子数复杂度惩罚；二者作用不同。
- 增益公式里的 $G, H$ 是梯度/二阶导的和，不是左、右样本数。
- 二阶近似并不保证全局最优；树结构搜索本身使用候选切分和贪心近似。
- 树模型对特征缩放不敏感，但缺失值处理、类别编码、时间泄漏和标签噪声仍需认真处理。

## 闭卷题

### 题 1：Gini 增益

父节点有 6 个样本，其中正负各 3 个；一次切分后左节点有 2 正 1 负，右节点有 1 正 2 负。计算 Gini 增益。

<details>
<summary>展开解析</summary>

父节点 Gini 为 $1-(1/2)^2-(1/2)^2=0.5$。左、右节点的类别比例分别是 $2/3,1/3$ 和 $1/3,2/3$，两者 Gini 都为 $1-4/9-1/9=4/9$。加权子节点 Gini 为 $(3/6)(4/9)+(3/6)(4/9)=4/9$，增益为 $0.5-4/9=1/18\approx0.0556$。
</details>

### 题 2：随机森林与 GBDT

为什么随机森林通常可以并行训练，而 GBDT 需要按轮次训练？两者各自主要解决什么误差问题？

<details>
<summary>展开解析</summary>

随机森林的每棵树从 bootstrap 数据和随机特征子集独立生成，最后再平均/投票，所以树之间可以并行，主要利用集成降低方差。GBDT 的第 $t$ 棵树要拟合前 $t-1$ 棵树产生的负梯度/残差，存在顺序依赖；它通过逐步拟合误差来降低偏差，但树数、深度和学习率不当也会过拟合。
</details>

### 题 3：XGBoost 叶权重

某叶的 $G=3, H=5$，$\lambda=1$。在忽略 $\gamma$ 时，最优叶权重是多少？

<details>
<summary>展开解析</summary>

由 $w^*=-G/(H+\lambda)$，得到 $w^*=-3/(5+1)=-0.5$。它不是 $-G/H$，因为 L2 正则把分母增加了 $\lambda$。
</details>

### 题 4：XGBoost 分裂判断

若候选切分的 $G_L=2, H_L=2, G_R=-1, H_R=1$，父节点 $G=1, H=3$，$\lambda=1,\gamma=0.8$，是否应按增益公式切分？

<details>
<summary>展开解析</summary>

未扣 $\gamma$ 的部分为 $0.5(4/3+1/2-1/4)=0.7917$，扣除 $\gamma=0.8$ 后 Gain 约为 $-0.0083$，不为正，因此按该目标不应切分。若实现要求最小增益，还要同时满足该阈值。
</details>

## 来源

- [AI-interview-cards](https://github.com/zixian2021/AI-interview-cards)：用于决策树、随机森林、AdaBoost、GBDT 常见问法查漏。
- [Stanford CS229 main notes](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)：用于统计学习、泛化和正则化背景。
- [XGBoost 官方原理教程](https://xgboost.readthedocs.io/en/stable/tutorials/model.html)：用于二阶目标、叶权重、正则化和分裂增益公式。
