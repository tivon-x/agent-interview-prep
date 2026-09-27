> **我的项目｜Agentic RAG 的分块**
>
> - 平面索引默认用递归字符切分：优先保留标题、段落，再按句子等边界细分，默认 512 字符、64 字符重叠；代码还提供按 token 和按句子切分的实现。分层索引另建 `document → section → paragraph` 树。
> - 面试时先说明“块要能被检索，也要保住上下文”，再说明选哪种索引要看文档结构和检索评测，不能把代码支持的策略说成全部已在默认路径启用。
>
> 代码依据：`agentic_rag/indexing/chunker.py`、`indexing/indexer.py`、`indexing/builders/hierarchical_index_builder.py`。
