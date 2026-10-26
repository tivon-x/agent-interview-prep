---
title: Forge 项目源码导读与秋招面试指南
---

[← 返回 Forge 项目速览](/notes/project-defense#forge)

> 本页为项目仓库指南的完整收录，收录日期：2026-10-26。保留原文的版本、指标与实现边界；原文中的“当前”指指南编写时的状态。先读[项目深挖速览](/notes/project-defense#forge)，再在本页深入理解设计与源码。

这份指南既用来读懂 Forge 的源码，也用来准备秋招面试。讲项目时先说明它做了什么、为什么这样设计；面试官追问实现，再沿文中的代码和测试往下讲。

# Forge 项目源码导读与秋招面试指南

> 状态：持续维护
>
> 更新时间：2026-09-29
>
> 代码基线：当前 checkout 的 `0a0c05c fix(tools): accept numeric model arguments`
>
> 版本基线：`forge-ai 0.3.2`，Python `>=3.12`
>
> 事实源：当前源码、[README.md](https://github.com/tivon-x/forge/blob/0a0c05c/README.md)、[docs/architecture.md](https://github.com/tivon-x/forge/blob/0a0c05c/docs/architecture.md)、[pyproject.toml](https://github.com/tivon-x/forge/blob/0a0c05c/pyproject.toml)、测试和 CI。`docs/dev/` 与历史重构计划不作为当前实现依据。

## 0. 怎么用这份指南

这份指南不用从头背。可以按下面的顺序读：

1. 先看“30 秒介绍”和架构图，弄清三层代码各管什么。
2. 再顺着一次用户请求读源码：从[命令入口](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_cli/cli.py)到[会话管理](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/sessions/session.py)，再到[运行控制](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/harness.py)和[模型执行](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/langchain_runtime.py)。
3. 接着分别看工具安全、会话保存和人工控制，不必一开始钻进终端界面细节。
4. 最后用面试题练口述。先用大白话回答，再用文件和测试支撑；类名只在被追问实现时说。

### 30 秒项目介绍

Forge 是一个可切换模型服务商的命令行编程助手。用户提出任务后，它会让模型选择工具来读代码、改文件或运行命令，边执行边显示进度，并把对话和工具结果保存下来。用户可以取消、继续或恢复会话。

这个项目的难点是让这些动作在出错时仍然可控：工具调用要有对应结果，取消后不能留下半截记录，文件操作不能越过项目目录，恢复时也不能靠界面上残留的状态猜测。实现上，我把通用运行流程、编程工具与会话、终端界面分开；模型和工具之间的循环交给 LangChain，Forge 负责其余产品行为。

### 先记住的四个边界

- `forge_agent` 管模型运行、取消和事件，不知道项目文件怎么读，也不依赖界面或模型服务商的专用包。
- `forge_coding` 管编程任务需要的项目上下文、工具、模型配置和会话文件。
- `forge_cli` 管命令入口和终端界面，只展示运行结果，不另写一套执行逻辑。
- LangChain 负责“模型调用工具，再把结果交回模型”的循环。待办计划、长期目标和界面状态都不能反过来成为第二套模型执行流程。

## 1. 项目定位和整体架构

### 1.1 产品边界

Forge 面向本地代码仓库，能读写项目文件、执行用户明确要求的本地命令，并实时显示进度。会话保存在 `~/.forge/`。项目只有一个 Python 安装包，内含 `forge_agent`、`forge_coding`、`forge_cli` 三个代码包；安装名是 `forge-ai`，命令是 `forge`。

当前代码版本是 `0.3.2`，尚未以本项目名义发布到 PyPI；[PyPI 上同名的 `forge-ai 1.1.0`](https://pypi.org/project/forge-ai/) 属于另一个项目。安装或发布前需要核对仓库来源和版本，不能只看包名。实际调用模型需要用户自己的凭据。默认测试用模拟模型，不依赖网络。命令工具沿用当前操作系统的权限，不能把它当成隔离环境。

项目主要参考 Pi 的架构和交互方式，也参考 Tau 的 Python 工具、会话、模型配置和终端界面。它们是设计来源，不是 Forge 运行时还要安装的组件；当前代码中也没有 Tau 命令或第二套语言环境。

### 1.2 依赖方向

```text
用户
  │
  ├─ forge_cli.cli:app
  │       │  命令入口、对话显示、JSON、交互界面
  │       ▼
  ├─ forge_coding.sessions.CodingSession
  │       │  项目资料、工具、模型配置、会话文件
  │       ▼
  └─ forge_agent.AgentHarness
          │  对话记录、排队、取消、Forge 事件
          ▼
     LangChain create_agent + astream_events(v3)
          ├─ BaseChatModel
          └─ 原生 StructuredTool

LangChain v3 事件
          ▼
     Forge AgentEvent
       ├─ 普通文本 / 完整对话 / JSON / 交互界面
       └─ 逐行追加的会话记录
```

代码只能按 `forge_cli → forge_coding → forge_agent → LangChain` 的方向依赖。自动检查会扫描导入关系，防止底层代码反过来依赖界面、编程工具或某一家模型服务商。

### 1.3 组件职责速查

| 组件 | 解决的问题 | 主要入口 | 明确不负责什么 |
| --- | --- | --- | --- |
| 命令和界面层 `forge_cli` | 接收输入、显示进度 | [`cli.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_cli/cli.py) 的 `app`、`main` | 不执行模型与工具的循环，也不保存任务状态 |
| 编程会话 `CodingSession` | 把模型、工具和项目资料装配成一次会话 | [`sessions/session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/sessions/session.py) 的 `load`、`prompt`、`continue_` | 不直接绘制界面，不另造一套模型消息 |
| 运行控制 `AgentHarness` | 管运行、排队、取消和继续 | [`harness.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/harness.py) 的 `prompt`、`continue_` | 不知道项目目录和模型配置 |
| 模型执行 `run_langchain_agent` | 运行模型，并把执行过程转成 Forge 事件 | [`langchain_runtime.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/langchain_runtime.py) | 不负责保存完整会话 |
| 工具 | 告诉模型能做什么，并执行具体操作 | [`tools/base.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/base.py) | 不包含界面状态 |
| 会话文件 | 保存可恢复、可导出的消息和操作结果 | [`session/storage.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/session/storage.py) | 不偷偷充当模型的长期记忆 |

## 2. 一次请求是怎样跑完的

下面以交互式用户输入“读取某个文件并修复一个函数”为例。

### 2.1 启动和信任预检

1. 命令入口解析项目目录、是否恢复会话、资源信任方式、模型和显示方式等选项，对应 `forge_cli.cli:main`。
2. `CodingSession.load()` 准备会话和项目资料，先检查哪些资料允许读取。
3. 检查时先看文件位置等信息，再决定是否加载项目里的 `AGENTS.md`、技能、提示词和子代理配置。用户自己保存在 `~/.forge/`、`~/.agents/` 的资料仍按可信来源处理。
4. 无人值守的命令模式默认不加载项目资料；交互界面可以询问用户。是否信任资料不会改变文件工具的权限，也不会在运行中悄悄替换模型指令。

项目说明文件可能夹带恶意指令。先决定能否信任，再把内容交给模型，才能避免“为了判断是否可信，反而先读了不可信内容”。代码见[信任检查](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/resources/trust.py)、[资源发现](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/resources/discovery.py)和[模型指令组装](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/resources/system_prompt.py)。

### 2.2 `CodingSession.load()` 组装领域运行时

`CodingSession` 把一次编程会话需要的东西准备好，不亲自驱动模型反复调用工具。加载时会：

- 读取或创建逐行追加的会话文件，按当前分支还原消息。
- 读取模型配置，创建当前选中的模型，对应 `create_model_provider()`。
- 创建读写、搜索和命令等工具，对应 `create_coding_tool_set()`。
- 只在交互模式加入提问工具，再按配置加入待办计划、长期目标和子代理能力。
- 整理给模型的指令和项目资料，最后交给 `AgentHarness` 开始运行。

`_switch_lock` 和 `_run_active` 防止会话切换插进一次任务的中间。它们覆盖输入预处理、对话压缩、模型调用、上下文超限后的有限重试、保存记录和取消清理。这样切换到新会话时，旧会话不会还在后台写文件。

### 2.3 `AgentHarness.prompt()` 和运行所有权

`AgentHarness` 管对话记录、运行中追加的指导、排队的后续消息和取消信号。主要入口是：

- `prompt()`：开始一次新的用户回合。
- `continue_()`：当前回合结束后继续同一会话，例如长期目标自动继续。
- `respond_to_human_input()`：收到问卷答案后继续之前暂停的执行。
- `steer()`：给正在运行的任务补充指导。
- `follow_up()`：排队一条后续用户消息。

任务运行中再提交输入，默认会被拒绝。调用方必须明确选择“现在补充指导”或“排队等本轮结束”，对应 `streaming_behavior="steer"` 和 `"follow_up"`；系统不会替用户猜。取消、关闭或切换会话时，若模型已经发出工具调用但工具没来得及返回，运行控制层会补一条简短的错误结果，让对话记录仍能正常恢复。

### 2.4 模型怎样反复调用工具

每次任务都由 LangChain 的 `create_agent()` 负责“模型提出工具调用，工具返回结果，模型再决定下一步”。Forge 通过 `astream_events(version="v3")` 接收过程中的变化，不再自己实现一套同样的循环。

这条执行链外面还有几项约束：

1. 最外层的 `ToolCallBatchMiddleware` 检查一次模型回复中的工具调用。互不依赖的调用默认可并行；若其中有工具声明必须顺序执行，整批就按模型给出的次序运行。一个工具正常报错，不会阻止其他工具；调用编号或结果配对不合法时，系统返回有界错误。
2. 临时性的模型服务错误可以有限重试，不会无限尝试。
3. 长期目标、待办计划、人工问答和运行中补充指导按会话需要加入。
4. `ModelCallLimitMiddleware` 限制一次任务最多调用模型多少次。

模型消息、工具开始和结束等底层事件会先汇总成 Forge 自己的事件，再交给命令行、界面和会话保存逻辑。这样界面不用理解 LangChain 的内部事件格式；具体转换在 `_ProjectionState`。

### 2.5 工具调用和事件流

一次工具调用的过程是：

```text
模型发出工具调用（AIMessage）
  → 工具开始执行
  → 工具进度更新（可能没有）
  → 工具执行结束
  → 对应的工具结果（ToolMessage）
  → 模型根据结果决定下一步
```

文本逐字出现、模型开始或结束、工具执行、重试、待办更新、问卷和错误，都经过同一套 Forge 事件。不同显示方式只处理这些事件，不直接依赖 LangChain 的内部对象。

### 2.6 持久化和展示

会话在接收事件时，会分别保存两类内容：

- `MessageEntry` 保存用户和模型消息、工具调用、工具结果，以及必要的结构化附加信息。
- `CustomEntry` 保存待办、长期目标、子代理进展等只供产品展示和恢复使用的状态。

最后，普通文本、完整对话、机器可读 JSON 或交互界面各自显示这些事件。像 `/model` 这样的斜杠命令只改变会话或界面设置，不会伪装成用户消息交给模型。

## 3. `forge_agent`：不依赖具体编程工具的运行层

### 3.1 `langchain_runtime.py`

读[模型执行代码](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/langchain_runtime.py)时，可以重点看：

- `LangChainRuntimeState` 装着本次运行要用的模型、工具、取消状态，以及人工问答暂停时才需要的临时状态。
- `_agent_middleware()` 决定各项运行约束的顺序。
- `_ProjectionState` 把模型和工具的底层事件转成 Forge 对外提供的事件。
- `_NestedTaskProjection` 处理子代理事件，只留下父任务需要、且允许展示的摘要。
- `run_langchain_agent()` 启动执行并处理事件、中断和错误。

交互式问卷暂停时，`InMemorySaver` 暂存这一次执行的状态。回答、取消、关闭或切换会话后就释放它。它不能代替长期保存的会话文件，进程退出后也不能靠它恢复问卷。

### 3.2 `harness.py`

[运行控制代码](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/harness.py)负责管理一次任务的开始、继续和结束，不决定模型该调用什么工具。它保存：

- 对外可见的对话记录和消息角色约束。
- 运行中补充指导、后续消息和人工回答的队列。
- `SimpleCancellationToken` 和运行状态。
- 事件通知和错误处理。

命令行、交互界面和长期目标都用这套运行控制，不必各自处理模型执行细节。任务中断后，`_append_interrupted_tool_results()` 会为未返回的工具调用补结果，否则下次恢复时，模型消息里会有一项调用永远等不到回答。

### 3.3 `events.py`

[事件定义](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/events.py)列出了界面能收到的消息类型，例如任务开始和结束、逐步生成的文本、工具执行、待办变化、人工问答、重试和错误。长期目标的文字最多 4,000 字，状态只能是进行中、已暂停、受阻或完成。

执行层统一发出这些事件，界面就不必解析 LangChain 的原始数据。以后换界面，也不用改模型执行逻辑。

### 3.4 消息和会话文件

- [消息编码](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/message_codec.py)只保存能安全转成 JSON 的内容。遇到字节、循环引用或任意对象，会省略或放入固定占位，避免把对象的原始表示写进会话文件。
- [记录类型](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/session/entries.py)规定每条会话记录能是什么：消息、模型切换、对话压缩、分支信息、标签或产品状态。文件只追加，不直接改旧记录。
- [文件读写](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/session/storage.py)按字节处理最后一行写了一半的情况，下次追加前会修复它。读写放到后台线程，避免卡住界面；同一进程内写同一文件会排队，即使用户取消，也等当前写入完成再放开锁。跨进程写入不在这层协调。
- [会话恢复](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/session/memory.py)按当前分支的记录顺序还原消息，并处理对话压缩。它还原的是产品会话，不是给模型另建一份隐形记忆。

## 4. `forge_coding`：编程任务需要的工具和会话

### 4.1 原生工具体系

工具入口在[工具说明](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/definition.py)、[工具集合](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/tool_set.py)和[执行基础](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/base.py)。Forge 自己只补展示名称、使用提示等产品信息。模型看到的参数格式、工具说明和执行函数仍来自 LangChain 工具，避免维护两套互相矛盾的定义。

每个工具收到模型给出的参数后执行操作，再返回可读内容和必要的结构化附加信息。LangChain 把它写成与原调用对应的工具结果；工具出错也会形成结果，不会让模型的调用悬空。具体实现基于 `ForgeStructuredTool`。

模型偶尔会把行号等整数写成数字字符串。读取和搜索工具允许这种明确的转换，精确编辑工具也能把数字替换内容转成字符串；路径仍要严格校验，布尔值不能冒充整数。参数格式通过检查，不代表工具就能越过项目目录或操作系统权限。

默认工具有读取、写入、精确编辑、按文件名查找、按内容搜索、列目录和运行命令，分别对应 `read`、`write`、`edit`、`find`、`grep`、`ls`、`bash`。创建入口是 `create_coding_tools()`。

### 4.2 文件边界和并发

[路径检查](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/common.py)会同时看用户写下的路径和系统解析后的真实路径。只要目标跑到项目目录外，或借符号链接绕出去，就会拒绝；写入时也拒绝目标本身是符号链接。

读取、写入和编辑共用[同文件操作队列](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/file_operation_queue.py)：操作同一个真实文件时排队，不同文件可以同时处理。它覆盖同一进程中的多个会话，即使会话由不同事件循环运行；但管不到另一个进程，也管不到命令工具自行改文件。

精确编辑要求待替换内容只出现一次，多个替换区域不能重叠；还会保留原文件的换行和编码标记，并返回改动内容。写入工具可创建上级目录，读取工具可只读指定行、截断过长结果或读取图片。实现见[读取](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/read.py)、[写入](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/write.py)和[编辑](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/edit.py)。

### 4.3 搜索和运行命令

按文件名查找和按内容搜索优先使用 Forge 管理的 `fd`、`rg`。下载这些程序时会限定安全连接、版本和文件校验值，并检查解压路径；离线模式下不尝试下载，而是提示手动安装。列目录工具返回相对项目目录的路径。

命令工具能设置子进程的工作目录、限制运行时间，并在取消或输出过长时保留末尾诊断和字节数。但它仍沿用当前用户的操作系统权限，只控制工作目录不等于隔离命令。实现见[查文件](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/find.py)、[搜内容](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/grep.py)、[列目录](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/ls.py)和[运行命令](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/bash.py)。

### 4.4 切换模型服务商

[模型配置](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/providers/config.py)记录服务商、可选模型、上下文容量等信息，并检查用户配置。项目自带一份[模型列表](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/data/catalog.toml)，用户也可以在 `~/.forge/catalog.toml` 中补充模型。

[模型创建代码](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/providers/runtime.py)把不同服务商统一成 LangChain 的 `BaseChatModel`。各家的专用依赖在用到时才加载，底层运行层不必知道选的是哪一家。服务商在上下文容量、推理模式和工具调用上的差异仍由这一层处理，不能因为接口统一就假设行为相同。

### 4.5 项目资料和信任边界

项目说明、技能和子代理配置分别由[资源基础](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/resources/base.py)、[资源发现](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/resources/discovery.py)和[模型指令组装](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/resources/system_prompt.py)处理。子代理配置写在 `AGENT.md` 中，加载前会检查格式、路径、文件大小和可用工具范围。

是否信任项目资料，要结合本次命令、会话记录和用户保存的信任决定。保存决定时会防止并发写坏文件。`/reload` 只在任务空闲时重新加载资料，避免模型运行到一半，指令突然变化。

### 4.6 待办、人工问答、长期目标和子代理

这些能力都接在已有执行流程上，不另起一套模型循环：

- **待办计划**：[计划代码](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/features/planning.py)沿用 LangChain 的官方组件。Forge 只检查并保存完整列表，再通知界面更新，不另写一套计划器。
- **人工问答**：[问答代码](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/features/human_input.py)让模型提出结构化问题，暂停当前执行；用户回答后用 `Command(resume=...)` 继续同一次执行，并补上对应的工具结果。
- **长期目标**：[目标代码](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/features/goals.py)保存任务是进行中、暂停、受阻还是完成。模型只有在目标进行中才能调用完成或受阻工具；自动继续最多 25 次，连续 3 次看不到进展就停下。目标状态会写入会话文件，但不伪装成模型对话。
- **子代理**：[委派代码](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/features/subagents.py)提供 `task(agent, instruction)`。侦察和审查角色只读，执行角色处理边界明确的修改。每次委派都新建独立执行，不能再递归委派，也不能继承人工问答的临时状态。

## 5. `forge_cli`：命令和终端界面

### 5.1 CLI 入口

[命令入口](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_cli/cli.py)负责选模型、初始化配置、列出或导出会话、处理信任决定，以及选择恢复还是新建会话。启动参数也决定显示普通文本、JSON，还是打开交互界面；模型和工具仍由编程会话层准备。

命令行入口在 [`pyproject.toml`](https://github.com/tivon-x/forge/blob/0a0c05c/pyproject.toml)：

```toml
forge = "forge_cli.cli:app"
```

`forge_cli.__init__` 不提前加载交互界面依赖，因此只打印结果的命令无需初始化整套界面。

### 5.2 三种输出

- [普通文本](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_cli/rendering/plain.py)：适合一次性命令，输出回答、工具摘要、目标状态和错误。
- [完整对话](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_cli/rendering/transcript.py)：适合在终端里查看整个交互过程。
- [JSON](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_cli/rendering/json.py)：适合脚本读取每一步结果。

这几种显示方式共用工具结果的格式化规则。格式化代码不保存界面组件或执行状态，所以恢复会话后也能显示同样的工具行。

### 5.3 Textual TUI

[界面入口](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_cli/tui/app.py)接收会话事件并决定更新哪一块；`state.py` 保存展示状态，`widgets.py`、`screens.py` 等负责具体画面。界面不直接读取模型执行图。

模型连续吐出文字时，界面大约每 16 毫秒合并刷新一次，不必每来一个字符就重画。遇到工具结果等其他事件，会先显示积压的文字，保证画面顺序正确。首轮会话标题在回答结束后后台生成，不拖慢回答。

待办面板在输入框上方。空间不足时，先隐藏以前完成的任务，再截断未完成项；刚完成的项目保留到下一次提问，`/todos` 能看完整列表。问卷支持键盘切题、自填答案和取消；模型给出的文字按原样显示，不把它当界面标记解析。取消后也不会留下没有结果的工具调用。

以 `/` 开头的命令在[命令注册](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/commands/registry.py)和[默认命令](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/commands/default_registry.py)中定义。它们用于切换模型、查看待办、管理目标和会话分支，不会被当成用户提问交给模型。

## 6. 状态、持久化和恢复

### 6.1 会话文件保存哪些事实

Forge 把每次消息和状态变化追加到 JSONL 文件，每行是一条记录。这样可以检查、导出和恢复，也能保留工具调用及其结果。当前会话的消息是从这些记录按顺序还原的，不是界面里另存的一份副本。

记录之间有分支关系。`/clone` 复制当前分支，`/fork` 从历史上的一次用户提问前分出新会话，`/import` 先检查并复制外部会话，成功后才切过去。这些操作不会覆盖原会话。

### 6.2 对话太长时怎么压缩

当对话快超过模型能接收的长度时，会话层可以让模型总结早期内容，再用摘要代替一部分旧消息。原始记录和压缩记录仍留在文件中，方便检查。分支会话也会用摘要说明分叉前发生了什么，之后继续按该分支还原消息。

摘要、分支摘要和自动起标题都可能单独调用模型，并共用有限重试规则。这些辅助调用不算新的用户任务，也不会额外生成一条界面上的对话。

### 6.3 人工问答暂停后怎么继续

模型提出问卷后，当前执行需要暂时停住，等用户回答再从原处继续。Forge 为这份问卷留一份独立的内存状态，回答、取消、关闭或切换会话时就释放。会话文件保存的是可见消息和状态变化；进程退出后，不能只靠这份临时内存恢复未回答的问卷。

### 6.4 子代理的进展能看到多少

父会话仍只保存与用户的对话。子代理的原始工具参数、结果、路径、命令、思考内容和内部调用编号不会直接进入父模型的下一轮上下文。界面可以显示经过筛选、长度受限的进展记录，保存在 `forge.subagent_trace` 中；恢复模型对话或压缩上下文时会跳过它。

### 6.5 取消、关闭和切换

取消不能只让界面停止显示。运行控制层还要停止模型输出和子进程，处理错误，给已发出但没完成的工具调用补结果，再保存当前会话。`_switch_lock` 与 `_run_active` 保证旧会话清理完成后，新会话才能接管界面。

### 6.6 六条源码实战路线

六条路线都按“从哪里进、状态怎么变、怎样证明没有出错”来读。`sessions/session.py` 很长，不必从第一行顺读到最后一行；先跟一件事，再补旁边的辅助代码。

#### 路线一：一次提问怎样执行并保存

- **入口和调用链**：从 `CodingSession.prompt()` 进入 `_run_prompt_turn()`，调用 `AgentHarness.prompt()`，再到 `run_langchain_agent()`、`astream_events(v3)`、`_consume_harness_events()` 和 `_persist_messages_since()`。
- **要跟的状态**：任务是否正在运行、对话记录、哪些消息已保存、当前分支指向哪条记录，对应 `_run_active`、`persisted_count`、`_last_parent_id`。
- **要验证的事**：一次提问只有一个运行过程；模型发出的每个工具调用都有结果；消息不会重复保存，界面也不充当唯一记录。
- **精确测试**：[`test_coding_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_session.py) 的 `test_prompt_persists_user_assistant_and_leaf_entries`、`test_tool_results_are_persisted`，以及 [`test_agent_harness.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_agent_harness.py) 的 `test_prompt_appends_user_message_and_assistant_response`。
- **读完应能回答**：画出用户消息、模型调用、工具结果、会话文件和界面事件的顺序；如果界面崩了，哪些事实已经保存？

#### 路线二：模型一次调用多个工具，出错怎么办

- **入口和调用链**：从 `ToolCallBatchMiddleware.awrap_tool_call()` 看怎样决定并行或顺序执行，再看 `ForgeStructuredTool` 如何把工具异常变成模型能收到的错误结果。
- **要跟的状态**：本批工具的调用编号、是否有工具要求顺序执行，以及每条结果是否仍对应原调用。
- **要验证的事**：默认可并行，一个工具报错不影响其他工具；有工具要求顺序执行时，整批按模型给出的次序运行。编号重复、结果配错或任务取消都必须安全收口。后一步依赖前一步结果时，要等模型下一轮再决定，不能赌同批调用顺序。
- **精确测试**：[`test_tool_execution_middleware.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_tool_execution_middleware.py) 的 `test_create_agent_with_middleware_keeps_native_tool_parallelism`、`test_sequential_tool_metadata_serializes_the_complete_batch`、`test_sequential_tool_error_does_not_skip_later_handlers`、`test_duplicate_model_call_ids_fail_closed` 和 `test_cancellation_releases_lock_and_aborts_batch`。
- **读完应能回答**：并行批次、顺序批次和非法批次分别会发生什么？为什么“按顺序执行”仍不能代替“先看结果再决定”？

#### 路线三：取消或切换会话时怎样收尾

- **入口和调用链**：从 `CodingSession.prompt(streaming_behavior=...)`、`cancel()`、`new_session()`、`resume()` 进入 `_switch_lock` 和 `_run_active`，再跟到 `AgentHarness._run()`、`request_cancel()`、`_append_interrupted_tool_results()`。
- **要跟的状态**：任务是空闲、运行中、等待人工回答，还是正在取消；新的用户输入是立即补充还是等本轮结束。
- **要验证的事**：运行中默认拒绝重复提交；只有明确选择补充指导或排队，输入才会进入对应队列。切换会话要等旧任务清理完，取消后不能留下没有结果的工具调用。
- **精确测试**：[`test_coding_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_session.py) 的 `test_new_session_and_resume_rejected_while_running`、`test_prompt_queues_steering_while_session_is_running`，以及 [`test_agent_harness.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_agent_harness.py) 的 `test_cancelled_tool_run_repairs_transcript_before_next_prompt`。
- **读完应能回答**：分别在空闲、运行中、等待回答、取消清理时，用户能做什么，系统会拒绝什么？

#### 路线四：怎样从会话文件恢复对话

- **入口和调用链**：从 `JsonlSessionStorage.read_all()`、`append()` 到 `SessionState.from_entries()`，再看 `CodingSession.load()` 怎样恢复分支和压缩后的对话；同时看 `message_codec` 怎样安全保存工具附加信息。
- **要跟的状态**：每条记录的前一条是谁、当前分支停在哪、哪些旧消息已被摘要替代，对应 `context_entry_ids`、`compaction_entries` 等字段。
- **要验证的事**：文件最后一行写了一半可以丢弃，中间损坏必须报错；恢复只读取当前分支；摘要替换的是指定的旧消息。工具返回奇怪对象也不能写坏会话文件。读写不能卡住界面，取消写入也不能提前放开同文件的锁。
- **精确测试**：[`test_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_session.py) 的 `test_session_state_can_replay_one_branch`、`test_session_state_replays_compaction_on_active_branch`、`test_read_all_ignores_torn_tail_line`、`test_jsonl_storage_append_does_not_block_event_loop`、`test_cancelled_jsonl_append_keeps_writes_serialized`、`test_jsonl_storage_instances_serialize_same_path`、`test_jsonl_storage_read_does_not_block_event_loop`，以及 [`test_coding_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_session.py) 的 `test_session_compact_persists_summary_and_rebuilds_context`。
- **读完应能回答**：用根记录、两条分支、一次对话压缩和一条界面状态记录，说明恢复后哪些内容会交给模型，哪些只供显示或检查。

#### 路线五：人工回答和长期目标如何改变任务状态

- **入口和调用链**：HITL 从 `create_human_input_middleware()`、`run_langchain_agent()` 的 interrupt 到 `AgentHarness.respond_to_human_input()`；Goal 从 `GoalController`、`_persist_goal_update()` 到 `_run_goal_continuations()`。
- **要跟的状态**：问卷是否待回答、暂存的执行位置；目标是否进行中、已暂停、受阻或完成，以及已经自动继续几次。
- **要验证的事**：回答、取消和关闭都要给原工具调用一个结果；长期目标只能由明确的完成工具标记完成，连续无进展或明确报告受阻才能停为受阻。恢复会话时先暂停目标，不自动继续调用模型。
- **精确测试**：[`test_todo_and_human_input.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_todo_and_human_input.py) 的 `test_human_input_interrupt_resumes_with_paired_tool_message`、`test_noninteractive_session_does_not_register_ask_tool`，以及 [`test_goal_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_goal_session.py) 的 `test_restored_active_goal_is_paused_until_explicit_resume`、`test_goal_automatic_limit_is_enforced_after_25_continuations`、`test_no_progress_at_automatic_limit_keeps_blocked_terminal_state`。
- **读完应能回答**：分别画出问卷和长期目标的状态变化，标明是用户、模型还是系统触发，以及哪一步会保存。

#### 路线六：子代理能做什么，父任务能看到什么

- **入口和调用链**：从 `create_task_tool_definition()` 进入 `SubagentRunner`，看子代理怎样新建一次执行，再看它的进展如何经过筛选后写入父会话。
- **要跟的状态**：父任务的调用编号、子代理角色与可用工具范围、每个子代理自己的运行状态，以及返回给父任务的进展摘要。
- **要验证的事**：子代理不能再委派子代理，也不继承人工问答的临时状态；角色配置只能缩小可用工具范围。原始消息、工具参数、文件路径和模型服务信息不直接进入父模型上下文。进展筛选失败时宁可不显示，也不能泄露原始内容。
- **精确测试**：[`test_subagents.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_subagents.py) 的 `test_runner_uses_fresh_instruction_and_returns_artifact`、`test_trace_projection_drops_thinking_raw_arguments_and_results`、`test_runner_allows_concurrent_child_calls`、`test_runner_rejects_invalid_input_with_tool_exception`。
- **读完应能回答**：画出父任务、委派工具、子代理、进展摘要和最终工具结果，标明哪些内容会返回，哪些必须留在子代理内部。

六条路线读完，应该能独立回答三件事：一次行为从哪个入口开始，状态在哪里改变，哪个测试能证明边界没有被破坏。做不到时，回到对应路线，不要继续横向读更多模块。

## 7. 关键设计决策和取舍

| 决策 | 为什么这样做 | 得到什么 | 付出的代价或边界 |
| --- | --- | --- | --- |
| 复用 LangChain 的模型工具循环 | 已有组件能处理模型与工具的往返 | 不必再维护第二套执行逻辑 | 升级依赖时要检查事件格式是否变化 |
| 把运行、编程能力和界面分开 | 三部分改动原因不同 | 界面和模型服务商的变化不直接影响底层 | 跨层传信息要有清楚的接口 |
| 模型与工具直接用 LangChain 类型 | 模型看到的参数格式与真正执行的格式应一致 | 避免两份工具定义互相矛盾 | Forge 的展示信息仍需单独保存 |
| 对外只发 Forge 事件 | 界面不必解析 LangChain 内部消息 | 文本、JSON 和交互界面能共用执行结果 | 新事件要同步更新转换和显示代码 |
| 用逐行追加的会话文件保存事实 | 对话要能检查、导出和分支恢复 | 出错后能查到发生了什么 | 要处理写了一半的最后一行和旧格式兼容 |
| 工具默认并行，必要时整批顺序执行 | 独立调用不用互相等待，人工问答等工具又需要顺序 | 普通错误各自返回，非法调用得到有界错误 | 同批调用不能依赖前一步结果；顺序批次会更慢 |
| 同一文件的操作排队 | 多个会话可能同时修改同一文件 | 减少本进程内的读写冲突 | 管不到另一个进程，也管不到命令工具 |
| 问卷只暂存当前执行位置 | 用户回答后要从原处继续 | 长期会话文件和短暂执行状态各管一件事 | 进程崩溃时无法仅靠内存恢复问卷 |
| 待办计划与长期目标分开 | 模型可修改计划，任务何时停止还需系统控制 | 可以单独暂停、完成和报告受阻 | 需要分别保存两种状态 |
| 子代理通过工具委派 | 父会话仍保留唯一的用户对话 | 子代理能限权、并行处理和返回摘要 | 不会自动继承父任务的全部上下文 |
| 先决定是否信任项目资料 | 项目文件可能夹带恶意指令 | 不可信内容不会先进入模型指令 | 交互启动时可能多一次确认 |

面试时可以挑一两项讲透：当时碰到什么问题，改动把哪件事交给谁负责，换来了什么，还有什么没解决。例如顺序执行能保证调用次序，却会让整批工具变慢；问卷暂存在内存里，进程崩溃时就无法从原处恢复。

## 8. 场景推演：从代码到行为

### 场景 A：普通读文件

1. 用户在终端界面提出问题。
2. 会话层标记这次任务正在运行，并把用户消息交给运行控制层。
3. 模型决定调用 `read` 读取文件。
4. 执行层检查调用编号，`read` 再检查文件路径是否留在项目目录内。
5. 工具返回内容，模型收到对应结果，界面收到“工具已完成”的事件。
6. 会话保存模型消息和工具结果；模型可以继续，或给出最终回答。

可读代码：[`sessions/session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/sessions/session.py)、[`tools/read.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/read.py)、[`langchain_runtime.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/langchain_runtime.py)。

### 场景 B：同批工具有依赖，第一个调用失败

假设模型一次提出三个调用：写文件 A、继续编辑 A、读取文件 B。普通工具默认可能并行。写 A 失败不会自动阻止另外两项，但每项都会有自己的结果。同文件操作队列只防止 A 被同时读写，不会替模型判断“编辑 A 必须等写 A 成功”；读 B 更不会等写 A。因此有依赖时应分成两轮，让模型先看到写入结果，再决定是否编辑。

少数工具会声明整批按模型给出的次序执行，但即使前一个工具报错，后面的普通调用仍会继续。调用编号或结果配对不合法时会返回受限的错误信息；取消则中止当前批次。顺序执行保证的是先后次序，不保证前一步成功，也不能替代“看到结果再决定”。

### 场景 C：用户按 Esc 取消

用户按 Esc 后，取消信号会传到模型和正在运行的命令。运行控制层检查哪些工具调用还没返回，为它们补上简短的错误结果；会话层保存收尾状态，界面显示取消。下次提问不会继承一条只调用了工具、却没有工具结果的半截消息。

### 场景 D：对话长到模型放不下

1. 模型服务商返回“输入过长”的错误。
2. 会话层先确认真是长度问题，不能把认证、配额或用户取消误判成输入过长。
3. 如果允许压缩，就让模型总结早期对话，并把摘要记录写入会话文件。
4. 同一次任务在限定次数内重试。
5. 摘要或重试失败时，保留原有记录并报告错误，不假装任务已经完成。

### 场景 E：模型需要问用户

模型调用 `ask_user_question` 后，当前执行暂停，终端界面显示问卷。用户可以切题、自填答案或取消。回答通过 `Command(resume=...)` 送回原来的执行过程，并生成对应工具结果。取消或关闭会话时也要为这次提问收尾，不能只关掉问卷窗口。

### 场景 F：长期目标自动继续

用户用 `/goal` 设定目标后，会话保存目标状态。模型做完一轮，如果没有明确调用 `goal_complete`，待办全打勾也不能算目标完成。目标仍在进行时，系统最多自动继续 25 次；连续 3 次看不到进展就标记受阻。重新打开会话时，目标先暂停，只有用户明确恢复才继续调用模型。

### 场景 G：委派子代理

父模型通过 `task` 工具把一个明确的小任务交给子代理。子代理只能用当前会话允许、且自己角色允许的工具，不能继续委派。父会话只保存委派请求、经过筛选的进展和最终结果；子代理的原始工作过程不会整段塞进父模型的下一轮上下文。

### 场景 H：恢复、分支和拒绝项目资料

- **恢复**：从会话文件的当前分支还原消息、待办和长期目标。
- **分支**：从历史上的一次提问前复制会话，预填那次问题，但不会自动发送。
- **拒绝项目资料**：不加载项目内的说明和技能；用户自己的可信资料仍按原规则处理，文件工具权限也不会扩大。

会话能恢复的是保存下来的消息和用户选择，不是某个看不见的“模型记忆快照”。

## 9. 测试怎么读，哪些地方仍有限制

### 9.1 测试地图

先看[分层约束](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_architecture.py)和[安装入口](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_package_metadata.py)的检查，再按行为找对应测试：

| 行为 | 测试入口 |
| --- | --- |
| 模型事件转换、取消、错误 | [`test_langchain_runtime.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_langchain_runtime.py) |
| 工具批次并发、顺序声明、错误配对 | [`test_tool_execution_middleware.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_tool_execution_middleware.py) |
| 运行控制、人工回答、工具结果配对 | [`test_agent_harness.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_agent_harness.py) |
| 会话切换、恢复、对话压缩、长期目标 | [`test_coding_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_session.py)、[`test_goal_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_goal_session.py) |
| 文件工具、路径边界、同文件操作队列 | [`test_coding_tools.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_tools.py)、[`test_file_operation_queue.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_file_operation_queue.py) |
| 会话恢复、并发读写、分支、导出 | [`test_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_session.py)、[`test_session_export.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_session_export.py) |
| 模型配置和服务商接入 | [`test_provider_config.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_provider_config.py)、[`test_provider_runtime.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_provider_runtime.py) |
| 待办、问卷、终端界面、子代理、资源信任 | [`test_todo_and_human_input.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_todo_and_human_input.py)、[`test_goal_tui.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_goal_tui.py)、[`test_tui_app.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_tui_app.py)、[`test_subagents.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_subagents.py)、[`test_trust.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_trust.py)、[`test_cli.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_cli.py) |

默认测试用模拟模型和临时目录，不调用真实服务。它们主要检查执行顺序、恢复、错误处理、路径拒绝和消息配对，不能证明模型回答的质量。

### 9.2 面试中主动承认的限制

- 命令工具不是隔离环境。执行不可信代码需要容器或轻量虚拟机，还要限制资源、网络和权限。
- 同文件队列只覆盖当前进程；多个 Forge 进程改同一文件时，还需要跨进程协调。
- 问卷暂停位置只存在内存中，进程崩溃后不能单靠会话文件恢复未回答的问卷。
- 不同模型服务商仍可能在上下文容量、推理方式和工具调用上表现不同，统一接口消除不了这些差异。
- 子代理的工具清单只能缩小它能调用的工具，不能代替操作系统隔离；命令工具仍沿用当前用户权限。
- 离线模拟测试不能代替真实模型、下载、不同终端尺寸和跨平台命令的验证；提到这些结果时要说明实际验证环境。
- 本项目 `0.3.2` 尚未以本项目名义发布到 PyPI；同名包属于另一个项目，不能从包名推断来源。

## 10. 秋招面试回答方法

回答先让面试官听懂问题和选择，再给代码证据。可以按这几个层次准备，不必每题机械地说满：

1. **先说结论**：用户遇到什么问题，我选择怎么处理。
2. **再讲过程**：一次请求进来后，谁先做什么，失败又怎么收尾。
3. **有证据再给证据**：面试官追问实现时，指出代码入口和对应测试。
4. **讲清取舍**：为什么没有选另一条路，当前方案付出了什么代价。
5. **承认边界**：哪些情况没有解决，哪些只是离线测试验证过。
6. **再谈迁移**：换成一般编程助手或多人云服务时，哪些做法能复用，哪些要重做。

下面的短答尽量能直接说出口。类名和测试名放在证据段，不必在开场一口气报给面试官。

### 10.1 个人项目证据：把开发历史变成可核查的经历

下面的素材来自本项目提交历史和当前测试。提交记录能证明项目怎么演进，不能证明每一行代码都由同一个人独立完成。面试时只把自己确实参与的部分说成“我做的”；协作完成的部分要讲清自己的工作范围。

表中的提交编号来自当前代码库。早期文件可能已被移动，阅读时以右侧的当前源码为准。`docs/pi-autoresearch-integration-plan.md` 是开发计划，不算已交付功能。

| 主题 | 开发历史证据 | 可以怎样讲 | 继续追问时给出的证据 |
| --- | --- | --- | --- |
| 从旧执行方式迁到 LangChain | `8ef896f` 重建 Python 项目；`cb85838` 接入模型消息和事件流；`9990041` 接入模型；`c057aed` 接入工具；`cc7ef3c` 删除旧协议 | “改的不只是接口名称。模型消息、工具执行和过程事件都换到同一套机制后，旧的执行循环才被删掉，避免两边同时维护。” | [模型执行](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/langchain_runtime.py)、[分层检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_architecture.py)、[模型接入检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_provider_runtime.py) |
| 把终端界面单独拆出 | `30bb690` 把命令入口、结果显示和交互界面移入 `forge_cli` | “界面怎么显示，和模型怎么执行，是两类改动。拆开后，底层运行逻辑不必加载界面或某一家模型的专用依赖。” | [架构说明](https://github.com/tivon-x/forge/blob/0a0c05c/docs/architecture.md)、[安装检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_package_metadata.py)、[分层检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_architecture.py) |
| 失败后仍能恢复 | `ff9bd58` 增加临时错误重试；`7b8c008` 压缩长对话；`91c37ed` 保存压缩记录 | “重试之前先分清错误；对话太长时只在允许的情况下压缩。即使最后失败，会话记录也要保持可恢复，不能只在成功路径上看起来正常。” | [会话代码](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/sessions/session.py)、[会话检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_session.py) |
| 工具能用，也不能越界 | `5d823e0` 修复凭据泄露；`c11aef0` 加入文件搜索；`bbfb285` 增加项目信任检查；`7fd28c9` 修复 Windows 命令行为 | “文件路径、项目说明、凭据和命令权限要分别处理。路径检查能拦住工具读写项目外的文件，但命令工具仍沿用当前用户权限，不是隔离环境。” | [路径检查](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/common.py)、[资源信任](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/resources/trust.py)、[工具检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_tools.py)、[信任检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_trust.py) |
| 调整工具执行顺序和参数检查 | `e41a1cc` 改为默认并行、必要时整批顺序执行；`0a0c05c` 接受部分明确的数字参数转换 | “独立工具可以一起运行；人工问答和目标控制等工具明确要求顺序。一个普通工具失败不会拖停其他工具。数字字符串可以转成行号，但路径和权限不能跟着放宽。” | [批次调度](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/tool_execution.py)、[调度检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_tool_execution_middleware.py)、[参数检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_tools.py) |
| 减少等待和界面卡顿 | `466d205` 合并界面上的文字增量，自动起标题移出回答过程；`78f4606` 把会话文件读写移出事件循环 | “文字不用每来一个字符就重画，保存文件也不能卡住界面。用户取消写入时，仍要等当前写入结束，避免下一次写入抢进来。” | [终端界面](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_cli/tui/app.py)、[会话文件](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/session/storage.py)、[界面检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_tui_app.py)、[文件检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_session.py) |
| 分开待办、问答和长期目标 | `dd2eac6` 加入待办与人工问答；`1c17e86` 加入长期目标 | “待办可以由模型修改，人工问答暂停当前执行，长期目标由会话决定何时继续或停止。三者不能塞进同一个状态里，否则恢复时很难分清谁有权改变它。” | [待办](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/features/planning.py)、[问答](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/features/human_input.py)、[目标](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/features/goals.py)、[目标检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_goal_session.py) |
| 子代理只返回必要结果 | `b5abc7d` 加入委派；`f8d9cd4` 加入角色配置和可查看的进展 | “父会话仍保留唯一的用户对话。子代理只能用被允许的工具，父模型收到的是筛选后的进展和结果，不会把子代理内部的所有消息照单全收。” | [子代理](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/subagents.py)、[相关检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_subagents.py)、[架构说明](https://github.com/tivon-x/forge/blob/0a0c05c/docs/architecture.md) |
| 会话能分支和导入 | `b4dd7d2` 加入分支、复制、导入；`d1d8c45` 改进模型服务错误提示；`0c73154` 对齐项目说明 | “模型能回答还不够。用户需要从旧会话继续、试另一条分支，服务商出错时也需要知道下一步，而不是看到一段可能泄露细节的原始错误。” | [会话命令](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/commands/default_registry.py)、[导入](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/sessions/importing.py)、[导入检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_session_import.py)、[错误提示检查](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_provider_error_guidance.py) |

这些提交能串出项目演进：先统一模型和工具的执行方式，再拆开界面；随后补会话恢复、错误处理和工具安全，最后加入人工控制、长期目标和子代理。面试时挑自己参与且能讲清的两三段，每段准备一个提交、一个当前文件和一个具体检查即可。

## 11. 项目题库

### 11.1 十二张核心面试卡

每题先用两三句回答，再准备代码证据和可能的追问。面试官通常会沿一个细节继续问，不必一次讲完所有名词。

### Q1：为什么拆成 `forge_agent`、`forge_coding`、`forge_cli` 三层？

**30 秒结论：** 我把模型运行、编程工具与会话、终端界面分成三层。这样改界面时不用碰模型执行，换模型服务商时也不用改界面。

**2 分钟机制：** 最底层只管一次任务怎样运行、取消和发出事件；中间层准备项目目录、模型、工具和会话文件；最上层接收用户输入并显示结果。代码只能从上往下依赖，自动检查会拦住底层反过来引用界面或模型服务商专用包。

**源码和测试证据：** 看 [`docs/architecture.md`](https://github.com/tivon-x/forge/blob/0a0c05c/docs/architecture.md)、[`test_architecture.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_architecture.py) 和 [`test_package_metadata.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_package_metadata.py)。Git 中的 [`30bb690`](https://github.com/tivon-x/forge/commit/30bb690) 记录了 `forge_cli` 拆包，当前入口在 [`cli.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_cli/cli.py)。

**连续追问：** ① 只做演示也要拆三层吗？不必；Forge 已经有多种显示方式和可恢复会话，拆开才值得。② 两层都需要同一状态怎么办？明确它属于谁，通过公开接口传递，不共享内部对象。

**没选的方案：** 只在一个代码包里分目录。起步更快，但界面或某家模型的依赖容易进入底层，单靠人工审查不容易一直守住。

**限制和泛化：** 三层仍在同一进程，不是安全隔离。类似项目可以按“执行、具体业务、界面”划分，但一次性脚本不必照搬。

### Q2：为什么不自己写模型和工具的执行循环？

**30 秒结论：** LangChain 已经能完成“模型选工具、工具返回、模型继续”的循环。我复用它，Forge 只负责取消、排队、保存和展示，避免同时维护两套执行逻辑。

**2 分钟机制：** 每次任务启动时，Forge 创建 LangChain 的执行过程，持续读取模型消息和工具事件，再转换成自己的事件供界面显示和会话保存。真正执行工具的只有 LangChain，Forge 不再自行解析一遍模型提出的工具调用。

**源码和测试证据：** [`langchain_runtime.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/langchain_runtime.py) 的 `run_langchain_agent()`、[`test_langchain_runtime.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_langchain_runtime.py) 和架构测试中对 `create_agent`、`astream_events` 的约束。

**连续追问：** ① 依赖升级后事件格式变了怎么办？只改事件转换层，并用模拟事件检查对外格式。② 为什么不自己搭一张执行图？当前需求已有现成循环，另搭一套只会增加状态和错误处理；真有官方循环做不到的编排再考虑。

**没选的方案：** 自己写“调用模型、执行工具、再调用模型”的循环。除了正常流程，还要补逐步显示、暂停、取消、错误和工具结果配对。

**限制和泛化：** 依赖升级可能改变事件格式，升级后仍要验证。设计类似系统时，先决定谁真正拥有模型和工具的执行过程，其他层只围绕它提供产品能力。

### Q3：运行控制和编程会话分别管什么？

**30 秒结论：** 一个管任务怎么运行、取消和继续；另一个管这次任务用哪个模型、哪些工具，以及怎样保存会话。

**2 分钟机制：** `AgentHarness` 保存对话、补充指导和后续消息的队列，还负责取消。`CodingSession` 准备项目目录、模型、工具和会话文件，并保证一次任务从开始到保存结束不会被切换会话打断。前者不知道项目目录，后者不用直接处理界面组件。

**源码和测试证据：** [`harness.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/harness.py)、[`sessions/session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/sessions/session.py)、[`test_agent_harness.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_agent_harness.py) 和 [`test_coding_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_session.py)。

**连续追问：** ① 能合成一个类吗？能，但模型配置和文件保存会混进通用运行控制。② 为什么运行标记还在会话层？因为切换、对话压缩和保存也要算在同一次任务里，不能只盯模型调用时间。

**没选的方案：** 让命令入口直接启动模型并写会话文件。这样普通文本、JSON 和交互界面各要复制一套运行与错误处理。

**限制和泛化：** 两个类仍在同一进程；拆分是为了让职责清楚，不是隔离故障。类似系统也可以把通用运行控制与具体任务配置分开。

### Q4：为什么工具参数只定义一份？

**30 秒结论：** 模型看到的工具参数和真正执行时检查的参数必须是同一份定义。Forge 只额外保存工具在界面上的名称和提示，不复制参数规则。

**2 分钟机制：** 每个工具明确规定输入格式；项目目录等运行信息由系统注入，不让模型伪造。工具返回给人看的内容和必要的结构化信息。无论成功或失败，都生成与原调用对应的结果；保存会话时，再把附加信息安全地转成 JSON。

**源码和测试证据：** [`tools/base.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/base.py)、[`tools/definition.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/definition.py)、[`test_coding_tools.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_tools.py) 的 schema 和失败用例。

**连续追问：** ① 为什么不在 Forge 里再定义一次参数？两份规则迟早会不一致。② 附加信息为什么不拼进回答文本？它主要供程序和界面使用，拼进去会让模型读到不必要的内容。

**没选的方案：** 自己设计一套工具接口，再写转换代码接 LangChain。这样工具定义和结果处理又会出现两套。

**限制和泛化：** 未来若更换底层框架，需要改这层接入。无论用什么框架，工具参数最好只定义一次。

### Q5：为什么不让界面直接读取 LangChain 的原始事件？

**30 秒结论：** Forge 把底层执行消息先整理成一套自己的事件。普通文本、JSON 和交互界面都读这套格式，不必各自猜 LangChain 的内部字段。

**2 分钟机制：** 执行层识别模型开始、文字增量、工具调用、错误等底层事件，再转换成 `AgentEvent`。界面只处理这个公开格式，会话层则据此保存消息和产品状态。底层事件格式变了，主要改转换处，不用让每种显示方式都跟着改。

**源码和测试证据：** [`events.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/events.py)、[`langchain_runtime.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/langchain_runtime.py)、[`test_langchain_runtime.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_langchain_runtime.py) 和 [`test_tui_app.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_tui_app.py)。

**连续追问：** ① 新增事件要改哪里？公开事件类型、转换代码、需要显示它的界面和相应检查。② 遇到不认识的子代理数据怎么办？宁可不显示，也不把原始内容直接露给用户或父模型。

**没选的方案：** 让交互界面直接解析 LangChain 输出。短期少一层代码，之后每次底层事件变化都可能牵动界面。

**限制和泛化：** 事件转换本身也要维护，不能只增不管。但当同一次执行要给多种界面和会话文件使用时，统一格式比各写一套解析更稳。

### Q6：已经保存会话文件，为什么问卷还要暂存内存状态？

**30 秒结论：** 会话文件保存长期要恢复的消息和结果；问卷等待回答时，还需要记住执行停在哪一步。这份暂停位置只暂存在内存里，回答后就释放。

**2 分钟机制：** 每条消息、工具结果和分支变化都追加进会话文件，恢复时按记录还原。只有模型提出问卷，系统才为这次暂停创建独立的内存状态；用户回答后，从原处继续执行并清掉这份状态。

**源码和测试证据：** [`session/storage.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/session/storage.py)、[`session/memory.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/session/memory.py)、[`langchain_runtime.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/langchain_runtime.py) 和 [`test_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_session.py)。

**连续追问：** ① 为什么不把执行状态永久保存？那会与会话文件形成两套恢复依据，分支和导出也更难统一。② 等待回答时进程崩了怎么办？当前实现不能从这份内存状态恢复；若要支持，需要另设计持久化的暂停与恢复协议。

**没选的方案：** 只保存底层执行图的状态。它能让图从某一步继续，却不能直接提供可读的用户会话、分支和导出能力。

**限制和泛化：** 当前问卷必须在进程还活着时回答。类似系统要先分清哪些记录必须长期保存，哪些只服务于一次暂停。

### Q7：一次模型回复调用多个工具，怎样决定执行顺序？

**30 秒结论：** 互不依赖的工具可以一起跑；如果其中有工具要求按顺序执行，整批就按模型给出的次序跑。一个工具正常报错，只影响自己的结果，不会自动拦住其他工具。

**2 分钟机制：** 外层的 `ToolCallBatchMiddleware` 先检查调用编号和工具要求，再把普通调用交给 LangChain 并行执行；遇到明确要求顺序的工具，就控制整批按模型顺序运行。每个工具异常都转成对应调用的简短错误。调用编号、顺序或结果配对不合法时会拦截；子代理也用同一套规则。

**源码和测试证据：** [`tool_execution.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/tool_execution.py) 的 `awrap_tool_call()`，以及 [`test_tool_execution_middleware.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_tool_execution_middleware.py) 的并行、顺序、错误配对和取消用例。

**连续追问：** ① 后一个调用依赖前一个结果怎么办？分两轮，让模型先看结果再决定。② 为什么只要有一个工具要求顺序，整批就顺序执行？否则其他调用仍可能抢在它前面执行。

**没选的方案：** 所有工具都排队执行。互不相关的读取或子代理任务也得互相等，白白增加等待时间。

**限制和泛化：** 顺序执行会让这一批变慢，也不保证前一步成功。一般编程助手要区分能并行的独立调用、必须按顺序做的动作，以及必须先看结果才能继续的依赖。

### Q8：已经安排了工具顺序，为什么同一文件还要排队？

**30 秒结论：** 模型一次回复里的工具调用，和多个会话同时改同一文件，是两件事。同文件队列保护后者：在同一进程里，直接读写同一个真实文件要排队。

**2 分钟机制：** 读取、写入和编辑开始前，按系统解析后的真实文件路径进入队列。同一路径一次只执行一项，不同路径可以并行。这个队列覆盖同一进程中的不同会话，但命令工具自行修改文件不受它约束。

**源码和测试证据：** [`file_operation_queue.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/file_operation_queue.py)、[`test_file_operation_queue.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_file_operation_queue.py) 和 [`test_coding_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_session.py) 的并发 session 用例。

**连续追问：** ① 为什么不把所有文件操作都锁住？不同文件没必要互相等。② 多个进程同时改怎么办？要另加跨进程文件锁或集中协调，当前队列管不到。

**没选的方案：** 每个工具各自加锁。它们看不到其他工具和不同事件循环里的会话，也会重复写协调代码。

**限制和泛化：** 另一个 Forge 进程或命令工具仍可能同时改文件。这层保护不能被说成跨进程锁，更不能被说成安全沙箱。

### Q9：Forge 的文件工具安全吗？

**30 秒结论：** 读写工具会把路径限制在项目目录内，也会检查符号链接。但运行命令仍有当前用户的系统权限，所以不能说整个助手有安全沙箱。

**2 分钟机制：** 文件工具既检查用户填入的路径，也检查系统最终解析到哪里，防止通过 `..` 或符号链接跳出项目目录。编辑时要求待替换内容唯一，避免改错位置。命令工具有超时、取消和子进程清理，但不会降低操作系统权限。

**源码和测试证据：** [`tools/common.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/common.py)、[`tools/edit.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/edit.py)、[`tools/bash.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/tools/bash.py)、[`test_coding_tools.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_coding_tools.py)。

**连续追问：** ① 为什么既查原路径又查真实路径？新文件可能还不存在，`..` 和符号链接也要分别拦截。② 怎么执行不可信代码？放进容器或轻量虚拟机，再限制网络、资源和文件权限。

**没选的方案：** 只告诉模型“不要访问项目外”。模型遵守提示不等于文件工具有访问控制。

**限制和泛化：** 当前面向本地单用户项目，不能承诺不同用户之间的隔离。处理不可信代码时，还需要操作系统级的隔离。

### Q10：模型问用户问题后，怎样从原处继续？

**30 秒结论：** 模型提出问题时，当前任务暂停。用户回答后，系统从原来停下的位置继续，并把回答写成那次工具调用的结果，不新开一段无关对话。

**2 分钟机制：** 只有交互会话能使用提问工具。模型提问后，界面展示问卷并按题目保存用户输入；提交答案时用 `Command(resume=...)` 继续同一次执行。取消、关闭或切换会话也要处理原工具调用，不能留下只有提问、没有结果的记录。

**源码和测试证据：** [`features/human_input.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/features/human_input.py)、[`langchain_runtime.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_agent/langchain_runtime.py)、[`test_todo_and_human_input.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_todo_and_human_input.py)。

**连续追问：** ① 为什么不把答案当普通用户消息？那样原来暂停的执行位置和工具调用就接不上了。② 无人值守模式能提问吗？不能，它不注册提问工具，避免永远等人回答。

**没选的方案：** 为问卷另开一个模型任务。新任务不知道原任务停在哪里，还容易产生第二份对话记录。

**限制和泛化：** 暂停位置目前只存在内存里，进程崩溃不能从这里恢复。若做长期人工审批，还要设计持久化的恢复方式、超时和取消。

### Q11：待办计划和长期目标为什么分开？

**30 秒结论：** 待办是模型安排“接下来做什么”，长期目标决定“任务何时继续或结束”。待办全完成，不代表用户目标已经完成。

**2 分钟机制：** 待办列表由 LangChain 的官方组件维护，Forge 保存完整列表供界面和恢复使用。长期目标另记目标内容、当前状态和自动继续次数；只有目标进行中，模型才会看到“完成”或“受阻”工具。两种状态分别保存，不伪装成新的用户消息。

**源码和测试证据：** [`features/planning.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/features/planning.py)、[`features/goals.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/features/goals.py)、[`test_todo_and_human_input.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_todo_and_human_input.py) 和 [`test_goal_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_goal_session.py) 的独立性用例。

**连续追问：** ① 为什么不把目标放在待办最后一项？模型可以改待办，不能因此决定用户目标已经完成。② 用户暂停时谁负责？会话层更新并保存目标状态，不能只在界面上改一个标记。

**没选的方案：** 把待办、目标和界面状态塞进一个大对象。恢复时很难分清哪些能由模型改，哪些只能由用户或系统改。

**限制和泛化：** 分开保存会多一点维护工作，但长任务都需要区分模型建议的步骤和系统掌握的停止条件。

### Q12：长期目标怎样防止一直自动运行？

**30 秒结论：** 目标文字有长度限制，自动继续最多 25 次；连续 3 次没有可观察的进展就停下。重新打开会话时先暂停，必须由用户明确恢复。

**2 分钟机制：** `GoalController` 限制目标最多 4,000 字，记录已经自动继续几次。每轮结束后，会话层才决定是否再来一轮；连续 3 次出现相同且没有工具调用的输出，就标记受阻。恢复时把原来“进行中”的状态先改成“已暂停”。

**源码和测试证据：** [`features/goals.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/features/goals.py)、[`sessions/session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/sessions/session.py)、[`test_goal_session.py`](https://github.com/tivon-x/forge/blob/0a0c05c/tests/test_goal_session.py) 的 restore、limit 和 no-progress 测试。

**连续追问：** ① 为什么不全由模型决定停止？模型可以报告完成，但系统还要有次数上限，防止一直消耗资源。② 为什么是 25 次？这是当前产品设置的预算，不是通用常数；要结合成本和任务效果调整。

**没选的方案：** 只要没完成就无限循环，或每轮伪造一条用户消息催模型继续。前者可能耗尽预算，后者会让对话记录混入系统自己造的提问。

**限制和泛化：** “连续输出相同”只能提示可能卡住，不能证明完全没有进展。长时间自动任务还需要成本预算、明确的完成检查和人工停止入口。

### 11.2 其余项目题速答

Q13 到 Q20 先准备短答。面试官追问时，再回到上面的源码路线找具体过程和证据。

### Q13：为什么让子代理通过工具接受任务？

**建议回答：** 父模型把明确的小任务交给子代理，但与用户的对话仍只保存在父会话。子代理每次独立运行，只能使用被允许的工具，不能继续委派；父模型收到筛选后的进展和最终结果。这样不需要让多个执行过程共享一整份对话状态，代价是父任务必须把必要背景说清楚，子代理不会自动知道全部上下文。

### Q14：限制子代理能用的工具，就算安全隔离吗？

**建议回答：** 不算。子代理只能从当前会话已有的工具中再删减，不能凭角色配置获得新权限，也不能使用委派工具。文件路径还要由文件工具检查，运行命令仍受操作系统权限约束。限制工具清单只是减少能调用什么，不等于把执行环境隔离开。

### Q15：为什么能切换模型服务商？

**建议回答：** 配置层记录各家模型的信息，创建模型时再加载对应服务商的专用代码；上层只面对同一模型接口。统一接口不代表能力完全一样，上下文容量、推理参数和工具调用方式仍可能不同，要在配置、错误处理和验证里显式照顾。源码入口是[配置](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/providers/config.py)和[模型创建](https://github.com/tivon-x/forge/blob/0a0c05c/src/forge_coding/providers/runtime.py)。

### Q16：为什么读项目说明前先问能不能信任？

**建议回答：** 项目说明和技能文件会影响模型行为，其中可能夹带恶意指令。系统先看文件位置等信息，决定能否加载，再读取正文。无人值守时默认不加载项目资料，交互模式可以问用户。信任资料只决定是否给模型看，不会顺便扩大文件工具权限。

### Q17：运行命令时取消，会发生什么？

**建议回答：** 取消信号会传到正在运行的命令，系统清理子进程并保留必要的末尾诊断。还没返回的工具调用会得到一条简短错误结果，会话最后保存收尾状态。只关掉界面而不处理执行过程，会留下无法正常恢复的半截对话。

### Q18：对话超过模型容量怎么办？

**建议回答：** 先确认真是输入过长，而不是认证失败、额度用尽、参数错误或用户取消。能压缩时才总结一部分旧对话，把摘要和压缩记录写入会话文件，再在同一次任务里有限重试。压缩失败就报告错误，不丢掉原记录。

### Q19：你会怎样验证这个项目？

**建议回答：** 先检查代码分层和安装入口，再用模拟模型验证工具结果配对、取消、人工问答、长期目标、子代理和会话恢复。文件工具重点检查路径越界、符号链接、输出截断和同文件并发。真实模型、下载和终端显示需要单独验证，离线检查全绿不等于这些场景也通过。

### Q20：你认为 Forge 当前最大的限制是什么？

**建议回答：** 命令工具还没有隔离环境，问卷暂停位置只在内存里，同文件队列也管不到另一个进程。模型服务商的差异不能完全靠统一接口抹平。如果要执行不可信代码，需要独立隔离环境；如果要让多个进程协作，需要新的跨进程协调方式。当前实现不能被说成已经具备这些能力。

## 12. 超出项目的编程助手设计题

### 12.1 四道综合系统设计题

通用设计题先问清谁在用、代码是否可信、任务会跑多久、仓库有多大。条件不同，方案也会不同。

#### 综合题一：设计一个最小的本地编程助手

**场景约束：** 单用户、可信仓库、单进程、短任务，需要读写文件和运行用户明确要求的命令，不要求多租户和长期后台运行。

**答题主线：** 先做最短可用链路：用户提问、模型选择工具、工具返回结果、模型继续。工具参数要有明确格式，文件路径不能越过仓库，输出要能逐步显示，也要能取消和保存会话。第一版不做子代理、长期记忆或分布式任务队列。先用模拟模型检查工具结果配对、路径拒绝、取消和恢复，再单独用真实模型试运行。

**反向追问：** “为什么不直接写一个脚本？”答：短演示可以。需要取消、失败后恢复和可检查的历史时，就要明确谁负责运行与保存；Forge 的三包结构不是最小演示的硬要求。

#### 综合题二：把 Forge 改成多租户云服务

**场景约束：** 租户互不信任，代码和凭据隔离，任务可排队、重试和审计，不能让模型直接接触宿主机文件系统。

**答题主线：** 保留模型和工具的执行逻辑，但把每个用户任务放进独立容器或轻量虚拟机。每个任务只挂载自己的临时工作目录，凭据用短期权限提供，网络和资源都有限制。会话记录放进按用户隔离的持久存储；工具操作带用户、任务和操作编号，重复提交时不能重复产生副作用。人工审批要能靠外部记录恢复，不能再依赖某个进程的内存。

**反向追问：** “把同文件队列换成 Redis 锁就行吗？”答：还要先定清锁保护哪个用户、任务和文件，进程崩溃后怎样过期，旧持锁者恢复后又怎样防止它继续写。只换锁的存储位置不够。

#### 综合题三：为超大仓库设计上下文系统

**场景约束：** 仓库远大于模型一次能读的内容，代码持续变化，回答必须能指出当前文件和行号。

**答题主线：** 先按目录、代码符号和依赖关系查找，再读取最相关的小段，不把整个仓库塞给模型。引用的片段带上文件版本，修改前重新确认它没变。给模型的内容优先保留当前目标、约束、最近操作和可核查的代码片段；压缩旧对话时保留未完成动作和失败原因，摘要不能取代当前源码。

**反向追问：** “一定要用向量检索吗？”答：不一定。文件搜索、符号索引和依赖关系可能更适合代码；只有它们找不到需要的内容，且向量检索的效果和维护成本都值得时再引入。

#### 综合题四：为长时间自治任务设计恢复、预算、评测和安全

**场景约束：** 任务可能运行数小时，模型服务可能失败，用户也可能暂时离线；系统不能无限重试或悄悄扩大改动范围。

**答题主线：** 把目标、当前步骤、已花的预算和外部操作持续保存。写文件或调用外部服务时记录唯一操作编号，重复执行要能识别，并限制能改哪些地方。模型、工具和验证分别计时计费，设置次数、时间和金额上限；只有临时错误才重试。恢复时从保存的记录继续，人工审批也要有可持久化的恢复方式。完成必须有文件状态、检查结果和改动范围作证。

**反向追问：** “模型说完成就能结束吗？”答：不能。要看工具和可重复的检查结果；没验证通过就标记未完成或受阻，并留下失败原因和下一步。

### Q21：从零设计编程助手，先确定什么？

**回答骨架：** 先问清它能碰哪些文件、能执行什么命令，以及出错会造成什么后果。最小流程是用户提问、模型选工具、工具返回结果、模型继续；外面再加取消、费用和次数上限、操作记录与界面显示。第一版不用急着做多代理和长期记忆，先把工具权限与失败收尾做好。

### Q22：如何设计上下文管理？

**回答骨架：** 给模型的内容先保当前目标和约束，再放最近对话、工具结果摘要与必要的代码片段。文件能重读，就不要把整份结果永久塞进上下文。对话太长时，摘要要保留未完成的动作和失败原因；每次压缩都留记录，不能简单从前面截掉一段。

### Q23：工具调用怎样做到幂等？

**回答骨架：** 会改文件或调用外部服务的工具，要记录唯一操作编号、目标和修改前的版本。重复提交时，要么识别为同一次操作，要么明确报告版本冲突，不能默默再改一遍。写文件可以用版本校验、临时文件后替换或明确的补丁；结果要告诉系统成功、失败或能否重试。

### Q24：编程助手的安全边界怎么设？

**回答骨架：** 分开处理四件事：哪些项目资料能给模型看，模型能调用哪些工具，工具在操作系统里有什么权限，危险动作是否需要人批准。模型生成的路径不能直接当权限依据，既要检查写出的路径，也要检查真实指向。运行不可信代码必须使用隔离环境；提示词只能提醒模型，不能替代这些检查。

### Q25：什么时候值得增加子代理？

**回答骨架：** 任务能拆出独立部分，而且并行处理或独立审查确实节省时间时，再用子代理。每个子任务要有明确输入、可用工具、完成结果和时间上限，父任务保留与用户的唯一对话。拆不开的任务通常先用一个模型配合更好的搜索和上下文管理即可。

### Q26：逐步显示与取消怎么设计？

**回答骨架：** 模型每产生一段内容就往外发送，界面按顺序显示。取消信号要一路传到模型、工具和子进程，清理资源，并给未完成的工具调用补结果；会话要记下这轮怎样结束，保证下次能继续。只让界面停止刷新，不算真正取消。

### Q27：怎样验证编程助手做得对？

**回答骨架：** 先验证工具参数和权限边界，再用模拟模型检查一次任务的完整过程，最后在明确环境里试真实模型和端到端任务。每次结果要记录输入、工具版本、运行环境和代码版本，保存失败过程。让另一个模型打分可以参考，但不能代替可重复的文件和命令检查。

### Q28：如何控制成本和延迟？

**回答骨架：** 先量清模型消耗、工具耗时、重试次数和等待时间，再决定哪里值得缓存或并行。重复读取可以合并，写文件不能为了快而跳过冲突检查。每次任务要有费用、时间和调用次数上限，不能用无限重试掩盖指令或工具设计问题。

### Q29：不同模型服务商的差异放在哪一层？

**回答骨架：** 上层只依赖统一的模型消息和工具调用接口；认证、专有参数和错误分类留在各家服务商的接入层。真正共有的行为才抽成统一接口。上下文容量、推理模式或工具输出不同，就明确记录差异，不能用一个万能配置字典假装所有服务商一样。

### Q30：长期会话怎样恢复和分支？

**回答骨架：** 把消息和状态变化按顺序保存，分支记录自己从哪条旧记录开始；对话压缩也要留下记录。恢复时只依据这些文件或数据库记录，不从界面缓存猜。临时暂停状态可以帮助一次人工问答继续，但不能替代长期会话。不可撤销的操作要留下可检查的结果。

### Q31：如果模型返回非法工具参数怎么办？

**回答骨架：** 先判断能否无歧义地转换。比如模型把行号写成数字字符串，可以转成整数；路径类型不对、把真假值当整数或数值越界则拒绝。拒绝也要给原工具调用一个结果，让模型下一轮修正；未经校验的内容不能直接交给文件或命令工具。反复出错要受调用上限约束，错误信息不能泄露密钥或内部路径。

### Q32：怎样判断任务真的完成？

**回答骨架：** 模型说“好了”只是一个说法。要看目标文件是否处于预期状态、检查命令是否通过、实际改了哪些地方，以及需要用户批准的动作是否获批。待办勾完或模型给出最终回答，都不能代替这些证据；没验证的部分要明确说没验证。

## 13. 术语表和最后一分钟速记

| 术语 | 一句话解释 |
| --- | --- |
| `AgentHarness` | 管一次任务的运行、排队、取消和对外事件 |
| `CodingSession` | 准备模型、工具和项目资料，并负责保存与恢复会话 |
| `AgentEvent` | Forge 对界面公开的统一事件格式 |
| `BaseChatModel` | 不同模型服务商在 LangChain 中使用的共同接口 |
| `StructuredTool` | 带明确参数格式和执行函数的工具 |
| `ToolRuntime` | 系统给工具注入的运行信息，不由模型填写 |
| `astream_events(v3)` | LangChain 逐步发出模型与工具执行过程的接口 |
| JSONL 会话 | 每行保存一条消息或状态变化，可检查、恢复和分支 |
| 临时内存状态 | 问卷暂停时保存执行位置，进程退出后不会留下 |
| 待办计划 | 模型能更新的任务步骤列表 |
| 长期目标 | 由会话管理的继续、暂停、完成或受阻状态 |
| 人工问答 | 暂停当前任务，收到回答后从原处继续 |
| 子代理 | 父模型通过 `task` 工具委派的一次受限任务 |
| 资源信任检查 | 决定是否读取项目说明和技能，再把内容交给模型 |
| 事件转换 | 把底层执行过程整理成界面和会话文件能用的内容 |

最后可以用这一段收尾：

> Forge 用 LangChain 完成模型和工具的往返，自己处理取消、保存会话、工具安全和界面显示。模型执行、编程工具、终端界面分开维护，出错后可以查会话记录并继续工作。它目前还不是安全沙箱，多个进程同时改文件和进程崩溃后的问卷恢复也没有彻底解决。
