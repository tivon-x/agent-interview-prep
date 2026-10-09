---
title: 训练技巧与排障
description: 掌握 Dropout、BatchNorm、LayerNorm、梯度消失爆炸和训练排障的基本判断。
---

# 训练技巧与排障

训练问题先分成三类：模型在训练集上都学不好，通常是优化或实现问题；训练集很好、验证集差，通常是泛化问题；训练过程中出现 NaN 或梯度异常，通常是数值范围、数据或更新步长问题。Dropout、BN、LN 不是“加上就一定更准”的开关，必须结合训练/推理模式理解。

## 1. Dropout

训练时对中间激活独立采样掩码。若丢弃概率为 $p$，保留掩码 $r_i\sim\operatorname{Bernoulli}(1-p)$，倒置 Dropout 写作

$$
h_i'=\frac{r_i h_i}{1-p}.
$$

因为 $\mathbb E[r_i]=1-p$，所以 $\mathbb E[h_i']=h_i$。这样推理时可以直接使用原激活，不需要再乘一个保留率。Dropout 的直观作用是减少神经元之间的共适应，增加训练扰动，通常用于缓解过拟合。

- **train 模式**：随机丢弃并按 $1/(1-p)$ 缩放。
- **eval 模式**：不丢弃，输出为原激活。

忘记切换 `eval` 会让同一输入多次推理得到不同结果；忘记切换 `train` 则会关闭正则化，验证结果可能虚高或与训练过程不一致。

## 2. BatchNorm

对一个 batch 的某个特征（卷积中通常是每个通道）计算均值和方差：

$$
\mu_B=\frac1m\sum_{i=1}^{m}x_i,\qquad
\sigma_B^2=\frac1m\sum_{i=1}^{m}(x_i-\mu_B)^2.
$$

归一化并学习缩放、平移参数：

$$
\hat x_i=\frac{x_i-\mu_B}{\sqrt{\sigma_B^2+\epsilon}},\qquad
y_i=\gamma\hat x_i+\beta.
$$

训练时使用当前 batch 的统计量，并更新 running mean/variance；**默认推理时使用保存下来的 running statistics，不依赖当前 batch 的均值和方差**。这里假设启用了运行统计跟踪；显式关闭跟踪的实现可在推理时继续使用当前 batch 统计量。因此小 batch、数据分布变化或忘记 `eval` 都可能导致结果不稳定。

BN 会改变层间的数值尺度，也提供一定的噪声正则，但不能替代正确初始化、学习率和数据预处理。

## 3. LayerNorm

LayerNorm 对单个样本的指定特征维度计算统计量：

$$
\mu=\frac1d\sum_{j=1}^{d}x_j,\qquad
\sigma^2=\frac1d\sum_{j=1}^{d}(x_j-\mu)^2,
$$

再做同样的缩放和平移。它不依赖 batch 维，也不需要用当前 batch 更新 running statistics，适合变长序列和 batch 很小的场景。BN 和 LN 的区别不在“一个有参数、一个没参数”：二者都可以有 $\gamma,\beta$，关键是归一化统计量的维度和是否跨样本共享。

| 项目 | BatchNorm | LayerNorm |
| --- | --- | --- |
| 统计范围 | batch 维及相应特征/通道 | 单个样本的指定特征维 |
| 训练时 | 用当前 batch，并更新 running stats | 直接用当前样本统计量 |
| 推理时 | 用 running stats | 仍按样本计算 |
| 对 batch 大小敏感度 | 较高 | 较低 |

## 4. 梯度消失、爆炸与残差

时间或深度方向的梯度包含多个雅可比矩阵的乘积。若各层的有效谱范数长期小于 $1$，梯度会变小；长期大于 $1$，梯度会变大。sigmoid/tanh 饱和、权重初始化不当、序列过长和学习率过大都可能放大问题。

常见手段及适用边界：

- ReLU/Leaky ReLU 在正区间减少激活饱和，但仍可能出现死亡单元。
- Xavier/He 初始化控制前向与反向的初始方差。
- Gradient clipping 把过大的梯度限制在阈值内，能防止一步更新把参数打飞，但不能修复错误标签或错误损失。
- BN/LN 稳定中间数值，但不保证所有任务都更好。
- 残差连接让梯度有近似恒等路径：$\mathbf y=F(\mathbf x)+\mathbf x$；若形状不同，需要投影 $W_s\mathbf x$。

## 5. 排障顺序

1. 用很小的数据集做过拟合检查，确认前向、标签、损失和反向链路正确。
2. 打印输入、logits、损失、梯度范数和参数范数，检查是否出现 NaN/Inf。
3. 固定随机种子，确认训练阶段调用了 `train`、验证/推理调用了 `eval`。
4. 检查学习率、混合精度 loss scaling、梯度累积和损失的平均维度。
5. 再考虑 Dropout 比例、BN/LN、初始化和模型容量。

不要看到训练损失下降就断言模型正确；至少同时看验证损失、任务指标和小样本可复现性。

## 6. 高频比较与易错点

- Dropout 的 $p$ 是丢弃概率，不是保留概率；倒置实现的缩放因子是 $1/(1-p)$。
- BN 推理默认使用 running mean/variance，不使用当前推理 batch 的统计量。
- LN 不依赖 batch，因此改变 batch size 通常不会改变同一样本的归一化统计。
- 先裁剪梯度再更新参数；把参数裁剪当作梯度裁剪会改变另一种训练行为。
- BN 的 running statistics 不等同于可学习参数；优化器通常只更新 $\gamma,\beta$，running stats 由前向过程维护。

## 闭卷练习

### 题 1：Dropout 期望值

激活为 $h=(2,-1)$，丢弃概率 $p=0.5$。某次训练掩码为 $r=(1,0)$，求倒置 Dropout 的输出；再求每个分量的期望。

<details>
<summary>展开解析</summary>

训练输出为

$$
h'=\frac{r\odot h}{1-p}=\frac{(2,0)}{0.5}=(4,0).
$$

对每个分量，保留概率是 $0.5$，所以期望为

$$
\mathbb E[h']=(0.5\times4,\ 0.5\times(-2))=(2,-1)=h.
$$

推理时不采样，直接输出 $(2,-1)$。
</details>

### 题 2：BN 的 train/eval

某通道已经保存 running mean 为 $10$、running variance 为 $4$。推理时一个 batch 的输入均值是 $20$。默认 BN 推理应使用哪个均值？为什么不能直接用 $20$？

<details>
<summary>展开解析</summary>

使用 running mean $10$ 和 running variance $4$，而不是当前 batch 的均值 $20$。这样同一个样本的预测不依赖它恰好与哪些样本组成 batch，也与训练阶段的统计口径一致。若推理误用当前 batch 统计量，batch 很小或分布变化时输出会明显漂移。
</details>

### 题 3：训练异常定位

训练集损失从第一步开始就是 NaN，且输入中没有 NaN。列出至少三个优先检查项，并说明为什么不应先盲目增加 Dropout。

<details>
<summary>展开解析</summary>

优先检查：

1. logits、损失计算和标签范围，确认没有对概率再取非法 `log`，并使用稳定的 logits 版本损失；
2. 学习率、初始化和混合精度缩放，确认第一步更新没有溢出；
3. 梯度和参数范数，定位第一个出现 Inf/NaN 的层；
4. 数据预处理、除零和 mask 分母。

Dropout 是泛化正则化，通常不会修复从第一步就出现的数值非法；增加它可能只让问题更难复现。
</details>

## 延伸资料

- [D2L：暂退法（Dropout）](https://zh.d2l.ai/chapter_multilayer-perceptrons/dropout.html)。
- [D2L：批量规范化](https://zh.d2l.ai/chapter_convolutional-modern/batch-norm.html)。
- [D2L：数值稳定性和模型初始化](https://zh.d2l.ai/chapter_multilayer-perceptrons/numerical-stability-and-init.html)。
- [D2L：反向传播和计算图](https://zh.d2l.ai/chapter_multilayer-perceptrons/backprop.html)。
