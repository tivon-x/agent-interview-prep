> **我的项目｜Forge 的会话与上下文**
>
> - Forge 把会话条目追加到 JSONL；读取时只容忍崩溃造成的不完整末行，中间损坏仍报错。交互运行另有 LangGraph checkpoint，手动或自动压缩只改变后续模型使用的上下文。
> - 复习时区分“会话记录”“运行中 checkpoint”“压缩后的工作上下文”：它们服务于回放、恢复和窗口控制，不能只用一个 `messages` 数组概括。
>
> 继续读：[Forge 的会话、压缩与恢复](/notes/project-defense#forge)。
