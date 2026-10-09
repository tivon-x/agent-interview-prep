# 资料阅读路线

<details class="document-method">
<summary>阅读顺序与快照说明</summary>

**顺序：读完站内收录的资料和个人笔记 → 闭卷做 360 道题 → 对照逐题解析。** 这里按知识依赖排列入口；进入每个专题后，按其目录把本地章节读完，再回到这里继续下一项。

> 本站保存的是精选快照，并未收录上游仓库的所有章节。快照里指向未收录章节的旧链接可能无法在本站打开；需要继续阅读时，可从[资料来源](sources.md)进入原站。

</details>

<section data-study-section="schedule">

## 2026 年国庆至 10 月 14 日：面试准备计划

这段时间以**深入理解技术资料**为主，兼顾考公。简历和项目不单独占用前期的大块时间：读到相关主题时，沿章节中的项目钩子回顾；10 月 12—13 日再集中口述、模拟和补漏。下方的完整阅读路线仍用于面试后的系统学习。

### 白天节奏

| 时间 | 安排 |
| --- | --- |
| 9:00—11:30 | 精读当天的技术主题，弄清原理、适用条件、取舍和失败情况 |
| 13:30—15:30 | 考公时间，自行按已有规划安排 |
| 15:45—17:00 | 合上资料复述、回查疑点；部分日期练个人 LeetCode 题库 |
| 晚上 | 休息，不补白天未完成的任务 |

每次只选一个主材料深入读，其他资料用于解决疑点。读完后合上资料回答：**它解决什么问题、为什么这样设计、什么情况下会失败**。遇到项目钩子时，用自己的经历检验理解。当天没讲清的主题顺延，后续主题相应后移，不为赶表格而略读。

### 每日技术主线

| 日期 | 深入学习的主题与入口 |
| --- | --- |
| 10 月 1 日 | [Transformer 与分词](materials/llm-agent-interview-guide/01-Foundation/index.md)，再看[推理与 KV Cache](materials/llm-agent-interview-guide/02-Inference/index.md)。重点讲清输入如何变成输出，以及推理阶段的主要开销。 |
| 10 月 2 日 | [Agent 基础](materials/zero2agent/learn-agent-basic/index.md)与 [Agent 完整指南](materials/llm-agent-interview-guide/05-Agent/index.md)：Agent、Workflow、循环、规划和停止条件。 |
| 10 月 3 日 | [架构选型](materials/zero2agent/learn-agent-interview/01-architecture-design/index.md)、[工具管理](materials/zero2agent/learn-agent-interview/02-tool-management/index.md)与[容错](materials/zero2agent/learn-agent-interview/03-fault-tolerance/index.md)。读到脚本生成或工具校验时，回想华为实习中的具体处理。 |
| 10 月 4 日 | [记忆与上下文](materials/zero2agent/learn-agent-interview/04-memory-context/index.md)、[多 Agent 协作](materials/zero2agent/learn-agent-interview/06-multi-agent-collab/index.md)：状态由谁维护、任务怎样分配、并发结果怎样合并。 |
| 10 月 5 日 | [RAG 完整指南](materials/llm-agent-interview-guide/04-RAG/index.md)前半：文档处理、切分、向量化与索引。结合 [RAG 分块实例](notes/project-examples/rag-chunking.md)检查理解。 |
| 10 月 6 日 | RAG 完整指南后半及[检索专题](materials/zero2agent/learn-agent-interview/09-rag-retrieval/index.md)：混合召回、重排、引用和坏答案归因。结合[检索实例](notes/project-examples/rag-retrieval.md)回顾。 |
| 10 月 7 日 | [评测](materials/zero2agent/learn-agent-interview/05-eval-and-vision/index.md)与[工程故障](materials/zero2agent/learn-agent-interview/07-engineering-pitfalls/index.md)：怎样定义成功、定位失败、控制成本与恢复。优先补前六天没有讲清的内容。 |
| 10 月 8—9 日 | 实习交接。白天工作，晚上休息；不安排正式复习。 |
| 10 月 10 日 | [Prompt 与 Skill](materials/zero2agent/learn-agent-interview/08-prompt-engineering/index.md)、[AI 代码与测试](materials/zero2agent/learn-agent-interview/11-ai-code-testing/index.md)。联系华为测试 Agent，讲清生成结果如何验证。 |
| 10 月 11 日 | [业务 AI 工程](materials/zero2agent/learn-agent-interview/12-business-ai-engineering/index.md)与[AI 系统设计](materials/llm-agent-interview-guide/09-SystemDesign/index.md)。用[后端检查表](notes/backend-checklist.md)补最明显的工程短板。 |
| 10 月 12 日 | 从[题库](byte-agent/question-bank.md)抽相关题闭卷作答，再对照[解析](byte-agent/analysis.md)回到原章节补漏；个人 LeetCode 题库选一道薄弱类型限时完成。这里是抽样检验，不是两天刷完 360 题。 |
| 10 月 13 日 | 集中复述华为实习、自我介绍和三个项目，做一次技术模拟；只修复暴露出的知识缺口，不学新专题。 |
| 10 月 14 日 | 面试前简短热身，停止高强度学习。 |

个人 LeetCode 练习可放在 10 月 3、6、10、12 日的最后一小时；其余日期用这段时间闭卷复述当天章节。考公只预留时间，不在本站规定题型或进度。

</section>

<section data-study-section="full">

## 第一阶段：读资料

<span id="_1-大模型与-agent-基础"></span>

### 1. 机器学习、深度学习与大模型基础

1. [机器学习基础](notes/ml-basics/index.md)：按六章阅读，重点补 LR、GMM/EM、XGBoost 和 MLE/MAP。
2. [深度学习基础](notes/dl-basics/index.md)：按六章阅读，重点把反向传播、优化器、CNN 变成可计算的知识。
3. [LLM 基础：Transformer、分词和优化](materials/llm-agent-interview-guide/01-Foundation/index.md)
4. [推理与部署](materials/llm-agent-interview-guide/02-Inference/index.md)
5. [微调与对齐](materials/llm-agent-interview-guide/03-FineTuning/index.md)
6. [Agent 基础：从概念到 Loop](materials/zero2agent/learn-agent-basic/index.md)
7. [JavaGuide AI 应用开发知识体系](materials/javaguide/docs/ai/README.md)：依次读[大模型基础](materials/javaguide/docs/ai/llm-basis/README.md)、[Agent](materials/javaguide/docs/ai/agent/README.md)等站内专题。

基础章节学完后，做 [ML/DL 笔试计算与编程专项](notes/ml-dl-practice/index.md)。先做 LR Batch GD 和 GMM M-step，再做 Softmax、反向传播和 CNN 尺寸计算。参考资料只按薄弱点补读，不要求通读外部课程。

### 2. RAG 与 Agent 工程

1. [LLM Guide：RAG](materials/llm-agent-interview-guide/04-RAG/index.md)和[Agent](materials/llm-agent-interview-guide/05-Agent/index.md)
2. [JavaGuide：RAG](materials/javaguide/docs/ai/rag/README.md)
3. [Agent 工程面试专题](materials/zero2agent/learn-agent-interview/index.md)：按其 17 个章节顺序阅读。
4. [DeepSeek Harness：运行时与工程边界](materials/zero2agent/learn-deepseek-harness/index.md)：按其 13 个章节顺序阅读。
5. [Hello Agents 补充章节](materials/hello-agents/Extra-Chapter/readme.md)：上下文、Skill、GUI Agent、实践踩坑等。

### 3. 评测、安全与系统设计

1. [LLM Guide：安全与评测](materials/llm-agent-interview-guide/06-Safety-Evaluation/index.md)、[前沿热点](materials/llm-agent-interview-guide/07-HotTopics/index.md)、[编码](materials/llm-agent-interview-guide/08-Coding/index.md)、[系统设计](materials/llm-agent-interview-guide/09-SystemDesign/index.md)
2. [JavaGuide：AI 系统设计](materials/javaguide/docs/ai/system-design/README.md)与[AI 面试专题](materials/javaguide/docs/ai/interview-questions/README.md)
3. [AI Agent 分类专题](materials/ai-agent-interview-guide/docs/01-面试八股文/README.md)：按基础、框架、RAG、工具、记忆、多智能体、大模型、工程化、Prompt 顺序阅读。
4. [公开面经与参考材料](materials/hello-agents/Extra-Chapter/Extra01-面试问题总结.md)、[LLM Guide 真题](materials/llm-agent-interview-guide/10-RealQuestions/index.md)

### 4. 后端与数据平台

1. [网络](materials/javaguide/docs/cs-basics/network/README.md)与[操作系统](materials/javaguide/docs/cs-basics/operating-system/README.md)
2. [MySQL](materials/javaguide/docs/database/mysql/README.md)、[Redis](materials/javaguide/docs/database/redis/README.md)、[消息队列](materials/javaguide/docs/high-performance/message-queue/README.md)
3. [分布式系统](materials/javaguide/docs/distributed-system/README.md)与[高可用](materials/javaguide/docs/high-availability/README.md)
4. [System Design Primer 中文版](materials/system-design-primer/README-zh-Hans.md)：先读方法，再读站内收录的案例。
5. [后端与数据平台检查表](notes/backend-checklist.md)：逐项对照已经读过的资料。

### 5. 个人补充与项目证据

1. [项目深挖](notes/project-defense.md)：把 Agentic RAG、Deep Research、Forge 的实现与边界整理成自己的话。
2. [前沿技术补充](notes/frontier.md)：核对需要补读的主题。
3. [资料来源与快照范围](sources.md)：确认哪些内容在本站，哪些需要回原站阅读。

## 第二阶段：360 题自测

完成上面的资料阅读后，进入 [360 题题库](byte-agent/question-bank.md) 闭卷回答。

## 第三阶段：对照解析

每答完一组，再打开[逐题解析](byte-agent/analysis.md)检查答案。临近面试时用[冲刺安排](byte-agent/review-plan.md)回看薄弱点。

</section>
