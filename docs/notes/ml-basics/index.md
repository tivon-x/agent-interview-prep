---
title: 机器学习基础
description: 面向笔试与面试的机器学习六章路线，覆盖泛化、评估、线性模型、经典分类器、树模型和聚类降维。
---

# 机器学习基础

这条线先解决传统机器学习中最容易在笔试里失分的部分：训练数据能否代表未见数据、指标是否适合题目、目标函数从何而来，以及常见模型怎样做出预测。六章按“泛化与评估 → 模型 → 无监督学习”的顺序阅读；每章都配有闭卷题，先独立写出公式和判断，再展开解析。

## 六章路线

1. [泛化、偏差与方差](./01-generalization.md)：过拟合、数据划分和数据泄漏。
2. [指标、交叉验证与类别不平衡](./02-evaluation.md)：如何选指标、切分数据和设定阈值。
3. [线性模型、逻辑回归、MLE 与 MAP](./03-linear-models.md)：从概率假设推到损失与正则化。
4. [KNN、朴素贝叶斯与 SVM](./04-classic-classifiers.md)：三类经典分类器的假设与比较。
5. [树模型与集成学习](./05-tree-ensembles.md)：决策树、随机森林、Boosting、GBDT 和 XGBoost。
6. [特征处理、K-means、GMM/EM 与 PCA](./06-clustering-features.md)：聚类、混合模型和降维。

## 推荐用法

先读每章正文，再合上页面做题。遇到薄弱点时，使用 [AI-interview-cards](https://github.com/zixian2021/AI-interview-cards) 查题型；需要推导时参考 [Stanford CS229 课程笔记](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)，树模型目标函数参考 [XGBoost 官方原理教程](https://xgboost.readthedocs.io/en/stable/tutorials/model.html)。公式和题目在这里重新整理，资料链接用于继续阅读，不替代理解。

掌握六章后，进入[ML/DL 笔试计算与编程专项](../ml-dl-practice/index.md)，练习逻辑回归 Batch GD、Softmax、反向传播和 CNN 尺寸计算。

## 一页自检

- 能解释训练误差下降为什么不等于泛化能力提高，并指出一种数据泄漏。
- 能根据业务代价选择 precision、recall、PR-AUC 或校准指标，而不是只报 accuracy。
- 能写出逻辑回归的交叉熵、梯度，并说明 MLE 与 MAP 的关系。
- 能比较 KNN、朴素贝叶斯和 SVM 的主要假设与计算代价。
- 能写出 XGBoost 的二阶近似、叶子最优权重和分裂增益。
- 能完成一次 GMM 的 E-step/M-step，说明它与 K-means 的关系和边界。

## 参考资料

- [AI-interview-cards](https://github.com/zixian2021/AI-interview-cards)：用于常见问法和查漏。
- [CS229 main notes](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)：用于统计学习与 EM 等原理。
- [XGBoost: Introduction to Boosted Trees](https://xgboost.readthedocs.io/en/stable/tutorials/model.html)：用于 XGBoost 目标函数和分裂评分。
