---
title: 指标、交叉验证与类别不平衡
description: 根据任务目标选择分类回归指标，正确使用交叉验证，并处理少数类和阈值问题。
---

# 指标、交叉验证与类别不平衡

## 先问“错在哪里”

指标不是越多越好，而是要对应错误成本、预测输出和部署决策。先明确模型输出的是连续值、概率还是最终类别，以及假阳性（把负例判成正例）和假阴性的代价谁更高。

二分类混淆矩阵如下：

|  | 实际正例 | 实际负例 |
| --- | ---: | ---: |
| 预测正例 | TP | FP |
| 预测负例 | FN | TN |

## 分类指标

最常用的指标为

$$
\operatorname{precision}=\frac{TP}{TP+FP},\qquad
\operatorname{recall}=\frac{TP}{TP+FN},
$$

$$
\operatorname{specificity}=\frac{TN}{TN+FP},\qquad
F_1=\frac{2\cdot\operatorname{precision}\cdot\operatorname{recall}}
{\operatorname{precision}+\operatorname{recall}}.
$$

- precision 高表示“报为正的样本里更可靠”，适合误报成本高的场景。
- recall 高表示“真正的正例尽量不漏”，适合漏报成本高的场景。
- 调整分类阈值通常会让 precision 和 recall 此消彼长；阈值必须在验证数据上选择。
- accuracy $=(TP+TN)/(TP+FP+FN+TN)$ 在类别极不平衡时可能误导。例如正例占 1% 时，全预测负例也有 99% accuracy。

当模型输出连续分数时，可以扫过阈值画 ROC 曲线（横轴 FPR、纵轴 TPR），其面积 ROC-AUC 衡量排序能力，和具体阈值无关。正例非常稀少时，PR 曲线更关注正类质量，PR-AUC 往往比 ROC-AUC 更能反映实际筛选效果；两者都不替代固定业务阈值下的 precision/recall。

若输出要作为概率使用，还应检查**校准**：预测为 0.8 的样本是否大约 80% 为正例。Brier score 是平方概率误差的一种度量：

$$
\operatorname{Brier}=\frac1n\sum_{i=1}^n(p_i-y_i)^2.
$$

对数损失会惩罚过度自信的错误概率：

$$
\operatorname{LogLoss}=-\frac1n\sum_{i=1}^n\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right].
$$

## 回归指标

给定真实值 $y_i$ 和预测值 $\hat y_i$：

$$
\operatorname{MAE}=\frac1n\sum_i|y_i-\hat y_i|,
\qquad
\operatorname{MSE}=\frac1n\sum_i(y_i-\hat y_i)^2,
$$

$$
\operatorname{RMSE}=\sqrt{\operatorname{MSE}}.
$$

MAE 对异常值更稳健，且与原目标单位相同；MSE/RMSE 更重视大误差，常用于大偏差代价高的任务。MAPE 在真实值接近 0 时不稳定，不能无条件使用。$R^2=1-\mathrm{SSE}/\mathrm{SST}$ 表示相对于“预测当前评估样本均值”的改进，测试集上的 $R^2$ 也可能为负，并不等于准确率。

## 交叉验证

$k$ 折交叉验证把训练数据分成 $k$ 份，每次用 $k-1$ 份训练、剩下一份验证，平均验证分数用于估计模型在该数据分布上的表现和选择超参数。注意：

- 预处理、特征选择和模型训练必须只在当前训练折拟合。
- 分类任务通常使用分层 $k$ 折，以保持每折类别比例；少数类样本太少时仍会导致高方差。
- 同一用户、患者、设备或文档的记录应使用 group split，不能让同一 group 跨折。
- 时间序列应按时间向前验证，不能随机打乱未来。
- 如果同时用交叉验证选择大量方案又反复查看结果，仍会对验证过程过拟合；样本足够时可使用嵌套交叉验证。

最终测试分数只在方案和阈值固定后报告。应同时给平均分、折间波动和有效样本数；一个很高但波动巨大的均值不等于稳定模型。

## 类别不平衡

少数类任务要先确定目标：找全正例、减少误报，还是输出可信概率。常见策略是：

1. 用分层或分组切分，避免验证集中没有正例。
2. 训练时使用 class weight 或重采样；重采样只能作用于训练折，不能改验证/测试分布。
3. 在验证集根据业务成本选阈值；不要默认 0.5。
4. 报告少数类 precision、recall、F1、PR-AUC 和固定阈值表现，必要时补充混淆矩阵。
5. 评估概率任务时检查校准；重采样会改变训练先验，概率可能需要重新校准。

加权交叉熵可写为

$$
L=-\frac1n\sum_i w_{y_i}\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right].
$$

权重的选择反映训练时的代价，不会自动解决标签噪声、分布漂移或业务阈值问题。

## 易错点与比较

- ROC-AUC 衡量排序，不能直接告诉你某个阈值下的 precision；PR-AUC 也不能替代业务阈值下的召回率。
- F1 是 precision 和 recall 的调和平均，不能表达 FP 与 FN 的不同金钱代价；此时应使用成本函数或明确约束。
- macro-F1 对每个类别等权，micro-F1 按所有样本汇总；类别不均衡时两者可能差很多。
- 回归指标的平均值可能掩盖长尾样本和分组差异，应按关键群体分层查看。
- 用测试集调阈值会让测试集失去独立性；阈值属于模型方案的一部分。

## 闭卷题

### 题 1：不平衡数据

正例率为 0.5%，模型把所有样本预测为负，accuracy 约 99.5%。能否据此认为模型很好？至少应报告什么？

<details>
<summary>展开解析</summary>

不能。模型的正例 recall 为 0，无法完成发现正例的任务。应至少报告正类 precision、recall、F1、PR-AUC，并给出一个在验证集按业务代价选定的阈值下的混淆矩阵；如果输出概率，还应评估校准。
</details>

### 题 2：指标选择

在垃圾邮件过滤和癌症筛查中，哪一个更应该优先关注 recall？为什么不能只写“F1 更高的模型一定更好”？

<details>
<summary>展开解析</summary>

癌症筛查通常漏掉真实病例的代价更高，优先保证 recall，再在可接受的误报水平上比较 precision。垃圾邮件过滤往往更在意误删正常邮件，precision 或指定 recall 下的误报率可能更重要。F1 假设 precision 和 recall 同等重要，不能表达不同错误的业务代价，也不能说明阈值下的稳定性。
</details>

### 题 3：交叉验证泄漏

你先在全量训练数据上做标准化和选出相关性最高的 100 个特征，再进行 5 折交叉验证。这个分数还能作为无偏估计吗？

<details>
<summary>展开解析</summary>

不能保证。标准化统计量和特征选择使用了每一折的验证数据，验证信息进入训练流程。正确做法是把预处理和特征选择放入 pipeline，在每一折只用该折训练部分拟合，然后转换验证部分。
</details>

### 题 4：ROC 与 PR

两个模型 ROC-AUC 接近，但正例只占 0.1%，模型 A 的 PR-AUC 更高。你会优先选 A 吗？还要补看什么？

<details>
<summary>展开解析</summary>

在发现少数正例的任务里，A 的 PR-AUC 更高通常是有利信号，但还要看验证集上业务阈值的 precision、recall、覆盖量、成本和概率校准。PR-AUC 的基线也随正例率变化，不能脱离数据分布直接比较。
</details>

## 来源

- [AI-interview-cards](https://github.com/zixian2021/AI-interview-cards)：用于指标、交叉验证和不平衡题型查漏。
- [Stanford CS229 main notes](https://cs229.stanford.edu/notes2022fall/main_notes.pdf)：用于损失、评估和统计学习背景。
