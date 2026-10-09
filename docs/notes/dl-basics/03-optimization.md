---
title: 优化器、学习率与初始化
description: 对比 SGD、Momentum、Adam 和 AdamW，理解学习率、权重衰减与初始化对训练的影响。
---

# 优化器、学习率与初始化

优化器根据梯度走下一步，学习率决定步长，初始化决定训练开始时信号和梯度能否稳定传播。它们解决的是不同问题：优化器改变更新规则，学习率调节尺度，初始化控制初始分布。

## 1. 梯度下降家族

设目标函数为 $J(\theta)$，当前梯度为 $g_t=\nabla_\theta J(\theta_t)$。

- **Batch GD** 用全量训练集计算 $g_t$，方向稳定但每一步成本高。
- **SGD** 用一个样本估计梯度，更新快但噪声大。
- **Mini-batch SGD** 在两者之间折中，是深度学习的常见默认方式。

基本更新为

$$
\theta_{t+1}=\theta_t-\eta_t g_t.
$$

其中 $\eta_t$ 是学习率。学习率太大可能振荡或发散，太小则收敛慢；损失下降不代表验证集一定变好。

## 2. Momentum

Momentum 让梯度累积成带方向的速度：

$$
\mathbf v_t=\beta\mathbf v_{t-1}+g_t,\qquad
\theta_{t+1}=\theta_t-\eta\mathbf v_t.
$$

沿同一方向的梯度会积累，来回摆动的方向会被平滑。$\beta$ 越大，历史方向占比越高，也越需要小心初始阶段的惯性。教材也常用等价的“速度先乘 $\beta$、再减梯度”的符号约定，关键是明确 $v$ 的含义和更新顺序。

## 3. Adam

Adam 同时维护梯度的一阶矩和二阶矩：

$$
\begin{aligned}
\mathbf m_t&=\beta_1\mathbf m_{t-1}+(1-\beta_1)\mathbf g_t,\\
\mathbf v_t&=\beta_2\mathbf v_{t-1}+(1-\beta_2)\mathbf g_t^2,\\
\hat{\mathbf m}_t&=\frac{\mathbf m_t}{1-\beta_1^t},\qquad
\hat{\mathbf v}_t=\frac{\mathbf v_t}{1-\beta_2^t},\\
\theta_{t+1}&=\theta_t-\eta\frac{\hat{\mathbf m}_t}{\sqrt{\hat{\mathbf v}_t}+\epsilon}.
\end{aligned}
$$

平方是逐元素平方。偏置修正很重要，因为 $m_0=v_0=0$ 会让最初的矩估计偏小。Adam 对不同参数使用不同的有效步长，常见默认值是 $\beta_1=0.9$、$\beta_2=0.999$，但它们不是必须固定的常数。

## 4. AdamW 与权重衰减

把 $L_2$ 惩罚加进损失，梯度会变成 $g_t+\lambda\theta_t$，再被 Adam 的一阶、二阶矩自适应缩放；这不是简单的参数衰减。AdamW 把衰减从梯度路径中解耦：

$$
\theta_{t+1}=(1-\eta\lambda)\theta_t-\eta
\frac{\hat{\mathbf m}_t}{\sqrt{\hat{\mathbf v}_t}+\epsilon}.
$$

因此“Adam 加 L2 正则”和“AdamW”在自适应优化器下不等价。回答面试题时应补充：权重衰减通常作用于权重，不作用于 bias 和归一化层的缩放/偏置参数，具体范围由实现配置决定。

## 5. 学习率策略

- **Warmup**：训练初期从较小学习率逐步升高，降低随机初始化和大批量带来的冲击。
- **Step decay**：到指定轮次后乘一个衰减因子，简单但不连续。
- **Cosine decay**：在给定周期内平滑下降，常与 warmup 组合。
- **Reduce on plateau**：验证指标长期不改善时降低学习率，适合不知道总步数的场景。

无论哪种调度，都要记录“当前步数对应的学习率”。只看最终学习率无法解释训练中途的震荡。

## 6. 初始化与数值范围

若每层权重方差过大，前向激活和反向梯度可能爆炸；过小则可能逐层衰减。常用初始化思路是让输入输出方差大致保持：

- **Xavier/Glorot**：对称考虑输入维度 $n_{\mathrm{in}}$ 和输出维度 $n_{\mathrm{out}}$，典型均匀分布边界为 $\sqrt{6/(n_{\mathrm{in}}+n_{\mathrm{out}})}$。
- **He/Kaiming**：配合 ReLU，典型正态分布标准差为 $\sqrt{2/n_{\mathrm{in}}}$。

这些是近似的方差控制，不是保证所有网络都稳定的定理。归一化、残差结构、数据尺度和混合精度也会影响最终范围。

## 7. 实算例子：第一步 Adam 与 AdamW

单个参数 $\theta_0=1$，梯度 $g_1=0.5$，$m_0=v_0=0$，$\beta_1=0.9$，$\beta_2=0.999$，$\epsilon$ 很小，学习率 $\eta=0.1$。

Adam 的第一步：

$$
m_1=0.9\times0+0.1\times0.5=0.05,
\quad v_1=0.999\times0+0.001\times0.25=0.00025.
$$

偏置修正后 $\hat m_1=0.5$、$\hat v_1=0.25$，所以梯度项的更新约为 $0.1\times0.5/0.5=0.1$，得到 $\theta_1=0.9$。

若使用 AdamW 且 $\lambda=0.1$，同一时刻先写出解耦公式：

$$
\theta_1=(1-0.1\times0.1)\times1-0.1=0.89.
$$

这里的 $0.99$ 是衰减后的参数系数，$0.1$ 是 Adam 梯度项；若把 $\lambda\theta$ 混进梯度再套 Adam，结果不会相同。

## 8. 高频比较与易错点

| 对象 | 解决的问题 | 常见误区 |
| --- | --- | --- |
| SGD | 用梯度直接走一步 | 把 batch、mini-batch 和优化器名称混为一谈 |
| Momentum | 平滑方向、减少狭长谷底的摆动 | 忽略速度初值和符号约定 |
| Adam | 对一阶、二阶矩做自适应缩放 | 忘记偏置修正，或把它当作没有超参数的万能优化器 |
| AdamW | 将权重衰减从 Adam 梯度路径中解耦 | 说成“Adam + L2 完全等价” |
| 初始化 | 控制信号和梯度的起始方差 | 把初始化问题只归因于学习率 |

训练异常的排查顺序应先确认数据和损失，再看梯度范围、学习率、初始化与归一化，而不是一上来换优化器。

## 闭卷练习

### 题 1：Momentum 手算

设 $\theta_0=2$、$v_0=0$，连续两步梯度分别为 $g_1=1$、$g_2=2$，$\beta=0.9$，$\eta=0.1$。按本章定义计算 $\theta_1, v_1,\theta_2, v_2$。

<details>
<summary>展开解析</summary>

第一步：

$$v_1=0.9\times0+1=1,\qquad \theta_1=2-0.1\times1=1.9.$$

第二步：

$$v_2=0.9\times1+2=2.9,\qquad \theta_2=1.9-0.1\times2.9=1.61.$$

速度包含历史梯度，所以第二步不是只减去 $0.2$。
</details>

### 题 2：Adam 第一阶矩和偏置修正

设 $g_1=2$、$m_0=0$、$\beta_1=0.9$。求 $m_1$ 和 $\hat m_1$。

<details>
<summary>展开解析</summary>

$$m_1=0.9\times0+0.1\times2=0.2.$$

因为 $t=1$，偏置修正分母是 $1-0.9=0.1$，所以

$$\hat m_1=\frac{0.2}{0.1}=2.$$

如果忘记偏置修正，会把第一步的梯度估计误认为 $0.2$，导致更新过小。
</details>

### 题 3：AdamW 与 Adam 加 L2

当前参数 $\theta=2$，学习率 $\eta=0.1$，权重衰减系数 $\lambda=0.2$，Adam 梯度项（已完成矩估计）为 $0.5$。只计算 AdamW 的下一步参数。

<details>
<summary>展开解析</summary>

$$
\theta'=(1-0.1\times0.2)\times2-0.1\times0.5
=1.96-0.05=1.91.
$$

AdamW 的衰减先作用于参数，梯度项再单独更新；不能把 $\lambda\theta=0.4$ 直接和原梯度相加后声称结果相同。
</details>

## 延伸资料

- [D2L：优化算法总览](https://zh.d2l.ai/chapter_optimization/index.html)及其中的 SGD、动量法、Adam 章节。
- [D2L：数值稳定性和模型初始化](https://zh.d2l.ai/chapter_multilayer-perceptrons/numerical-stability-and-init.html)。
- [CS229 Lecture Notes](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)（梯度下降、深度学习和正则化章节）。
- [AI-interview-cards](https://github.com/zixian2021/AI-interview-cards)（用于整理常见优化器问法）。
