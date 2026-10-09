---
title: 深度学习基础
description: 面向笔试与面试的深度学习六章基础：从计算图和反向传播到卷积、循环网络与训练排障。
---

# 深度学习基础

这一组内容服务于机器学习基础之后、LLM 原理之前的复习。重点是能把网络的前向计算、梯度来源和训练行为讲清楚，并能完成常见的手算题。这里不展开 Transformer 或大模型专题。

## 六章路线

| 顺序 | 章节 | 复习目标 |
| --- | --- | --- |
| 1 | [计算图与反向传播](./01-backprop.md) | 按链式法则写出中间梯度，检查形状和转置 |
| 2 | [激活函数与损失函数](./02-activations-losses.md) | 根据任务选择输出、损失和稳定实现 |
| 3 | [优化器、学习率与初始化](./03-optimization.md) | 手算一次更新，区分 Adam、AdamW 与权重衰减 |
| 4 | [训练技巧与排障](./04-training.md) | 区分 train/eval，定位过拟合、梯度和 NaN |
| 5 | [CNN、尺寸与残差连接](./05-cnn.md) | 计算输出尺寸、参数量，理解局部连接和跳连 |
| 6 | [RNN、LSTM 与 GRU](./06-rnn.md) | 写出时间步更新，解释长期依赖和梯度问题 |

## 建议用法

先按顺序读完前四章，再用 CNN 和 RNN 的公式做一轮闭卷复述。计算题和手写实现集中放在[ML/DL 笔试计算与编程专项](../ml-dl-practice/index.md)。每章的折叠题先独立作答，再展开解析；题目只覆盖高频基础，不替代完整课程。

已有的 LLM 优化内容可作为延伸阅读：[Loss And Optimization](../../materials/llm-agent-interview-guide/01-Foundation/03-Loss-And-Optimization.md)。它保留在原资料区，本页只链接，不复制。

## 资料边界

本组只从四类资料中抽取选题和公式，再用自己的话整理：

- [AI-interview-cards](https://github.com/zixian2021/AI-interview-cards)：检查常见面试问法和遗漏点。
- [Stanford CS229 Lecture Notes](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)：参考神经网络、反向传播、泛化和正则化的数学表述。
- [XGBoost 官方原理教程](https://xgboost.readthedocs.io/en/stable/tutorials/model.html)：与 ML 树模型章节配套，本组不重复展开。
- [动手学深度学习](https://zh.d2l.ai/)：参考[反向传播](https://zh.d2l.ai/chapter_multilayer-perceptrons/backprop.html)、[优化算法](https://zh.d2l.ai/chapter_optimization/index.html)、[卷积](https://zh.d2l.ai/chapter_convolutional-neural-networks/conv-layer.html)、[RNN](https://zh.d2l.ai/chapter_recurrent-neural-networks/rnn.html)、[GRU](https://zh.d2l.ai/chapter_recurrent-modern/gru.html)和[LSTM](https://zh.d2l.ai/chapter_recurrent-modern/lstm.html)教程。

公式中的符号约定：粗体表示向量或矩阵，$\odot$ 表示逐元素乘法；批量维度通常写作 $n$，隐藏维度写作 $h$。除非特别说明，损失按当前批次的样本平均。
