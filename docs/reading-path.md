# 资料阅读路线

**顺序：读完站内收录的资料和个人笔记 → 闭卷做 360 道题 → 对照逐题解析。** 这里按知识依赖排列入口；进入每个专题后，按其目录把本地章节读完，再回到这里继续下一项。

> 本站保存的是精选快照，并未收录上游仓库的所有章节。快照里指向未收录章节的旧链接可能无法在本站打开；需要继续阅读时，可从[资料来源](sources.md)进入原站。

## 第一阶段：读资料

### 1. 大模型与 Agent 基础

1. [LLM 基础：Transformer、分词和优化](materials/llm-agent-interview-guide/01-Foundation/index.md)
2. [推理与部署](materials/llm-agent-interview-guide/02-Inference/index.md)
3. [微调与对齐](materials/llm-agent-interview-guide/03-FineTuning/index.md)
4. [Agent 基础：从概念到 Loop](materials/zero2agent/learn-agent-basic/index.md)
5. [JavaGuide AI 应用开发知识体系](materials/javaguide/docs/ai/README.md)：依次读[大模型基础](materials/javaguide/docs/ai/llm-basis/README.md)、[Agent](materials/javaguide/docs/ai/agent/README.md)等站内专题。

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
