---
title: RNN、LSTM 与 GRU
description: 从循环状态更新到门控结构，掌握 RNN、LSTM、GRU 的核心公式、比较和梯度边界。
---

# RNN、LSTM 与 GRU

循环网络把序列按时间步处理，并把上一时刻的隐状态带到下一时刻。它们的核心难点是：同一组参数会在多个时间步重复使用，反向传播要沿时间展开，因此长序列容易出现梯度消失或爆炸。LSTM 和 GRU 都通过门控保留或覆盖状态，减轻这一问题。

## 1. Vanilla RNN

给定输入 $\mathbf x_t$、上一隐状态 $\mathbf h_{t-1}$，最常见的 tanh RNN 为

$$
\mathbf h_t=\tanh(\mathbf W_{xh}\mathbf x_t+\mathbf W_{hh}\mathbf h_{t-1}+\mathbf b_h),
$$

输出可以是

$$
\mathbf o_t=\mathbf W_{hy}\mathbf h_t+\mathbf b_y.
$$

参数 $W_{xh},W_{hh},b_h$ 在所有时间步共享；这让模型的参数量不随序列长度线性增长。批量输入时，若 $X_t\in\mathbb R^{n\times d}$、$H_t\in\mathbb R^{n\times h}$，可以按批量矩阵乘法并行计算同一时间步，但时间步之间仍有依赖。

## 2. 通过时间反向传播

展开 $T$ 个时间步后，损失对早期状态的梯度包含一串雅可比乘积。抽象写作

$$
\frac{\partial L}{\partial\mathbf h_t}
=\frac{\partial L}{\partial\mathbf h_T}
\prod_{k=t+1}^{T}\frac{\partial\mathbf h_k}{\partial\mathbf h_{k-1}}.
$$

如果乘积的有效范数持续小于 $1$，梯度会消失；持续大于 $1$，会爆炸。梯度裁剪可以限制爆炸的单步影响，但不能让消失梯度凭空恢复。截断 BPTT 通过只在固定长度窗口内反传，降低内存和计算成本，同时牺牲一部分长期依赖。

上面的乘积按从最终时间步向较早时间步的顺序相乘，只表示损失经最终状态传回的路径。若多个时间步都有损失，还需要累加各时间步的直接损失及其向前传播的梯度。

## 3. LSTM

LSTM 维护细胞状态 $\mathbf c_t$ 和隐状态 $\mathbf h_t$。一种常见写法为

$$
\begin{aligned}
\mathbf i_t&=\sigma(\mathbf W_{xi}\mathbf x_t+\mathbf W_{hi}\mathbf h_{t-1}+\mathbf b_i),\\
\mathbf f_t&=\sigma(\mathbf W_{xf}\mathbf x_t+\mathbf W_{hf}\mathbf h_{t-1}+\mathbf b_f),\\
\mathbf o_t&=\sigma(\mathbf W_{xo}\mathbf x_t+\mathbf W_{ho}\mathbf h_{t-1}+\mathbf b_o),\\
\tilde{\mathbf c}_t&=\tanh(\mathbf W_{xc}\mathbf x_t+\mathbf W_{hc}\mathbf h_{t-1}+\mathbf b_c),\\
\mathbf c_t&=\mathbf f_t\odot\mathbf c_{t-1}+\mathbf i_t\odot\tilde{\mathbf c}_t,\\
\mathbf h_t&=\mathbf o_t\odot\tanh(\mathbf c_t).
\end{aligned}
$$

含义可以这样记：输入门决定写入多少候选信息，遗忘门决定保留多少旧细胞状态，输出门决定暴露多少细胞状态。细胞状态中的加法路径比连续的矩阵乘法更容易传递长期信息。不同资料可能调整门的拼接顺序或加入 peephole 连接，但“遗忘、输入、输出和候选状态”四个角色不变。

## 4. GRU

GRU 只维护一个隐状态，通过重置门和更新门控制过去信息：

$$
\begin{aligned}
\mathbf r_t&=\sigma(\mathbf X_t\mathbf W_{xr}+\mathbf H_{t-1}\mathbf W_{hr}+\mathbf b_r),\\
\mathbf z_t&=\sigma(\mathbf X_t\mathbf W_{xz}+\mathbf H_{t-1}\mathbf W_{hz}+\mathbf b_z),\\
\tilde{\mathbf H}_t&=\tanh\left(\mathbf X_t\mathbf W_{xh}+(\mathbf r_t\odot\mathbf H_{t-1})\mathbf W_{hh}+\mathbf b_h\right),\\
\mathbf H_t&=\mathbf z_t\odot\mathbf H_{t-1}+(1-\mathbf z_t)\odot\tilde{\mathbf H}_t.
\end{aligned}
$$

重置门接近 $0$ 时减少旧状态对候选状态的影响；更新门接近 $1$ 时保留旧状态，接近 $0$ 时更多采用候选状态。某些框架把更新门符号定义成“写入比例”，于是最后一行的两个系数会互换；回答时应先给出自己的约定。

## 5. 三者比较

| 模型 | 状态 | 记忆机制 | 特点 |
| --- | --- | --- | --- |
| RNN | $h_t$ | 直接 tanh 更新 | 参数少，但长序列梯度问题明显 |
| LSTM | $h_t, c_t$ | 输入/遗忘/输出门 | 表达和控制更细，参数较多 |
| GRU | $h_t$ | 重置/更新门 | 结构较简洁，通常计算更快 |

三者都按时间顺序处理状态，无法像纯前馈层那样完全并行化时间维。双向 RNN 可以同时使用过去和未来上下文，但在线生成场景通常不能看到未来输入。

## 6. 训练时的状态管理

- 不同独立序列之间通常要重置隐状态，避免把上一条样本的信息泄露到下一条。
- 在截断 BPTT 中，窗口之间常对隐状态 `detach`，只传数值不传旧计算图，避免反向图无限增长。
- teacher forcing 在训练时把真实前一 token 喂给解码器，推理时却常使用模型上一步输出，二者分布有差异。
- 变长序列需要 padding mask 或 packed sequence，不能让 padding 参与损失和状态更新。

## 7. 高频比较与易错点

- “LSTM 完全解决梯度消失”说得过强：门控提供更好的路径，但参数、序列长度和激活仍会影响梯度。
- RNN 的 $W_{hh}$ 在时间步之间共享，不能为每个时间步重新学习一组矩阵。
- GRU 更新门的公式存在符号约定差异，先说明 $z$ 表示保留旧状态还是写入新状态。
- 隐状态形状通常是 $[\text{层数}\times\text{方向数},\text{batch},\text{hidden}]$；不要把 batch 维和时间维混在一起。
- 训练时保存整个时间展开图，内存约随序列长度增加；推理只需保留当前状态。

## 闭卷练习

### 题 1：RNN 单步计算

标量 RNN 为 $h_t=\tanh(W_xx_t+W_hh_{t-1}+b)$。给定 $x_t=1$、$h_{t-1}=0.5$、$W_x=1$、$W_h=2$、$b=0$，求 $h_t$ 的近似值。

<details>
<summary>展开解析</summary>

先求线性部分：

$$z_t=1\times1+2\times0.5=2.$$

所以

$$h_t=\tanh(2)\approx0.964.$$

如果接一个 $W_y=1, b_y=0$ 的线性输出，$o_t$ 也是约 $0.964$。下一时间步会把这个 $h_t$ 作为新的旧状态。
</details>

### 题 2：LSTM 状态更新

假设某一维上 $c_{t-1}=3$、遗忘门 $f_t=0.8$、输入门 $i_t=0.25$、候选状态 $\tilde c_t=-0.5$。求 $c_t$，并说明如果 $f_t$ 接近 1 有什么含义。

<details>
<summary>展开解析</summary>

$$
c_t=f_tc_{t-1}+i_t\tilde c_t
=0.8\times3+0.25\times(-0.5)=2.4-0.125=2.275.
$$

若 $f_t$ 接近 1，旧细胞状态大部分被保留；若同时输入门很小，新候选信息对状态的覆盖较少。
</details>

### 题 3：GRU 更新门

按本章约定，某一维上 $z_t=0.9$、$h_{t-1}=0.8$、$\tilde h_t=-0.5$。求 $h_t$，并解释更新门接近 1 的作用。

<details>
<summary>展开解析</summary>

$$
h_t=z_th_{t-1}+(1-z_t)\tilde h_t
=0.9\times0.8+0.1\times(-0.5)=0.72-0.05=0.67.
$$

更新门接近 1 时主要保留旧状态，当前输入对隐状态的改动较小；这提供了一条更容易跨时间传递信息的路径。
</details>

## 延伸资料

- [D2L：循环神经网络](https://zh.d2l.ai/chapter_recurrent-neural-networks/rnn.html)与[通过时间反向传播](https://zh.d2l.ai/chapter_recurrent-neural-networks/bptt.html)。
- [D2L：门控循环单元（GRU）](https://zh.d2l.ai/chapter_recurrent-modern/gru.html)。
- [D2L：长短期记忆网络（LSTM）](https://zh.d2l.ai/chapter_recurrent-modern/lstm.html)。
- [CS229 Lecture Notes](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)（第 7 章深度学习）。
