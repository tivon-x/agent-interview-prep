> **我的项目｜Deep Research 的多 Agent 协作**
>
> - 中央编排器维护类型化 Task Board；Scoping、Research、Verification、Report 各交付不同产物。模型只提交任务与分工 ID，服务端从 Board 补齐目标、输入、输出和权限。
> - 并行 Worker 先预留 Assignment，再用 reducer 合并结果；旧 attempt、重复任务或越权路径会被拒绝。Worker 说“完成”还要经过产物校验和证据门禁。
>
> 继续读：[Deep Research 的任务分配与状态合并](/notes/project-defense#task-board-与任务权限)。
