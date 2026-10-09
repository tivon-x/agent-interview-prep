---
title: 激活函数与损失函数
description: 对比常见激活函数、回归与分类损失，掌握输出层选择和数值稳定实现。
---

# 激活函数与损失函数

激活函数决定网络如何引入非线性，损失函数定义“预测错了多少”。两者要配套：输出层的形式、标签编码和损失的输入约定必须一致。面试时不要只背“某函数优点”，要能说清它的梯度和适用边界。

## 1. 常见激活函数

### Sigmoid

$$
\sigma(x)=\frac{1}{1+e^{-x}},\qquad \sigma'(x)=\sigma(x)(1-\sigma(x)).
$$

输出范围是 $(0,1)$，适合二分类输出或门控。$|x|$ 很大时输出饱和，导数接近 $0$；隐藏层堆叠时容易产生梯度变小。二分类通常让模型输出 logit，再交给稳定的 BCE-with-logits，而不是先手动 sigmoid 再重复计算。

### Tanh

$$
\tanh(x)=\frac{e^x-e^{-x}}{e^x+e^{-x}},\qquad
\frac{d}{dx}\tanh(x)=1-\tanh^2(x).
$$

输出范围是 $(-1,1)$，以零为中心，比 sigmoid 更容易让隐藏状态在正负方向传播；但两端同样会饱和。传统 RNN 和 LSTM 的候选状态常用 tanh。

### ReLU 与 Leaky ReLU

$$
\operatorname{ReLU}(x)=\max(0, x),\qquad
\operatorname{ReLU}'(x)=
\begin{cases}1,&x>0\\0,&x<0.\end{cases}
$$

ReLU 正区间不饱和，计算简单，深层网络常用；负区间梯度为零，若某个单元长期落在负区间，就会出现“死亡 ReLU”。Leaky ReLU 用一个小斜率保留负区间梯度：

$$
\operatorname{LReLU}(x)=\max(\alpha x, x),\quad 0<\alpha\ll1.
$$

### GELU

GELU 可以理解为按输入大小平滑地保留或抑制信息，常见近似为

$$
\operatorname{GELU}(x)\approx0.5x\left(1+\tanh\left[\sqrt{\frac2\pi}\left(x+0.044715x^3\right)\right]\right).
$$

它没有 ReLU 的尖点，Transformer/MLP 中常见，但在本基础章节只需掌握“平滑、非零负区间响应”的含义，不必背近似式的每个系数。

### Softmax

对类别 logits $\mathbf z$，

$$
p_k=\frac{e^{z_k}}{\sum_{j=1}^{C}e^{z_j}}.
$$

softmax 输出为正且和为 $1$，用于多分类概率。实际实现先减去最大 logit：

$$
\operatorname{softmax}(\mathbf z)=\operatorname{softmax}(\mathbf z-\max(\mathbf z)),
$$

因为整体平移不改变结果，却能避免 $e^{z}$ 上溢。训练 API 常直接接收 logits，内部完成稳定的 log-sum-exp。

## 2. 常见损失与输入约定

### 均方误差

回归中常用

$$
L_{\mathrm{MSE}}=\frac1n\sum_{i=1}^{n}(\hat y_i-y_i)^2,
$$

或带 $1/2$ 的单样本形式。它对离群点的惩罚是平方级，目标值和预测值的尺度会影响梯度。

### 二分类交叉熵

设标签 $y\in\{0,1\}$，logit 为 $z$，概率 $p=\sigma(z)$，则

$$
L_{\mathrm{BCE}}=-y\log p-(1-y)\log(1-p).
$$

对 logit 求导后有

$$
\frac{\partial L_{\mathrm{BCE}}}{\partial z}=p-y.
$$

工程上优先使用“BCE with logits”版本，它以 $z$ 为输入并内部稳定计算；如果输入已经是概率，再使用普通 BCE，不能把同一个 sigmoid 作用两次。

### 多分类交叉熵

标签为 one-hot 向量 $\mathbf y$ 时，

$$
L_{\mathrm{CE}}=-\sum_{k=1}^{C}y_k\log p_k.
$$

若真实类别是 $t$，就等于 $-\log p_t$。softmax 与交叉熵组合的梯度是

$$
\frac{\partial L_{\mathrm{CE}}}{\partial z_k}=p_k-y_k.
$$

这也是分类网络常直接把 logits 送进交叉熵损失的原因：少存一个中间概率，且数值更稳定。

### 多标签任务不要混淆

多分类要求一个样本只能选一个类别，通常使用 softmax + CE；多标签任务中每个标签独立为真或假，使用逐类别 sigmoid + BCE。把多标签数据误用 softmax 会强迫所有类别概率相加为一，丢失“多个类别同时成立”的表达能力。

## 3. 如何做选择

| 场景 | 输出 | 常用损失 | 关键边界 |
| --- | --- | --- | --- |
| 连续值回归 | 线性输出 | MSE 或 MAE | 对离群点的敏感程度不同 |
| 二分类 | 一个 logit | BCE with logits | 标签通常为 0/1 |
| 单标签多分类 | $C$ 个 logits | softmax CE | 每个样本只有一个目标类 |
| 多标签分类 | $C$ 个独立 logits | sigmoid BCE | 类别之间不要求互斥 |

损失不只用于“打分”，还决定梯度形状。例如 sigmoid 输出接 BCE 的 logit 梯度是 $p-y$，若在 sigmoid 饱和处手工拆开计算，可能出现数值下溢；稳定组合既简化公式，也改善实现。

## 4. 小例子：softmax 和交叉熵

令 logits 为 $\mathbf z=(2,1,0)$，真实类为第 1 类（从 0 开始）。减去最大值后指数为 $(1, e^{-1},e^{-2})$，因此

$$
p_0=\frac1{1+e^{-1}+e^{-2}}\approx0.665,
\qquad L=-\log p_0\approx0.408.
$$

如果把真实类换成第 3 类，损失变为 $-\log p_2\approx2.408$，因为模型对该类的概率很低。梯度分别为

$$
\mathbf p-\mathbf y\approx(-0.335,0.245,0.090)
$$

和

$$
\mathbf p-(0,0,1)\approx(0.665,0.245,-0.910).
$$

真实类对应的梯度为负，会推动它的 logit 增大；其他类梯度为正，会推动其 logit 相对降低。

## 5. 高频比较与易错点

- **Sigmoid vs softmax**：前者可对每个标签独立产生概率，后者强制类别互斥且总和为一。
- **ReLU vs sigmoid/tanh**：ReLU 正区间梯度不衰减，但负区间可能“死亡”；sigmoid/tanh 两端饱和。
- **logits 与概率**：损失函数若要求 logits，就不要提前做 sigmoid/softmax；若 API 要概率，才显式转换。
- **标签编码**：CE 的类别索引、one-hot 和 label smoothing 是不同接口，不能把 one-hot 当作一个类别编号。
- **损失平均方式**：样本平均、按 token 平均和按所有元素平均会产生不同梯度尺度，比较实验时要固定约定。

## 闭卷练习

### 题 1：激活函数梯度

分别求 $x=0$ 时 sigmoid、tanh 和 ReLU 的输出及导数，并说明哪个函数的导数在输入为 0 时有实现约定。

<details>
<summary>展开解析</summary>

$$
\sigma(0)=0.5,\quad \sigma'(0)=0.25;
$$

$$
\tanh(0)=0,\quad \tanh'(0)=1;
$$

$$
\operatorname{ReLU}(0)=0.
$$

ReLU 在 0 点不可导，自动微分库会选定一个次梯度或固定约定；常见实现把它当作 0。sigmoid 和 tanh 在 0 点正常可导。
</details>

### 题 2：二分类 BCE

一个样本的 logit 为 $z=0$，标签 $y=1$。求概率、BCE 损失和对 logit 的梯度。

<details>
<summary>展开解析</summary>

因为 $p=\sigma(0)=0.5$，所以

$$
L=-\log0.5=\log2\approx0.693,
\qquad \frac{\partial L}{\partial z}=p-y=0.5-1=-0.5.
$$

负梯度表示梯度下降会增大 $z$，让正类概率升高。
</details>

### 题 3：多分类与多标签

一个样本同时属于“猫”和“室内”两个标签。应该用 softmax 还是独立 sigmoid？若 logits 为 $(0,\log3)$，标签是第二类，求第二类概率（忽略其他类）。

<details>
<summary>展开解析</summary>

这是多标签场景，标签之间不互斥，应使用独立 sigmoid + BCE，而不是 softmax。第二类的概率是

$$
\sigma(\log3)=\frac{3}{1+3}=0.75.
$$

这里的 0.75 与其他标签的概率互不约束，不需要和为一。
</details>

## 延伸资料

- [D2L：softmax 回归从零开始实现](https://zh.d2l.ai/chapter_linear-networks/softmax-regression-scratch.html)。
- [D2L：数值稳定性和模型初始化](https://zh.d2l.ai/chapter_multilayer-perceptrons/numerical-stability-and-init.html)。
- [CS229 Lecture Notes](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)（第 2、3、7 章）。
