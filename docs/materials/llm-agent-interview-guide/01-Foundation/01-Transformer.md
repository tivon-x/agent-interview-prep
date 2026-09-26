# Transformer 架构详解

## 1. Transformer 整体架构

### Q: 请描述 Transformer 的整体架构

Transformer 由 **Encoder** 和 **Decoder** 两部分组成（原始论文），每个部分由 N 个相同的层堆叠而成。

**Encoder 层结构：**
```
Input → Embedding + Positional Encoding
     → Multi-Head Self-Attention → Add & Norm
     → Feed-Forward Network → Add & Norm
     → Output
```

**Decoder 层结构：**
```
Input → Embedding + Positional Encoding
     → Masked Multi-Head Self-Attention → Add & Norm
     → Cross-Attention (with Encoder output) → Add & Norm
     → Feed-Forward Network → Add & Norm
     → Output
```

### Q: 为什么 Transformer 比 RNN 好？

| 特性 | RNN/LSTM | Transformer |
|------|----------|-------------|
| 并行化 | ❌ 序列依赖 | ✅ 完全并行 |
| 长距离依赖 | 梯度消失/爆炸 | 直接建模 |
| 计算复杂度 | O(n) 顺序步 | 全注意力分数矩阵为 O(n²) |
| 训练速度 | 慢 | 快 |

---

## 2. Self-Attention 机制

### Q: 请详细推导 Self-Attention 的计算过程 ⭐⭐⭐⭐⭐

**核心公式：**

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

**计算步骤：**

1. **线性变换**：输入 $X \in \mathbb{R}^{n \times d}$，通过三个权重矩阵生成 Q、K、V

$$Q = XW^Q, \quad K = XW^K, \quad V = XW^V$$

其中 $W^Q, W^K \in \mathbb{R}^{d \times d_k}$，$W^V \in \mathbb{R}^{d \times d_v}$

2. **计算注意力分数**：

$$S = \frac{QK^T}{\sqrt{d_k}} \in \mathbb{R}^{n \times n}$$

3. **Softmax 归一化**：对每一行做 softmax

$$A = \text{softmax}(S) \in \mathbb{R}^{n \times n}$$

4. **加权求和**：

$$\text{Output} = AV \in \mathbb{R}^{n \times d_v}$$

### Q: 为什么要除以 $\sqrt{d_k}$？

当 $d_k$ 较大时，$QK^T$ 的值会很大（方差约为 $d_k$），导致 softmax 输出趋近于 one-hot 分布，梯度接近为零。

除以 $\sqrt{d_k}$ 可以使方差稳定在 1 左右，保证 softmax 有合理的梯度。

**数学证明**：假设 $q_i, k_j \sim \mathcal{N}(0, 1)$，则：

$$\text{Var}(q \cdot k) = \sum_{i=1}^{d_k} \text{Var}(q_i k_i) = d_k$$

除以 $\sqrt{d_k}$ 后方差变为 1。

### Q: Self-Attention 的计算复杂度是多少？

| 操作 | 复杂度 |
|------|--------|
| $QK^T$ 计算 | $O(n^2 d)$ |
| Softmax | $O(n^2)$ |
| $\text{Softmax} \times V$ | $O(n^2 d)$ |
| **总计** | **$O(n^2 d)$** |

其中 $n$ 为序列长度，$d$ 为维度。

### 面试手写代码：简化 Decoder-only Transformer

代码重点：Padding mask 的 True 表示 PAD；每层 Cache 保存历史 K/V 和对应 mask。示例按右侧补 PAD 处理。

记号与前文统一：$B$ 为批量大小，$n$ 为序列长度，$d$ 为模型维度，$h$ 为头数；代码中的 `d_model` 对应 $d$，`n_heads` 对应 $h$。本例每头维度 $d_k=d_v=d/h$；增量解码中 $n_q$ 为本次输入长度，$n_{past}$ 为历史 Cache 长度，$n_k=n_{past}+n_q$。

```python
import math

import torch
from torch import nn


class CausalSelfAttention(nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        # 确保 d 能被 h 整除，使每个注意力头获得相同维度。
        if n_heads <= 0 or d_model % n_heads:
            raise ValueError("d_model must be divisible by n_heads")
        self.n_heads = n_heads                  # h：注意力头数。
        self.head_dim = d_model // n_heads      # 单头维度：d_k = d_v = d / h。
        self.qkv = nn.Linear(d_model, 3 * d_model)  # 一次线性变换同时生成 Q、K、V。
        self.out = nn.Linear(d_model, d_model)  # 拼接各头后再做一次线性变换。

    def forward(self, x, padding_mask, past=None, use_cache=False):
        # x: [B, n_q, d]；padding_mask: [B, n_q]，True 表示 PAD。
        batch, query_len, d_model = x.shape  # 取出批量、当前序列长度和模型维度，供后续拆头使用。
        q, k, v = self.qkv(x).chunk(3, dim=-1)  # 投影后按最后一维切成 Q、K、V，各为 [B, n_q, d]。

        # 将模型维度 d 拆成 h 个头，使后续矩阵乘法能逐头并行计算。
        def split_heads(t):
            return t.view(
                batch, query_len, self.n_heads, self.head_dim
            ).transpose(1, 2)  # Q/K 用 d_k、V 用 d_v：[B, n_q, h, d_k/d_v] -> [B, h, n_q, d_k/d_v]。

        q, k, v = map(split_heads, (q, k, v))  # Q、K、V 都按相同方式拆分多头。
        if past is None:
            past_len, past_mask = 0, None  # 首次处理完整输入，没有历史 Cache。
        else:
            past_k, past_v, past_mask = past  # 本层历史 Cache：K [B, h, n_past, d_k]，V [B, h, n_past, d_v]。
            past_len = past_k.size(-2)  # 当前查询的位置从历史长度 n_past 之后开始。
            k = torch.cat((past_k, k), dim=-2)  # 拼接历史和当前 K，供新 token 查询整个前缀。
            v = torch.cat((past_v, v), dim=-2)  # V 与 K 按相同序列位置拼接。

        # 为每个 Key 标记是否为 PAD，并把历史标记与当前标记拼在一起。
        key_mask = padding_mask if past_mask is None else torch.cat(
            (past_mask, padding_mask), dim=-1
        )  # [B, n_k]，其中 n_k = n_past + n_q。
        # 若一行全是 PAD，Softmax 会产生 NaN，因此提前报错。
        if key_mask.all(dim=-1).any():
            raise ValueError("each sequence needs a non-PAD token")

        key_len = k.size(-2)  # n_k：历史 Key 和当前 Key 的总长度。
        # QK^T 计算相似度；除以 sqrt(d_k) 可避免分数过大使 Softmax 过尖。
        scores = q @ k.transpose(-2, -1) / math.sqrt(self.head_dim)  # [B, h, n_q, n_k]。
        # 使用全序列位置编号，使因果屏蔽在带 Cache 的增量解码中也正确。
        q_pos = past_len + torch.arange(query_len, device=x.device)  # 当前查询的位置编号。
        k_pos = torch.arange(key_len, device=x.device)  # 历史与当前 Key 的位置编号。
        causal = k_pos[None, :] > q_pos[:, None]  # True 表示该 Key 在当前 Query 之后。
        # 未来位置或 PAD Key 都要屏蔽；扩展维度后可广播到每个样本和注意力头。
        blocked = causal[None, None] | key_mask[:, None, None, :]  # [B, h, n_q, n_k]。

        # 被屏蔽位置设为负无穷，Softmax 后其注意力权重为 0。
        weights = scores.masked_fill(blocked, float("-inf")).softmax(dim=-1)
        y = weights @ v  # 按注意力权重汇总可见 Value：[B, h, n_q, d_v]。
        y = y.transpose(1, 2).contiguous()  # 转回 token 在前的顺序：[B, n_q, h, d_v]。
        y = y.view(batch, query_len, d_model)  # 合并多头：[B, n_q, d]。
        # 推理时保存所有历史 K/V；训练时通常不需要构造 Cache。
        cache = (k, v, key_mask) if use_cache else None
        return self.out(y), cache  # 输出投影后返回注意力结果，以及本层更新后的 Cache。


class DecoderBlock(nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        self.norm1 = nn.LayerNorm(d_model)  # 注意力前归一化，对应 Pre-LN。
        self.attn = CausalSelfAttention(d_model, n_heads)
        self.norm2 = nn.LayerNorm(d_model)  # FFN 前归一化，同样采用 Pre-LN。
        # FFN 对每个位置独立做变换；位置之间的信息交互由 Attention 完成。
        self.ffn = nn.Sequential(
            nn.Linear(d_model, 4 * d_model),  # 扩展特征维度：[B, n, d] -> [B, n, 4d]。
            nn.GELU(),  # 加入非线性变换。
            nn.Linear(4 * d_model, d_model),  # 映射回残差维度：[B, n, 4d] -> [B, n, d]。
        )

    def forward(self, x, padding_mask, past=None, use_cache=False):
        # 注意力子层：先归一化，再做注意力，最后与输入相加形成残差连接。
        attn_out, cache = self.attn(
            self.norm1(x), padding_mask, past, use_cache
        )
        x = x + attn_out
        # FFN 子层也采用“归一化 + 变换 + 残差”；同时把本层 Cache 返回给上层。
        ffn_out = self.ffn(self.norm2(x))
        return x + ffn_out, cache


class TinyGPT(nn.Module):
    def __init__(self, vocab_size, d_model, n_heads, n_layers, max_seq_len):
        super().__init__()
        self.max_seq_len = max_seq_len  # 限制位置编码和 Cache 可容纳的最大序列长度。
        self.token_emb = nn.Embedding(vocab_size, d_model)  # 将 Token ID 映射为 d 维向量。
        self.position_emb = nn.Embedding(max_seq_len, d_model)  # 将位置编号映射为 d 维向量。
        # 堆叠多个 Decoder Block；生成时每层分别维护自己的 K/V Cache。
        self.blocks = nn.ModuleList(
            [DecoderBlock(d_model, n_heads) for _ in range(n_layers)]
        )
        self.norm = nn.LayerNorm(d_model)  # 归一化最后一层的每个 token 表示。
        self.lm_head = nn.Linear(d_model, vocab_size, bias=False)  # 输出词表中每个 token 的分数。

    def forward(self, input_ids, padding_mask=None, past_key_values=None,
                use_cache=False):
        # input_ids: [B, n_q]；logits: [B, n_q, vocab_size]。
        batch, query_len = input_ids.shape  # 取出批量大小和本次处理的序列长度。
        if padding_mask is None:
            # 未传 mask 时，默认所有输入位置都是真实 token。
            padding_mask = torch.zeros_like(input_ids, dtype=torch.bool)
        elif padding_mask.shape != input_ids.shape:
            raise ValueError("padding_mask must match input_ids")
        else:
            # 统一 mask 的设备和类型，确保后续能与注意力分数做布尔运算。
            padding_mask = padding_mask.to(
                device=input_ids.device, dtype=torch.bool
            )

        if past_key_values is None:
            past_len = 0  # 首轮 Prefill 从完整 Prompt 开始，没有历史 Cache。
            # 历史有效 token 数为 0，因此新位置从 0 开始编号。
            past_valid = torch.zeros(
                batch, dtype=torch.long, device=input_ids.device
            )
        else:
            # 每个 Block 都有自己的 Cache；各层 Cache 对应相同的序列位置。
            if len(past_key_values) != len(self.blocks):
                raise ValueError("one cache entry is required per layer")
            past_mask = past_key_values[0][2]  # [B, n_past]；True 表示历史位置是 PAD。
            past_len = past_mask.size(-1)  # Cache 的实际长度，包含 PAD 占据的位置。
            past_valid = (~past_mask).sum(dim=-1)  # [B]；每个样本历史有效 token 数。

        # 位置编码表和 K/V Cache 都不能超过设定的最大长度。
        if past_len + query_len > self.max_seq_len:
            raise ValueError("sequence exceeds max_seq_len")

        # 位置编号只统计真实 token；右侧 PAD 不应让后续生成位置错位。
        valid = ~padding_mask  # True 为真实 token，False 为 PAD。
        position_ids = past_valid[:, None] + valid.long().cumsum(-1) - 1
        position_ids = position_ids.clamp_min(0)  # [B, n_q]；PAD 的编号截为 0，避免负索引。
        # 进入 Decoder 前，把 token 内容表示与位置信息相加。
        x = self.token_emb(input_ids) + self.position_emb(position_ids)  # [B, n_q, d]。

        new_cache = []
        for i, block in enumerate(self.blocks):
            # 取出当前层自己的历史 K/V；不同层之间不能共用 Cache。
            past = None if past_key_values is None else past_key_values[i]
            x, cache = block(x, padding_mask, past, use_cache)
            if use_cache:
                new_cache.append(cache)  # 保存更新后的 K/V，供下一步生成复用。

        logits = self.lm_head(self.norm(x))  # 将每个位置的最终表示映射为词表分数。
        # 训练只返回 logits；生成时额外返回各层 Cache，避免重复计算历史 token。
        return (logits, tuple(new_cache)) if use_cache else logits
```

训练时除了 Attention 屏蔽 PAD Key，还要在 loss 中用 ignore_index 忽略 PAD 标签。

推理时首轮处理完整 prompt，之后只传新 token：

```python
logits, cache = model(  # Prefill：处理完整 Prompt，并建立每层的 K/V Cache。
    input_ids,
    padding_mask=padding_mask,
    use_cache=True,
)
# 取每条 Prompt 最后一个真实 token 的分数，不能取右侧 PAD 的分数。
last = (~padding_mask).sum(dim=1) - 1  # [B].
batch_ids = torch.arange(input_ids.size(0), device=input_ids.device)  # 构造批量行号，用于逐样本取分数。
next_token = logits[batch_ids, last].argmax(-1, keepdim=True)  # 贪心选分最高的 token：[B, 1]。

# 后续只输入刚生成的 token；历史 K/V 已缓存，无需重算整段 Prompt。
next_logits, cache = model(
    next_token,
    past_key_values=cache,
    use_cache=True,
)  # 只为新位置输出 logits：[B, 1, vocab_size]。
```

---

## 3. Multi-Head Attention (MHA)

### Q: Multi-Head Attention 的原理和作用 ⭐⭐⭐⭐⭐

**公式：**

$$\text{MultiHead}(Q,K,V) = \text{Concat}(\text{head}_1, ..., \text{head}_h)W^O$$

$$\text{head}_i = \text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

**参数关系**：
- 总维度 $d_{model}$，头数 $h$
- 每个头的维度 $d_k = d_v = d_{model} / h$
- 参数量与单头 Attention 相同

**作用**：
1. 允许模型在不同位置同时关注不同子空间的信息
2. 不同头可以学习不同的注意力模式（语法、语义、位置等）
3. 计算量与单头相同，但表达能力更强

### Q: MHA、MQA、GQA、MLA 的区别 ⭐⭐⭐⭐

| 方法 | Q 头数 | K/V 组织 | KV Cache | 代表模型 |
|---|---:|---|---|---|
| **MHA** | $h$ | 每个 Q 头各有一组 K/V | 大 | GPT-2、BERT |
| **MQA** | $h$ | 所有 Q 头共享一组 K/V | 最小 | PaLM |
| **GQA** | $h$ | 分成 $g$ 组，每组共享一组 K/V | 介于两者之间 | LLaMA-2 70B |
| **MLA** | 多头 | 将 K/V 压缩到低维潜在表示 | 较小，取决于压缩维度 | DeepSeek-V2 |

记忆方法：MHA 每头一组，MQA 全部共用，GQA 分组共用，MLA 压缩 K/V 表示。GQA 中每组含 $h/g$ 个 Q 头。

**KV Cache 大小**约为 $2LTh_{kv}d_h$ 个元素，乘以数据类型字节数即可。MHA 有 $h_{kv}=h$，MQA 有 $h_{kv}=1$，GQA 介于二者之间。

**MLA** 将 K/V 投影到低维潜在向量，DeepSeek-V2 缓存潜在向量和解耦 RoPE 的 Key 部分；它不是简单地把 K/V 头数设为 1。

MQA、GQA、MLA 主要减少解码时 KV Cache 的占用和读写量，不会把标准全注意力的 $O(n^2)$ 计算变成线性。FlashAttention 是另一类优化，主要减少显存访问和中间存储。

---

## 4. 位置编码

### Q: RoPE (旋转位置编码) 的原理 ⭐⭐⭐

**核心思想**：通过旋转矩阵将位置信息编码到 Q、K 中，使得内积只依赖于**相对位置**。

**二维情况**：

$$f(q, m) = R_m q = \begin{pmatrix} \cos m\theta & -\sin m\theta \\ \sin m\theta & \cos m\theta \end{pmatrix} \begin{pmatrix} q_0 \\ q_1 \end{pmatrix}$$

**关键性质**：

$$\langle f(q, m), f(k, n) \rangle = q^T R_{n-m} k = g(q, k, n-m)$$

内积只依赖于相对位置 $n - m$。

**优势**：
- 相对位置编码，理论上可外推到更长序列
- 与线性注意力兼容
- 实现高效（逐元素乘法 + 旋转）

### Q: 各种位置编码对比

| 方法 | 类型 | 外推性 | 参数量 | 使用模型 |
|------|------|--------|--------|----------|
| Sinusoidal | 绝对 | 较差 | 0 | Transformer 原始 |
| Learned | 绝对 | 差 | $n \times d$ | GPT-2, BERT |
| ALiBi | 相对 | 好 | 0 | BLOOM |
| **RoPE** | **相对** | **较好** | **0** | **LLaMA, ChatGLM** |

---

## 5. LayerNorm & 归一化

### Q: LayerNorm vs BatchNorm 的区别

| 特性 | BatchNorm | LayerNorm |
|------|-----------|-----------|
| 归一化维度 | Batch 维度 | Feature 维度 |
| 依赖 batch size | ✅ 是 | ❌ 否 |
| 适用场景 | CV | NLP/Transformer |
| 推理时 | 需要 running stats | 直接计算 |

**LayerNorm 公式**：

$$\text{LN}(x) = \frac{x - \mu}{\sqrt{\sigma^2 + \epsilon}} \cdot \gamma + \beta$$

其中 $\mu, \sigma$ 在最后一个维度上计算。

### Q: Pre-Norm vs Post-Norm

- **Post-Norm**（原始 Transformer）：$\text{LN}(x + \text{SubLayer}(x))$
  - 理论上表达能力更强
  - 训练不稳定，需要 warmup

- **Pre-Norm**（GPT-2/LLaMA）：$x + \text{SubLayer}(\text{LN}(x))$
  - 训练更稳定
  - 梯度流更好（残差路径无变换）
  - 现代大模型首选

### Q: RMSNorm 是什么？

RMSNorm 是 LayerNorm 的简化版，去掉了均值中心化和偏移 $\beta$：

$$\text{RMSNorm}(x) = \frac{x}{\sqrt{\frac{1}{d}\sum_{i=1}^{d}x_i^2 + \epsilon}} \cdot \gamma$$

- 计算更高效
- LLaMA 系列使用

---

## 6. FFN 前馈网络

### Q: 标准 FFN vs SwiGLU

**标准 FFN**：

$$\text{FFN}(x) = \text{ReLU}(xW_1 + b_1)W_2 + b_2$$

**SwiGLU** (LLaMA/PaLM)：

$$\text{SwiGLU}(x) = (\text{Swish}(xW_1) \odot xW_3) W_2$$

其中 $\text{Swish}(x) = x \cdot \sigma(\beta x)$，GLU 门控机制提供了额外的非线性。

**SwiGLU 优势**：
- 实验表明在相同计算量下性能更好
- 门控机制让网络学会选择性激活
- 现代大模型的标准选择

### Q: FFN 中间维度为什么通常是 4d？

经验上 FFN 中间维度设为 $4 \times d_{model}$ 效果最好。使用 SwiGLU 时通常是 $\frac{8}{3} d_{model}$（参数量相当）。

---

## 7. Encoder vs Decoder

### Q: Encoder-Only / Decoder-Only / Encoder-Decoder 的区别

| 架构 | 注意力 | 代表模型 | 适用任务 |
|------|--------|----------|----------|
| Encoder-Only | 双向 | BERT, RoBERTa | 分类、NER、理解 |
| Decoder-Only | 单向（因果） | GPT, LLaMA, DeepSeek | 生成、对话 |
| Encoder-Decoder | 双向 + 因果 | T5, BART, mT5 | 翻译、摘要 |

### Q: 为什么现在的 LLM 都是 Decoder-Only？

1. **统一的 next-token prediction** 范式简单且强大
2. **Scaling law** 对 Decoder-Only 最友好
3. **GPT 系列验证了**仅 Decoder 就能做好几乎所有任务
4. **In-Context Learning** 在 Decoder 中涌现
5. **推理效率高**：KV Cache 天然适配因果注意力
6. **数据利用率**：每个 token 都是训练信号

### Q: Causal Mask（因果掩码）是什么？

在 Decoder 中，每个 token 只能看到自己和之前的 token，通过在注意力分数矩阵上加上三角掩码实现：

$$\text{Mask}_{ij} = \begin{cases} 0 & \text{if } i \geq j \\ -\infty & \text{if } i < j \end{cases}$$

加在 softmax 之前：$\text{softmax}\left(\frac{QK^T}{\sqrt{d_k}} + \text{Mask}\right)$
