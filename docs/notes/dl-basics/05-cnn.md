---
title: CNN、尺寸与残差连接
description: 掌握卷积输出尺寸、参数量、通道变化和残差连接的笔试计算方法。
---

# CNN、尺寸与残差连接

卷积神经网络的核心不是“有一个卷积层”这么简单，而是局部连接、权重共享和逐层扩大感受野。笔试通常考三个量：输出空间尺寸、参数量、通道数；面试还会追问为什么卷积比全连接更适合图像，以及残差连接怎样改善深层训练。

## 1. 卷积层做了什么

深度学习框架中的二维“卷积”通常实现的是互相关：卷积核不翻转，沿高度和宽度滑动。单通道形式可写为

$$
Y_{i, j}=\sum_{u=0}^{K_h-1}\sum_{v=0}^{K_w-1}W_{u, v}X_{i+u, j+v}+b.
$$

多通道输入和多个输出通道时，每个输出通道有一组覆盖所有输入通道的核。输入像素只与局部邻域连接，同一组权重在空间位置复用，因此参数量与图像大小无关。

## 2. 输出尺寸公式

对输入高度 $H$、宽度 $W$，卷积核 $K_h\times K_w$，padding $P_h, P_w$，stride $S_h, S_w$，dilation $D_h, D_w$，有效核尺寸为

$$
K_{\mathrm{eff},h}=D_h(K_h-1)+1,\qquad
K_{\mathrm{eff},w}=D_w(K_w-1)+1.
$$

输出空间尺寸是

$$
H_{\mathrm{out}}=\left\lfloor\frac{H+2P_h-K_{\mathrm{eff},h}}{S_h}\right\rfloor+1,
$$

$$
W_{\mathrm{out}}=\left\lfloor\frac{W+2P_w-K_{\mathrm{eff},w}}{S_w}\right\rfloor+1.
$$

若使用非对称 padding，应将上下、左右的 padding 总和分别代入，而不是默认写成 $2P$。若分数不是整数，常见实现会按公式向下取整；池化可能有 `ceil_mode` 选项，但本节标准卷积按上述向下取整公式计算。

## 3. 参数量与计算量

输入通道数为 $C_{\mathrm{in}}$，输出通道数为 $C_{\mathrm{out}}$ 时，带 bias 的参数量为

$$
K_hK_wC_{\mathrm{in}}C_{\mathrm{out}}+C_{\mathrm{out}}.
$$

若关闭 bias，去掉最后一项。输出空间位置增多不会增加参数量，但会增加乘加计算量和激活内存。池化层通常没有可学习参数；如果题目问“参数量”，不要把池化窗口大小乘进去。

## 4. 小例子：尺寸和参数量

输入为 $32\times32\times3$，卷积层有 $16$ 个 $3\times3$ 核，stride 为 $1$，padding 为 $1$，带 bias。有效核尺寸为 $3$，所以

$$
H_{\mathrm{out}}=W_{\mathrm{out}}=\left\lfloor\frac{32+2-3}{1}\right\rfloor+1=32.
$$

输出为 $32\times32\times16$。参数量为

$$
3\times3\times3\times16+16=432+16=448.
$$

若把 stride 改为 $2$，输出空间尺寸变成 $16\times16$；参数量仍是 $448$，因为 stride 只改变滑动位置，不改变卷积核形状。

## 5. 感受野与结构比较

一个 $3\times3$ 卷积只看局部邻域，但堆叠两层后理论感受野可以覆盖 $5\times5$ 区域；中间加入非线性还增加了表达能力。stride 或 pooling 会降低空间分辨率、扩大后续单元对应的原图区域，但也会丢失细节。

与全连接层相比，卷积的优点是：

- 局部连接利用图像的空间局部性；
- 权重共享显著减少参数，并使平移具有一定等变性；
- 多层堆叠从边缘等局部模式逐步组合出更大结构。

“卷积天然具有平移不变性”说得过强。严格地说，理想无边界处理的卷积更接近平移等变，池化、padding、裁剪和数据增强会改变这一性质。

## 6. 残差连接

残差块学习一个增量函数：

$$
\mathbf y=F(\mathbf x,\{W_i\})+\mathbf x.
$$

反向时梯度至少有一条从 $\mathbf y$ 到 $\mathbf x$ 的恒等路径，有助于深层网络优化。若通道数或空间尺寸不同，不能直接相加，需用 $1\times1$ 投影或下采样对齐：

$$
\mathbf y=F(\mathbf x)+W_s\mathbf x.
$$

残差连接改善的是梯度和优化路径，并不等于自动消除过拟合或保证每个更深模型都更好。

## 7. 高频比较与易错点

| 问法 | 判断方法 |
| --- | --- |
| padding 影响什么？ | 影响输出空间尺寸和边界信息，不改变卷积核参数量。 |
| stride 影响什么？ | 影响输出尺寸和计算量，不改变单个卷积层的参数量。 |
| 输入通道如何进入参数量？ | 每个输出通道都要覆盖全部输入通道，因此要乘 $C_{\mathrm{in}}$。 |
| $1\times1$ 卷积有什么用？ | 对每个空间位置做通道方向的线性组合，常用于通道变换和残差投影。 |
| 卷积和全连接如何比较？ | 卷积有局部连接与共享权重，参数少；全连接对全部输入连接，空间结构利用较少。 |

常见错误包括漏乘输入通道、把输出通道写成输入通道、忘记 bias，以及把 stride 误当成参数量的一部分。

## 闭卷练习

### 题 1：含 stride 的输出尺寸

输入为 $28\times28$，卷积核 $5\times5$，padding 为 $2$，stride 为 $2$，dilation 为 $1$。求输出空间尺寸。

<details>
<summary>展开解析</summary>

有效核尺寸为 $5$，所以

$$
H_{\mathrm{out}}=W_{\mathrm{out}}=
\left\lfloor\frac{28+2\times2-5}{2}\right\rfloor+1
=\lfloor13.5\rfloor+1=14.
$$

输出空间尺寸是 $14\times14$。padding 抵消了一部分尺寸损失，stride 仍使结果约缩小一半。
</details>

### 题 2：带 bias 的参数量

输入通道为 $64$，输出通道为 $128$，卷积核为 $3\times3$，带 bias。求参数量；若改为 $1\times1$ 卷积，参数量是多少？

<details>
<summary>展开解析</summary>

$3\times3$ 卷积参数量为

$$
3\times3\times64\times128+128=73{,}728+128=73{,}856.
$$

$1\times1$ 卷积参数量为

$$
1\times1\times64\times128+128=8{,}192+128=8{,}320.
$$

两者输出通道相同，但 $1\times1$ 只做通道混合，空间邻域大小不同。
</details>

### 题 3：残差相加是否可行

主分支输出形状为 $[N,128,14,14]$，捷径分支输入形状为 $[N,64,28,28]$。能否直接相加？若不能，至少需要怎样的投影？

<details>
<summary>展开解析</summary>

不能直接相加，因为通道数和空间尺寸都不同。捷径分支可以使用 stride 为 $2$ 的 $1\times1$ 卷积，把 $64$ 个通道映射成 $128$ 个通道，并把 $28\times28$ 下采样为 $14\times14$。得到 $[N,128,14,14]$ 后，才能与主分支逐元素相加。
</details>

## 延伸资料

- [D2L：图像卷积](https://zh.d2l.ai/chapter_convolutional-neural-networks/conv-layer.html)。
- [D2L：填充和步幅](https://zh.d2l.ai/chapter_convolutional-neural-networks/padding-and-strides.html)。
- [D2L：多输入多输出通道](https://zh.d2l.ai/chapter_convolutional-neural-networks/channels.html)。
- [D2L：残差网络](https://zh.d2l.ai/chapter_convolutional-modern/resnet.html)。
