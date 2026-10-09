---
title: ML/DL 笔试计算与编程专项
description: 从逻辑回归 Batch GD 和 GMM M-step 开始，练习 Softmax、反向传播与 CNN 计算。
---

# ML/DL 笔试计算与编程专项

先做 **P0：逻辑回归和 GMM M-step**，再做 Softmax、反向传播和 CNN。每题先手算，再用 NumPy 实现，最后展开解析核对。这里是原创练习，不标记为已经核实的公司真题。

前置阅读：[ML 基础](../ml-basics/index.md)、[DL 基础](../dl-basics/index.md)。原有 [360 题练习](../../byte-agent/practice.md)仍用于 Agent 与数据平台岗位复习。

## 1. P0：逻辑回归梯度与 Batch GD

### 题目与输入输出

输入 $X\in\mathbb R^{n\times d}$、标签 $y\in\{0,1\}^n$、学习率和训练步数。输出权重 $w\in\mathbb R^d$、偏置 $b$ 和损失轨迹。实现二分类逻辑回归，使用全量批次，每步同时更新 $w, b$，不调用现成分类器。

本题损失是样本平均值，不含正则项，初始权重与偏置均为零。固定步数结束，不以训练集准确率提前退出。

$$
z_i=x_i^Tw+b,\qquad p_i=\sigma(z_i),\qquad
L=-\frac1n\sum_i[y_i\log p_i+(1-y_i)\log(1-p_i)].
$$

**手算题：** $X=[-2,-1,1,2]^T$，$y=[0,0,1,1]^T$，学习率 $0.1$。求初始损失、梯度和一次更新后的参数。

<details>
<summary>展开推导与答案</summary>

由 sigmoid 导数 $p(1-p)$ 和交叉熵对 $p$ 的导数，相乘后得到 $\partial\ell_i/\partial z_i=p_i-y_i$。

$$
\nabla_wL=\frac1nX^T(p-y),\qquad
\frac{\partial L}{\partial b}=\frac1n\sum_i(p_i-y_i).
$$

初始 $p_i=0.5$，$L=\log2\approx0.693147$。误差为 $[0.5,0.5,-0.5,-0.5]$，因此 $\nabla_wL=-0.75$，$\partial L/\partial b=0$。更新后 $w=0.075, b=0$。

核心实现如下，完整输入检查见页面末尾的可下载参考文件。

```python
z = X @ w + b
p = np.exp(-np.logaddexp(0.0, -z))
loss = np.mean(np.logaddexp(0.0, z) - y * z)
error = p - y
dw = X.T @ error / len(X)
db = error.mean()
w -= learning_rate * dw
b -= learning_rate * db
```

`logaddexp(0, z) - y*z` 直接从 logits 算交叉熵，避免先求概率再 `log(0)`。这里的平均损失决定梯度也要除以 $n$。

</details>

### 自测与常见失败

- 为什么不能用每个样本更新一次来代替本题？那是 SGD，更新轨迹不同。
- 加 $\lambda\|w\|^2/2$ 后，权重梯度增加 $\lambda w$；本题约定不正则化偏置。
- 学习率过大或特征尺度相差很大时，损失可能上升。降低学习率、检查数据和缩放，不要默认每一步都会下降。
- 机考若要求 stdin/stdout，按题目格式包装读写；这里提供的是函数接口，不假设隐藏题目的输入协议。

## 2. P0：GMM 的 M-step

### 题目与输入输出

输入样本 $X\in\mathbb R^{n\times d}$ 和已经算好的责任度 $R\in\mathbb R^{n\times K}$。每行非负且和为 1。输出混合权重 $(K,)$、均值 $(K, d)$、完整协方差 $(K, d, d)$。

本题只实现 M-step，不重新计算责任度，协方差采用极大似然分母 $N_k$，不使用无偏估计分母 $N_k-1$。

$$
N_k=\sum_i r_{ik},\qquad \pi_k=\frac{N_k}{n},\qquad
\mu_k=\frac{\sum_i r_{ik}x_i}{N_k},
$$

$$
\Sigma_k=\frac1{N_k}\sum_i r_{ik}(x_i-\mu_k)(x_i-\mu_k)^T.
$$

**手算题：** $x_1=0, x_2=2$，责任度两行为 $(0.75,0.25)$、$(0.25,0.75)$。求两个分量的全部参数。

<details>
<summary>展开答案与参考实现</summary>

$N_1=N_2=1$，$\pi=(0.5,0.5)$。均值为 $\mu_1=0.5,\mu_2=1.5$。第一分量方差是 $0.75(0-0.5)^2+0.25(2-0.5)^2=0.75$；第二分量也为 $0.75$。

```python
counts = R.sum(axis=0)
weights = counts / len(X)
means = R.T @ X / counts[:, None]
covariances = []
for k, mean in enumerate(means):
    centered = X - mean
    covariances.append((centered.T * R[:, k]) @ centered / counts[k])
```

空分量 $N_k=0$ 无法更新，参考函数明确报错。完整 EM 训练一般需要重初始化或淘汰空分量，并处理奇异协方差。是否加 $\epsilon I$ 取决于题目要求；本题不悄悄改动精确更新公式。

</details>

**选做：** 在[ML ⑥](../ml-basics/06-clustering-features.md)的 E-step 公式上实现完整 EM。高维概率计算应采用对数密度和 log-sum-exp，记录对数似然并设停止条件。EM 通常收敛到局部解，不能保证全局最优。

## 3. P1：稳定 Softmax 与交叉熵

### 题目与输入输出

输入 logits $Z\in\mathbb R^{n\times C}$ 和整数类别索引 $y\in\{0,\ldots, C-1\}^n$。输出平均交叉熵、概率矩阵和损失对 logits 的梯度。

**手算题：** 一条样本 logits 为 $(0,\log2,\log3)$，标签为 1，求概率、损失与梯度。再说明如何处理 $(1000,1000,1000)$。

<details>
<summary>展开答案与实现</summary>

第一题概率为 $(1/6,1/3,1/2)$，损失 $\log3$，梯度 $(1/6,-2/3,1/2)$。标签 1 指第二类，不能按人类从 1 开始的编号取第三类。

$$
p_{ic}=\frac{e^{z_{ic}-m_i}}{\sum_j e^{z_{ij}-m_i}},\quad m_i=\max_jz_{ij},\qquad
\frac{\partial L}{\partial z_{ic}}=\frac{p_{ic}-\mathbf1[c=y_i]}n.
$$

相同 logits 都减去 1000 后变成 0，概率都是 $1/3$，损失仍为 $\log3$。

```python
shifted = Z - Z.max(axis=1, keepdims=True)
log_probs = shifted - np.log(np.exp(shifted).sum(axis=1, keepdims=True))
probs = np.exp(log_probs)
loss = -log_probs[np.arange(len(y)), y].mean()
grad = probs.copy()
grad[np.arange(len(y)), y] -= 1
grad /= len(y)
```

先做 softmax 再直接对概率取 log，可能发生下溢。减去最大值避免指数上溢，从 log-probabilities 取交叉熵避免对已经下溢到零的概率取对数。

</details>

## 4. P1：计算图与两层网络反向传播

### 手算题

设 $x=2, w=3, b=-1$，$z=wx+b$，预测值 $\hat y=z$，目标 $y=1$，损失 $L=(\hat y-y)^2/2$。计算 $L$ 和对 $w, b, x$ 的梯度。

<details>
<summary>展开答案</summary>

$z=5, L=8$，$\partial L/\partial z=4$。因此 $\partial L/\partial w=4x=8$，$\partial L/\partial b=4$，$\partial L/\partial x=4w=12$。多个路径使用同一个变量时，各路径梯度相加。

</details>

### 编程题

给定 $X:(n, d)$、$W_1:(d, h)$、$b_1:(h,)$、$W_2:(h, C)$、$b_2:(C,)$ 和整数标签，实现 tanh 隐藏层加 Softmax 分类器，返回平均交叉熵和四个参数梯度。

<details>
<summary>展开矩阵推导</summary>

$$
H=\tanh(XW_1+b_1),\quad Z=HW_2+b_2,\quad D=(P-Y)/n.
$$

$$
\nabla W_2=H^TD,\quad \nabla b_2=\sum_iD_i,\qquad
E=(DW_2^T)\odot(1-H^2),
$$

$$
\nabla W_1=X^TE,\quad \nabla b_1=\sum_iE_i.
$$

$Y$ 是 one-hot 矩阵；程序中无需实际构造它，可在类别位置减 1。$D$ 已经除以 $n$，后续不应再重复除。参考文件用中心差分 $(L(\theta+\epsilon)-L(\theta-\epsilon))/(2\epsilon)$ 核对每个参数，使用 float64 和固定随机种子。

选 tanh 是为了避开 ReLU 在零点不可导的问题；若改用 ReLU，数值检查应避开零点。

</details>

## 5. P1：CNN 输出尺寸与参数量

标准二维卷积，不分组，两方向参数相同。输入不含 batch 的形状为 $(H, W, C_{in})$，卷积核 $k$，步幅 $s$，填充 $p$，膨胀率 $d$，输出通道 $C_{out}$。

$$
H_{out}=\left\lfloor\frac{H+2p-d(k-1)-1}{s}\right\rfloor+1,
\qquad W_{out}=\left\lfloor\frac{W+2p-d(k-1)-1}{s}\right\rfloor+1.
$$

$$
\text{参数量}=C_{out}(C_{in}k^2+\mathbf1[\text{有偏置}])
$$

**题 A：** 输入 $32\times32\times3$，16 个 $3\times3$ 卷积核，stride 2、padding 1、dilation 1，含偏置。

**题 B：** 输入 $7\times7\times2$，4 个 $3\times3$ 卷积核，stride 1、padding 0、dilation 2，含偏置。

<details>
<summary>展开答案</summary>

A 输出 $16\times16\times16$，参数量 $16(3\times3\times3+1)=448$。

B 有效核尺寸为 $2(3-1)+1=5$，输出 $3\times3\times4$，参数量 $4(2\times3\times3+1)=76$。膨胀扩大感受野，不增加核内可学习参数。输出空间尺寸与 batch 大小不影响参数量。

若考分组卷积，参数量改成 $C_{out}(C_{in}k^2/groups+\mathbf1[\text{有偏置}])$，并检查通道可整除。本页参考函数只处理标准卷积。

</details>

## 6. 下载实现与复核

[下载完整 NumPy 参考实现](/ml-dl/reference.py)。保存为 `reference.py`，在已安装 NumPy 的 Python 环境执行：

```powershell
python reference.py
```

程序会检查 LR 一步梯度与训练结果、极端 logits、GMM M-step 已知答案、两层网络数值梯度、CNN 尺寸参数量及非法输入，并输出 JSON。可把输出重定向到文件保留复核结果。它验证这些练习样例，不代表所有数据上的训练都能收敛。

## 参考资料

- [AI-interview-cards](https://github.com/zixian2021/AI-interview-cards)：常见问题查漏，本站答案为重新整理。
- [CS229 课程笔记](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)：Logistic Regression、Backpropagation、EM Algorithms。
- [D2L 3.6：Softmax 从零实现](https://zh.d2l.ai/chapter_linear-networks/softmax-regression-scratch.html)。
- [D2L 4.7：前向传播、反向传播和计算图](https://zh.d2l.ai/chapter_multilayer-perceptrons/backprop.html)。
- [D2L：填充与步幅](https://zh.d2l.ai/chapter_convolutional-neural-networks/padding-and-strides.html)、[优化算法](https://zh.d2l.ai/chapter_optimization/index.html)。
