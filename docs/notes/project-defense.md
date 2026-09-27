# 项目深挖

每个项目都用同一套结构准备，避免只讲功能列表。

## 项目卡片

1. 项目解决什么问题？
2. 我的具体职责是什么？
3. 一次正常请求经过哪些关键组件？
4. 最重要的技术选择是什么，为什么不用更简单的方案？
5. 最难处理的失败案例是什么？
6. 如何评测，指标能证明什么、不能证明什么？
7. 当前系统的边界是什么？
8. 如果继续迭代，优先改什么？

## Agentic RAG

重点：混合检索、重排、查询改写、证据治理、检索评测、请求隔离和回答质量边界。

## Deep Research

重点：任务编排、子 Agent 权限、证据链、预算控制、中断恢复、质量门禁和可观测性。

## Forge

重点：Agent Runtime、Harness、工具生命周期、状态持久化、长任务、流式事件和失败恢复。

## 边读边对照项目

- RAG：[分块策略](../materials/zero2agent/learn-agent-interview/09-rag-retrieval/index.md)、[检索与证据](../materials/llm-agent-interview-guide/04-RAG/01-RAG-Complete-Guide.md)。
- 多 Agent：[任务分工与状态合并](../materials/zero2agent/learn-agent-interview/06-multi-agent-collab/index.md)、[评测边界](../materials/zero2agent/learn-agent-basic/11-agent-evaluation/index.md)。
- Harness：[工具调用边界](../materials/zero2agent/learn-deepseek-harness/06-tool-pipeline/index.md)、[会话与压缩](../materials/zero2agent/learn-deepseek-harness/07-session-log/index.md)。

## 回答边界

统一使用“结论 → 证据 → 边界 → 改进方向”。无法从代码、测试或评测产物确认的能力，不包装成已经实现或上线的成果。

