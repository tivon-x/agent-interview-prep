> **我的项目｜工具调用的边界**
>
> - Forge 用 LangChain `BaseTool` 承载模型可见的名称、参数和执行；`ToolDefinition` 只补产品展示与提示信息，避免维护第二套工具 Schema。Agent 由 `create_agent` 和 middleware 组合。
> - Deep Research 更严格：模型只能给 Assignment ID，服务端重建任务契约并检查文件读写范围。模型选择工具或声称有权限，都不能代替运行时授权。
>
> 代码依据：`forge/src/forge_coding/tools/definition.py`、`src/forge_agent/langchain_runtime.py`；`deep-research/src/task_dispatch.py`、`PROJECT_GUIDE.md`。
