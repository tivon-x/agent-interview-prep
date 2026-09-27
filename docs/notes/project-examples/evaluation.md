> **我的项目｜评测怎么分层**
>
> - Agentic RAG 分开评 routing、retrieval、answer；离线抽取兜底只用于冒烟检查，不能等同完整生成质量。M9C 的多工具选择仍缺 M9D 专项评测。
> - Deep Research 用确定性回归和报告门禁检查结构、引用与流程；readiness 分数是停止条件，不是事实正确率。真实 Provider 效果须另看正式评测产物。
>
> 依据：`agentic_rag/docs/eval_guide.md`、`agentic_rag/README.md`；`deep-research/PROJECT_GUIDE.md`、`src/evaluator.py`。
