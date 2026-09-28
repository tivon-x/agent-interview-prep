> **我的项目｜Agentic RAG 的检索**
>
> - 检索链路按“查询规划 → 向量与 BM25 召回 → 去重融合 → 重排 → 上下文打包”拆开，便于定位到底是没召回、排序错了，还是送给模型的证据不够。
> - 当前生产图仍用 `hybrid_only` 工具集和 `v1_flat_rerank`。按证据缺口选 `grep`、`read_file`、`semantic_search` 等六工具的 M9C 能力已实现，但不能说成生产默认或已有 M9D 效果结论。
>
> 继续读：[Agentic RAG 的完整流程与取舍](/notes/project-defense#agentic-rag)。
