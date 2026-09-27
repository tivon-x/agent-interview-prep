# 对齐技术 (Alignment)

**主线**：PPO 用奖励做在线优化，但需要训练 Critic；DPO 用已有偏好对直接训练，省去在线强化学习；GRPO 保留在线优化，用组内相对奖励代替 Critic。DPO 和 GRPO 分别解决 PPO 的不同成本，不是递进关系。

## 1. RLHF (Reinforcement Learning from Human Feedback)

### Q: RLHF 的完整流程 ⭐⭐⭐⭐

**三个阶段**：

**阶段 1：SFT (Supervised Fine-Tuning)**
- 用高质量人工标注数据做有监督微调
- 让模型学会遵循指令

**阶段 2：Reward Model Training**
- 人工对模型回答进行排序
- 训练奖励模型 $r(x, y)$ 学习人类偏好
- 损失函数：

$$\mathcal{L}_{RM} = -\log \sigma(r(x, y_w) - r(x, y_l))$$

**阶段 3：PPO (Proximal Policy Optimization)**
- 用奖励模型指导策略优化

---

## 2. PPO 详解

### Q: PPO 的四个组件 ⭐⭐⭐⭐

| 组件 | 作用 | 描述 |
|------|------|------|
| Actor (策略模型) | 生成回答 | 正在训练的 LLM |
| Critic (价值模型) | 评估状态价值 | $V(s)$ 估计 |
| Reward Model | 评分 | 评估回答质量 |
| Reference Model | 防止偏离 | 冻结的 SFT 模型 |

**PPO 目标函数**：

$$\mathcal{L}^{PPO} = \mathbb{E}\left[\min\left(\frac{\pi_\theta}{\pi_{\theta_{old}}} A_t, \text{clip}\left(\frac{\pi_\theta}{\pi_{\theta_{old}}}, 1-\epsilon, 1+\epsilon\right) A_t\right)\right]$$

**总奖励**：

$$R(x,y) = r_\phi(x,y) - \beta \cdot D_{KL}(\pi_\theta \| \pi_{ref})$$

KL 惩罚防止策略偏离参考模型太远。

### Q: PPO 的思想、流程和局限是什么？

**思想**：用奖励推动策略生成更好的回答，用 Critic 估计基线以降低更新噪声。PPO 的 clip 限制当前策略相对**采样时的旧策略**变化过大；RLHF 中的 KL 惩罚约束策略偏离**冻结的参考模型**。旧策略与参考模型作用不同。

**流程**：① Actor 对提示词生成回答；② Reward Model 评分，结合参考模型的 KL 惩罚得到训练信号；③ Critic 估计价值，计算回答比预期好或差多少（优势）；④ 按优势和新旧策略概率比更新 Actor，同时训练 Critic；⑤ 重新采样，循环优化。

**解决的问题**：从模型自身的新回答中持续学习，并控制单次更新幅度。**优势**：能在线探索，适合有可靠奖励的任务。**代价与边界**：生成、打分、训练 Critic 开销大；对奖励质量和超参数敏感，clip 也无法消除奖励投机或训练不稳定。代表应用：InstructGPT 的 RLHF 阶段。

---

## 3. DPO (Direct Preference Optimization)

### Q: DPO 的数学推导 ⭐⭐⭐

**核心思想**：跳过奖励模型训练，直接从偏好数据优化策略。

**推导过程**：

从 RLHF 的最优策略出发：

$$\pi^*(y|x) = \frac{1}{Z(x)} \pi_{ref}(y|x) \exp\left(\frac{r(x,y)}{\beta}\right)$$

反解奖励函数：

$$r(x,y) = \beta \log \frac{\pi^*(y|x)}{\pi_{ref}(y|x)} + \beta \log Z(x)$$

代入 Bradley-Terry 模型：

$$P(y_w \succ y_l) = \sigma(r(x,y_w) - r(x,y_l))$$

得到 **DPO 损失**：

$$\mathcal{L}_{DPO} = -\mathbb{E}\left[\log \sigma\left(\beta \log \frac{\pi_\theta(y_w|x)}{\pi_{ref}(y_w|x)} - \beta \log \frac{\pi_\theta(y_l|x)}{\pi_{ref}(y_l|x)}\right)\right]$$

### Q: DPO 的思想、流程和局限是什么？

**思想**：在带参考策略约束的偏好优化目标下，利用最优策略与奖励的关系，把“训练奖励模型 + PPO”改写成偏好对上的分类损失。这里有目标的闭式关系，实际训练仍要迭代更新模型参数，并非一次算出最终模型。

**流程**：准备同一问题的偏好回答 $y_w$ 和非偏好回答 $y_l$ → 分别计算当前策略与冻结参考模型对两者的对数概率 → 提高“偏好回答相对非偏好回答”的概率差距。

**相对 PPO 解决的问题**：省去显式 Reward Model、Critic 和训练时的在线采样，流程更简单、资源开销通常更低。**边界**：标准 DPO 依赖固定偏好数据，无法自行探索新回答；数据覆盖和标注质量限制效果，也可能过度压低非偏好回答概率。它适合已有偏好对的对齐任务，不替代需要在线探索的强化学习。

---

## 4. GRPO (Group Relative Policy Optimization)

### Q: GRPO 的原理（DeepSeek 核心算法）⭐⭐⭐⭐⭐

**核心创新**：去掉 Critic 模型，用**组内相对奖励**估算优势函数。

**算法流程**：
1. 对每个问题 $x$，从策略 $\pi_\theta$ 采样一组回答 $\{y_1, ..., y_G\}$
2. 用奖励模型或可验证规则对每个回答打分 $\{r_1, ..., r_G\}$
3. 计算组内标准化的优势：

$$\hat{A}_i = \frac{r_i - \text{mean}(\{r_1,...,r_G\})}{\text{std}(\{r_1,...,r_G\})}$$

4. 优化目标：

$$\mathcal{L}_{GRPO} = -\mathbb{E}\left[\frac{1}{G}\sum_{i=1}^{G}\left(\min\left(\frac{\pi_\theta(y_i|x)}{\pi_{\theta_{old}}(y_i|x)}\hat{A}_i, \text{clip}(\cdot)\hat{A}_i\right) - \beta D_{KL}(\pi_\theta \| \pi_{ref})\right)\right]$$

### Q: GRPO 相对 PPO 改进了什么？还有什么局限？

**思想**：把同一问题的一组回答互相比较，以组均值为基线、组内标准差做归一化。高于组均值的回答得到正优势，低于均值的得到负优势，无需单独训练 Critic。它保留了 PPO 式在线采样、概率比和 clip；不是在 DPO 上继续优化。

**解决的问题**：省去 Critic 的显存和训练成本，同时保留探索新答案的能力。数学、代码等结果可验证的任务容易提供明确奖励；GRPO 最早用于 DeepSeekMath，后用于 DeepSeek-R1。

**边界**：每题要生成多个回答，采样成本仍高；组内奖励相同时缺少有效优势信号，奖励有偏差时仍会把策略带偏。去掉 Critic 不等于去掉奖励计算，也不保证整体训练更快。

### Q: PPO、DPO、GRPO 如何区分？

| 方法 | 训练信号与更新 | 省掉什么 | 主要边界 |
|------|----------------|----------|----------|
| PPO | 在线生成，用奖励与 Critic 估计优势 | 无 | 多模型训练成本高，依赖奖励质量 |
| DPO | 用现有偏好对直接优化策略 | 显式奖励模型、Critic、在线采样 | 受固定数据覆盖与质量限制 |
| GRPO | 在线生成一组回答，用组内相对奖励估计优势 | Critic | 组内采样成本高，依赖奖励区分度 |

---

## 5. 其他对齐方法

### DAPO (Decoupled Clip and Dynamic sAmpling Policy Optimization)
- 基于 GRPO 的长推理训练改进，使用非对称 clip 和动态采样等方法改善训练稳定性与有效样本利用

### REINFORCE++
- REINFORCE 的改进版
- 加入 baseline 减小方差
- 比 PPO 简单，比 REINFORCE 稳定

### Q: 对齐方法时间线

```
RLHF/PPO (2022, InstructGPT)
    ↓
DPO (2023, Stanford)
    ↓
KTO, IPO, ORPO (2024, 各种改进)
    ↓
GRPO (2024, DeepSeekMath；2025, DeepSeek-R1)
    ↓
DAPO, REINFORCE++ (2025-2026)
```

---

## 6. 奖励函数设计

### Q: 如何为 Function Calling 场景设计奖励函数？

```python
def reward_function_calling(response, ground_truth):
    reward = 0.0
    
    # 1. 格式正确性 (0.3)
    if is_valid_json(response.tool_calls):
        reward += 0.3
    
    # 2. 工具选择正确性 (0.3)
    if response.tool_name == ground_truth.tool_name:
        reward += 0.3
    
    # 3. 参数正确性 (0.3)
    param_score = compute_param_overlap(
        response.params, ground_truth.params
    )
    reward += 0.3 * param_score
    
    # 4. 执行结果 (0.1)
    if execute(response) == ground_truth.result:
        reward += 0.1
    
    return reward
```
