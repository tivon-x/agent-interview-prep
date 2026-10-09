---
title: 计算图与反向传播
description: 从前向传播、链式法则和向量形状出发，掌握两层网络的反向传播与手算。
---

# 计算图与反向传播

反向传播不是另一种训练算法，而是计算参数梯度的一种高效方法。前向传播先保存中间变量，反向传播从损失开始，沿着计算图的反方向复用这些变量。最后由优化器根据梯度更新参数。

## 1. 前向计算图

以一个带一个隐藏层的分类网络为例：

$$
\begin{aligned}
\mathbf{z}^{(1)} &= \mathbf{W}^{(1)}\mathbf{x}+\mathbf{b}^{(1)},\\
\mathbf{h} &= \phi(\mathbf{z}^{(1)}),\\
\mathbf{z}^{(2)} &= \mathbf{W}^{(2)}\mathbf{h}+\mathbf{b}^{(2)},\\
\mathbf{p} &= \operatorname{softmax}(\mathbf{z}^{(2)}),\\
L &= -\sum_{k=1}^{C}y_k\log p_k.
\end{aligned}
$$

其中 $\mathbf{x}\in\mathbb{R}^{d}$，隐藏层宽度为 $h$，类别数为 $C$。如果使用批量输入，常见约定是 $\mathbf{X}\in\mathbb{R}^{n\times d}$，此时 $\mathbf{H}\in\mathbb{R}^{n\times h}$。先在纸上写出每个节点的形状，可以提前发现把 $\mathbf{W}\mathbf{x}$ 写成 $\mathbf{x}\mathbf{W}$ 之类的错误。

## 2. 链式法则与局部梯度

标量链式法则是

$$
\frac{\partial L}{\partial x}=\frac{\partial L}{\partial y}\frac{\partial y}{\partial x}.
$$

张量情况下，框架通常计算向量-雅可比积，而不是显式构造巨大的雅可比矩阵。令

$$
\boldsymbol{\delta}^{(2)}=\frac{\partial L}{\partial \mathbf{z}^{(2)}},
$$

则线性层的梯度为

$$
\frac{\partial L}{\partial \mathbf{W}^{(2)}}=\boldsymbol{\delta}^{(2)}\mathbf{h}^{\top},\qquad
\frac{\partial L}{\partial \mathbf{b}^{(2)}}=\boldsymbol{\delta}^{(2)}.
$$

继续向前一层传播：

$$
\begin{aligned}
\frac{\partial L}{\partial \mathbf{h}}&=(\mathbf{W}^{(2)})^{\top}\boldsymbol{\delta}^{(2)},\\
\boldsymbol{\delta}^{(1)}&=\frac{\partial L}{\partial \mathbf{z}^{(1)}}=
\left((\mathbf{W}^{(2)})^{\top}\boldsymbol{\delta}^{(2)}\right)\odot\phi'(\mathbf{z}^{(1)}),\\
\frac{\partial L}{\partial \mathbf{W}^{(1)}}&=\boldsymbol{\delta}^{(1)}\mathbf{x}^{\top},\qquad
\frac{\partial L}{\partial \mathbf{b}^{(1)}}=\boldsymbol{\delta}^{(1)}.
\end{aligned}
$$

对于 softmax 和交叉熵的组合，若标签是 one-hot 向量 $\mathbf{y}$，有一个很重要的简化：

$$
\boldsymbol{\delta}^{(2)}=\mathbf{p}-\mathbf{y}.
$$

这就是手算题中经常直接出现 $p-y$ 的原因。若批量损失是平均值，还要把相应梯度除以 $n$。

## 3. 实算例子：ReLU 两层网络

取标量输入 $x=1$，隐藏层只有一个单元，参数为 $W^{(1)}=2$、$b^{(1)}=0$、$W^{(2)}=3$、$b^{(2)}=0$。使用 ReLU，输出采用平方损失：

$$
\hat y=W^{(2)}h+b^{(2)},\qquad L=\frac12(\hat y-y)^2,
$$

其中目标 $y=10$。前向计算得到

$$
z^{(1)}=2,\quad h=\operatorname{ReLU}(2)=2,\quad \hat y=6,\quad L=8.
$$

从损失向后走：

$$
\begin{aligned}
\frac{\partial L}{\partial \hat y}&=6-10=-4,\\
\frac{\partial L}{\partial W^{(2)}}&=-4\times2=-8,\\
\frac{\partial L}{\partial h}&=-4\times3=-12,\\
\frac{\partial L}{\partial z^{(1)}}&=-12\times1=-12,\\
\frac{\partial L}{\partial W^{(1)}}&=-12\times1=-12.
\end{aligned}
$$

若学习率为 $0.1$，梯度下降后 $W^{(2)}=3.8$、$W^{(1)}=3.2$，偏置分别更新为 $0.4$ 和 $1.2$。这里的更新方向应让预测值向目标 $10$ 靠近；如果算出权重变小，通常是把“梯度下降”误写成了加梯度。

## 4. 计算图的工程含义

- 反向传播需要前向阶段保留的激活值；训练的内存通常高于只做预测。
- 分支节点的梯度要相加。例如 $z=x+x$，则 $\partial L/\partial x$ 会收到两条路径的贡献。
- 参数在一个批次中被多条样本路径使用时，梯度会沿样本维求和或平均。
- 自动微分只负责按图求导，损失定义、数据标签、训练/评估模式仍由代码负责。

## 5. 高频比较与易错点

| 问法 | 关键回答 |
| --- | --- |
| 前向传播和反向传播谁先？ | 训练时先前向得到损失并缓存中间值，再反向求梯度；推理只需要前向。 |
| 为什么要转置？ | 若 $\mathbf{z}=\mathbf{W}\mathbf{x}$，反向的 $\partial L/\partial\mathbf{x}=\mathbf{W}^{\top}\partial L/\partial\mathbf{z}$，转置来自形状匹配。 |
| ReLU 在负区间怎样传梯度？ | 负区间导数为 $0$，对应单元可能长期不更新；零点处实现通常约定一个次梯度。 |
| `sum` 和 `mean` 有什么影响？ | `mean` 会把批量梯度除以样本数，改变梯度尺度和学习率的实际含义。 |

最常见的错法是把对 $z$ 的梯度误当成对 $W$ 的梯度，遗漏输入转置；或在激活函数之后忘了乘 $\phi'(z)$。做题时按“损失 → 输出 → 线性层 → 激活 → 上一线性层”的顺序写，不要跳步。

## 闭卷练习

### 题 1：两层标量网络

设 $x=2$，$W_1=1$，$b_1=-1$，$W_2=2$，$b_2=1$，激活为 ReLU，目标 $y=4$，损失为 $L=\frac12(\hat y-y)^2$。求前向结果，以及 $W_1, b_1, W_2, b_2$ 的梯度。

<details>
<summary>展开解析</summary>

$$z_1=1\times2-1=1,\quad h=1,\quad \hat y=2\times1+1=3.$$

所以 $L=\frac12(3-4)^2=0.5$，$\partial L/\partial\hat y=-1$。于是

$$
\frac{\partial L}{\partial W_2}=-1\times1=-1,\quad
\frac{\partial L}{\partial b_2}=-1,
$$

$$
\frac{\partial L}{\partial h}=-1\times2=-2,
\quad \frac{\partial L}{\partial z_1}=-2\times1=-2,
$$

$$
\frac{\partial L}{\partial W_1}=-2\times2=-4,\quad
\frac{\partial L}{\partial b_1}=-2.
$$
</details>

### 题 2：softmax 交叉熵的输出梯度

给定 logits $\mathbf{z}=(0,\log 2)$，标签为第二类，求 softmax 概率和 $\partial L/\partial\mathbf{z}$。

<details>
<summary>展开解析</summary>

$$e^{\mathbf z}=(1,2),\qquad \mathbf p=\left(\frac13,\frac23\right).$$

第二类 one-hot 标签为 $\mathbf y=(0,1)$，所以

$$\frac{\partial L}{\partial\mathbf z}=\mathbf p-\mathbf y=\left(\frac13,-\frac13\right).$$

梯度的分量和为零，这是 softmax 平移不变性的一个表现。
</details>

### 题 3：梯度形状

输入批量 $\mathbf X\in\mathbb R^{4\times3}$，隐藏层权重 $\mathbf W_1\in\mathbb R^{5\times3}$，输出层权重 $\mathbf W_2\in\mathbb R^{2\times5}$。写出 $\mathbf H$、$\partial L/\partial\mathbf W_2$ 和 $\partial L/\partial\mathbf W_1$ 的形状。

<details>
<summary>展开解析</summary>

按批量行向量约定，$\mathbf H=\phi(\mathbf X\mathbf W_1^\top+\mathbf b_1)$，所以 $\mathbf H\in\mathbb R^{4\times5}$。设输出误差 $\mathbf\Delta_2\in\mathbb R^{4\times2}$，则

$$
\frac{\partial L}{\partial\mathbf W_2}=\mathbf\Delta_2^\top\mathbf H\in\mathbb R^{2\times5}.
$$

隐藏层误差 $\mathbf\Delta_1\in\mathbb R^{4\times5}$，因此

$$
\frac{\partial L}{\partial\mathbf W_1}=\mathbf\Delta_1^\top\mathbf X\in\mathbb R^{5\times3}.
$$

不同教材可能用列向量约定，公式外观会变，但参数梯度的形状必须与参数本身一致。
</details>

## 延伸资料

- [CS229 Lecture Notes：Deep learning 与 backpropagation](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)（见第 7 章）。
- [D2L：前向传播、反向传播和计算图](https://zh.d2l.ai/chapter_multilayer-perceptrons/backprop.html)。
- [AI-interview-cards](https://github.com/zixian2021/AI-interview-cards)（只用于补充问法，不整篇搬运）。
