---
title: Shell 编程基础与常用语法
---

# Shell 编程基础与常用语法

根据 [JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/cs-basics/operating-system/shell-intro.md)整理；快照版本 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。本文示例默认使用 Bash 4.0 及以上版本。

## Shell 和脚本执行

Shell 是命令解释器，接收命令并执行程序；脚本把命令、变量、管道和控制结构组合起来，用于日志处理、批量操作或任务自动化。Bash、Zsh、Dash 是不同实现；`/bin/sh` 不一定是 Bash，Bash 数组、`[[ ... ]]` 和 `pipefail` 等特性不能直接当作 POSIX sh 语法。

```bash
#!/usr/bin/env bash
printf '%s\n' 'Hello, world!'
```

首行 `#!`（shebang）指定解释器；`#!/bin/bash` 使用固定路径，`#!/usr/bin/env bash` 通过 `PATH` 查找。文件扩展名不决定解释器。

```bash
chmod +x hello.sh
./hello.sh
bash hello.sh
bash -n hello.sh
bash --version
```

直接执行 `./hello.sh` 需要执行权限，并使用 shebang；`bash hello.sh` 由指定解释器读取脚本，不要求脚本有执行权限。裸命令名通过 `PATH` 查找，当前目录通常不在其中。`bash -n` 检查语法，不执行脚本，也不能证明运行正确。`#` 在非引号的注释位置开始注释。

## 变量、引用和展开

赋值时等号两侧不能有空格，读取用 `$name` 或 `${name}`；变量名由字母、数字和下划线组成，首位不能是数字。

```bash
name='Ada'
message="Hello, ${name}!"
export APP_ENV='test'
printf '%s\n' "$message" "$APP_ENV"
```

普通变量保留在当前 Shell；`export` 标记后可被随后启动的子进程继承。子进程修改环境变量不会反向修改父 Shell。`env` 查看环境变量，`set` 查看 Shell 变量等状态；`PATH` 是命令搜索路径，`HOME` 是用户主目录。

| 写法 | 行为 |
| --- | --- |
| `'...'` | 内容按字面量处理，不展开变量或命令 |
| `"..."` | 保留空格并展开变量、命令替换和部分反斜杠转义 |
| 未加引号 | 展开结果可能发生单词分割和路径通配，空值也可能消失 |

通常用 `"$var"` 保留一个完整参数；当变量内容就是空格或 `*` 时，不加引号会改变参数数量或匹配当前目录文件。双引号并不阻止变量及命令替换，例如 `"$(date)"`。交互式 Bash 的历史展开是独立规则，不能简单视为所有 Shell 脚本中的双引号行为。

```bash
path='/var/log/app.log'
printf '%s\n' "${#path}"       # String length
printf '%s\n' "${path:0:4}"    # Bash substring
printf '%s\n' "${path##*/}"    # Remove longest matching prefix
printf '%s\n' "${path%/*}"     # Remove shortest matching suffix
printf '%s\n' "${missing:-default}"
```

`${var#pattern}` / `${var##pattern}` 从开头删除最短 / 最长匹配；`${var%pattern}` / `${var%%pattern}` 从结尾删除最短 / 最长匹配，模式是 Shell 通配模式而非正则。`${var:-default}` 在变量未设置或为空时使用默认值；`${var-default}` 只在未设置时使用默认值。`${var:offset:length}` 是 Bash 子串扩展，不适用于所有 POSIX sh。

## 参数、退出状态和命令替换

| 表达式 | 含义 |
| --- | --- |
| `$0` | 脚本或 Shell 的名称；函数中通常仍是脚本名 |
| `$1`、`$2`、`${10}` | 位置参数；第 10 个及以后必须加花括号 |
| `$#` | 当前脚本或函数的位置参数个数 |
| `"$@"` | 每个参数各自保持一个独立参数，包含空格也不拆分 |
| `"$*"` | 将所有参数连接为一个字符串，分隔符取决于 `IFS` |
| `$?` | 上一个命令或管道的退出状态，随后执行其他命令会改变它 |
| `$$` | 当前 Shell 的进程标识 |
| `$!` | 最近启动的后台作业标识，常用作等待后台进程的 PID |

函数内部的 `$1`、`$#`、`"$@"` 指该次函数调用的参数；未加引号的 `$@` 和 `$*` 可能产生单词分割和路径通配。转发参数通常使用 `command "$@"`，避免破坏参数边界。

```bash
count=$(wc -l < "$file")
printf 'lines: %s\n' "$count"
```

`$(command)` 捕获标准输出并去除末尾换行；标准错误默认不被捕获。命令替换可嵌套，通常比反引号更清晰。退出状态 `0` 表示成功，非 `0` 表示失败；失败原因须结合具体命令解释。

## 算术与条件判断

`$((...))` 用整数算术，例如 `$((a + b))`、`$((a / b))`、`$((a % b))`；除法结果按整数处理。需要小数运算时可使用其他工具。`expr` 的操作数和运算符需要分开，`*` 等字符还要避免被 Shell 当作通配符，通常整数计算用算术扩展更直接。

| 类型 | 常见测试 |
| --- | --- |
| 数值 | `-eq` 等于、`-ne` 不等、`-lt` 小于、`-le` 小于等于、`-gt` 大于、`-ge` 大于等于 |
| 字符串 | `=` 相等、`!=` 不等、`-z` 为空、`-n` 非空 |
| 文件 | `-e` 存在、`-f` 普通文件、`-d` 目录、`-s` 非空 |
| 权限和类型 | `-r` 可读、`-w` 可写、`-x` 可执行；`-b` 块设备、`-c` 字符设备、`-p` 命名管道 |
| 特殊权限位 | `-u` SUID、`-g` SGID、`-k` sticky bit |

`[ ... ]` 是 `test` 的一种形式，左右方括号和参数间需要空格；为可移植性，字符串相等用 `=`。`[[ ... ]]` 是 Bash 条件语法，支持模式匹配和 `&&`、`||`，不是 POSIX sh。文件测试结果代表检查时刻的状态，不能保证后续操作必然成功。

```bash
if [ -f "$file" ] && [ -r "$file" ]; then
    printf '%s\n' 'readable file'
elif [ -d "$file" ]; then
    printf '%s\n' 'directory'
else
    printf '%s\n' 'not a readable file or directory'
fi
```

命令链 `a && b` 在 `a` 成功时执行 `b`，`a || b` 在 `a` 失败时执行 `b`。`a && b || c` 不等价于 `if a; then b; else c; fi`：当 `a` 成功但 `b` 失败时，`c` 仍会执行。需要明确分支时使用 `if`。`!` 可对命令或条件取反；`:` 是返回成功的空操作。

## 数组和循环

Bash 支持索引数组，纯 POSIX sh 不支持该语法。数组下标从 0 开始，删除一个元素后下标不会自动重新编号。

```bash
items=('one' 'two words' 'three')
printf '%s\n' "${items[1]}"    # One element
printf '%s\n' "${#items[@]}"   # Element count
unset 'items[1]'
for item in "${items[@]}"; do
    printf '%s\n' "$item"
done
for index in "${!items[@]}"; do
    printf '%s: %s\n' "$index" "${items[$index]}"
done
```

`"${items[@]}"` 逐个保留数组元素，`"${!items[@]}"` 提供仍存在的下标。`unset items` 删除整个数组。

```bash
for value in 1 2 3; do
    printf '%s\n' "$value"
done

for ((i = 0; i < 3; i++)); do
    printf '%s\n' "$i"
done

while IFS= read -r line || [ -n "$line" ]; do
    printf '%s\n' "$line"
done < "$file"
```

`for ((...))` 是 Bash 算术循环；`while` 在条件命令成功时继续。`IFS= read -r` 保留行首行尾空白和反斜杠，右侧条件使末行没有换行符时仍可处理。`while true; do ...; done` 可构成持续循环；使用 `break` 退出，`continue` 跳过本轮。

## 函数

函数接收位置参数并返回退出状态；`return` 返回的是状态码，不适合传递字符串或任意计算结果。可用标准输出返回数据，或有意修改调用方可见的变量。`local` 限制 Bash 函数内变量的作用范围。

```bash
add() {
    local a=$1 b=$2
    printf '%s\n' "$((a + b))"
}

result=$(add 3 9)
printf '%s\n' "$result"
```

函数输出被 `$(...)` 捕获时，其他提示信息若不应混入结果，应写到标准错误 `>&2`。命令替换通常在子 Shell 中执行，不能依靠其中对普通变量的修改来更新调用方。

## 重定向、管道与后台任务

| 写法 | 含义 |
| --- | --- |
| `command > file` | 标准输出写入文件，通常覆盖原内容 |
| `command >> file` | 标准输出追加到文件 |
| `command < file` | 从文件读取标准输入 |
| `command 2> file` | 标准错误写入文件 |
| `command > file 2>&1` | 标准输出和标准错误写入同一文件；重定向按从左到右处理 |
| `a \| b` | 把 `a` 的标准输出作为 `b` 的标准输入 |
| `command &` | 启动后台作业 |

默认管道状态取最后一个命令的状态；Bash 启用 `set -o pipefail` 后，管道以最右侧失败命令的状态为结果，全部成功则返回 0。注意下游提前退出时，上游可能因 `SIGPIPE` 失败，不应把每次非零都简单归为业务错误。

```bash
task_one &
pid_one=$!
task_two &
pid_two=$!
status=0
wait "$pid_one" || status=1
wait "$pid_two" || status=1
exit "$status"
```

逐个 `wait` 可检查每个后台任务；Bash 不带参数的 `wait` 会等待当前所有后台作业，但返回成功，不能据此判断每项是否成功。后台作业启动成功也不代表任务最终执行成功。

## 脚本检查与错误处理

`set -u` 在展开未设置变量时报告错误；Bash 的 `set -e` 在部分未处理命令失败时退出，但 `if` 条件、`&&` / `||` 列表、函数调用及子 Shell 等上下文有例外。`set -euo pipefail` 可以作为起点，不能替代对关键步骤显式判断和清理。

```bash
if ! cd "$workdir"; then
    printf 'cannot enter: %s\n' "$workdir" >&2
    exit 1
fi
command -v curl >/dev/null 2>&1 || {
    printf '%s\n' 'curl is required' >&2
    exit 1
}
```

- 网络调用分别设置连接与总超时；重试次数、等待时间和是否可重试应结合接口语义，避免多层重试使次数相乘。对非幂等请求尤其不能盲目重放。
- 使用 `mktemp` 创建临时文件或目录，配合 `trap` 清理；清理路径必须来自可信且确认创建成功的变量。`EXIT` 陷阱能覆盖正常退出和可处理的退出路径，无法处理 `SIGKILL` 或断电。
- 本机脚本互斥可用 `flock`，但它是协作式锁；网络文件系统上的行为依赖环境，需在目标环境验证。
- 避免长期丢弃标准错误，否则失败时缺少诊断信息。先用 `bash -n` 检查语法，再用 ShellCheck 等工具检查引用、重定向等问题；涉及文件、网络或后台任务的脚本还要验证失败分支。
