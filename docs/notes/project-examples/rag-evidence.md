> **我的项目｜Agentic RAG 的证据边界**
>
> - `ls`、`glob`、`grep` 只负责发现内容；引用必须来自带规范元数据和原文 `quote_text` 的证据。最终回答保留 citation、confidence 和 limitations。
> - 每次新请求会重置证据、检索轨迹和回答状态，避免同一会话中的旧证据混进新答案。
>
> 继续读：[Agentic RAG 的证据与评测](/notes/project-defense#证据和失败处理)。
