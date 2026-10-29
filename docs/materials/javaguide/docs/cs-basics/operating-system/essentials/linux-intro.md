---
title: Linux 基础与常用命令
---

# Linux 基础与常用命令

根据 [JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/cs-basics/operating-system/linux-intro.md)整理，快照版本 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。以下为精简笔记，版权归原作者所有。

## Linux、发行版和文件系统

严格说 Linux 指内核，负责进程、内存、设备、网络及文件系统等管理；发行版将内核与用户空间工具、软件包管理器、安装配置工具等组合，例如 Debian、Ubuntu、RHEL。命令和配置路径可能随发行版变化。

许多资源可通过文件描述符和统一的读写接口访问，但不是所有资源都是普通磁盘文件，例如网络套接字和虚拟文件系统对象。

文件系统通过 inode 管理文件元数据，包括类型、权限、所有者、大小、时间和数据块映射；文件名由目录项关联 inode，不是 inode 的全局名称。inode 号只在所属文件系统内唯一。用 `stat file` 查看元数据，`ls -li` 查看目录项及 inode 号。

文件数据使用块或 extent 管理，块大小与磁盘物理扇区大小是不同概念。部分文件系统如 ext4 的 inode 数量在创建文件系统时确定：inode 耗尽时，即使数据空间尚有余量也可能无法创建文件。`df -h` 看文件系统空间，`df -i` 看 inode 使用量。

| 类型 | `ls -l` 首字符 | 例子 |
| --- | --- | --- |
| 普通文件 | `-` | 文本、程序、图片 |
| 目录 | `d` | 包含文件名与 inode 的对应关系 |
| 符号链接 | `l` | 保存目标路径 |
| 字符设备 / 块设备 | `c` / `b` | 终端 / 磁盘等设备接口 |
| FIFO 管道 / Socket | `p` / `s` | 进程通信 |

硬链接是指向同一 inode 的另一个目录项；`ln source hardlink` 创建，不能跨文件系统，通常也不能为目录创建。软链接是独立文件，保存目标路径；`ln -s source symlink` 可跨文件系统或指向目录，目标删除后链接可能悬空。删除最后一个硬链接后，如仍有进程打开文件，空间通常要等相关打开引用关闭后才可回收。

## 目录树与路径

`/` 是根目录；绝对路径从 `/` 开始，相对路径从当前工作目录开始。`.` 表示当前目录，`..` 表示上级目录，`~` 表示当前用户主目录。

| 目录 | 常见用途 |
| --- | --- |
| `/etc` | 系统与服务配置 |
| `/home`、`/root` | 普通用户主目录的常见位置、root 的主目录 |
| `/usr`、`/bin`、`/sbin` | 应用、命令及系统工具；不同发行版可能合并目录 |
| `/lib`、`/lib64` | 程序和系统运行所需的库 |
| `/var` | 日志、缓存等经常变化的数据 |
| `/tmp` | 临时文件 |
| `/dev` | 设备文件 |
| `/proc` | 暴露进程和内核信息的虚拟文件系统 |
| `/boot` | 引导所需文件 |
| `/opt`、`/mnt` | 可选软件、临时挂载点 |

`/sbin` 主要存放系统管理工具，并不意味着其中所有命令都只能由 root 访问；是否能执行具体操作取决于权限和能力。

## 文件和目录操作

| 命令 | 用途和常见选项 |
| --- | --- |
| `pwd`、`cd /path`、`cd ..`、`cd -` | 查看当前目录、进入指定目录、上级目录、返回上一次目录 |
| `ls -la` | 列出包含隐藏文件的详细信息；`ll` 是部分环境配置的别名，不保证存在 |
| `mkdir -p a/b`、`rmdir empty` | 创建多级目录、删除空目录 |
| `touch file` | 创建不存在的文件或更新已有文件时间戳 |
| `cp -r source target`、`mv source target` | 递归复制、移动或重命名；`cp -r` 不等于完整保留权限及时间，保留属性可按需求使用 `cp -a` |
| `rm file`、`rm -r directory` | 删除文件或递归删除目录；先核对路径和匹配范围 |
| `find . -name '*.log'` | 从当前目录递归查找文件名；`-iname` 忽略大小写，通配符要加引号 |
| `cat file`、`less file`、`tail -f file` | 输出全文、分页查看、持续跟踪新增内容 |
| `grep -in 'error' app.log` | 搜索文本，`-i` 忽略大小写，`-n` 显示行号 |

Vim 常用流程：`vim file` 打开，按 `i` 进入插入模式；编辑后按 `Esc` 返回普通模式，输入 `:wq` 保存退出，`:q!` 放弃未保存修改并退出。

## 打包、压缩和传输

```bash
tar -czf archive.tar.gz directory
tar -tzf archive.tar.gz
tar -xzf archive.tar.gz -C target_directory

scp -r directory user@host:/home/user/
scp -r user@host:/home/user/directory ./
rsync -av directory/ user@host:/home/user/directory/
```

`tar` 的 `-c` 创建、`-x` 解包、`-t` 列表、`-z` 使用 gzip、`-f` 指定归档文件；`-C` 指定解压目录。`scp` 通过 SSH 在本机和远端复制；`rsync` 可根据差异传输并支持更多同步选项。`rsync` 源路径尾部的 `/` 表示同步目录内容，不带 `/` 时通常会包含目录本身。FTP 可传文件，但普通 FTP 不提供传输加密，敏感数据优先采用 SSH 传输。

## 权限和所有权

`ls -l` 的权限位分为所有者 `u`、所属组 `g` 和其他用户 `o`，每组使用 `r`、`w`、`x`，对应数值 4、2、1。

| 权限 | 普通文件 | 目录 |
| --- | --- | --- |
| `r` | 读取内容 | 读取目录项列表 |
| `w` | 修改文件内容 | 允许新增、删除或重命名目录项，通常还需要目录 `x` |
| `x` | 尝试执行程序或脚本 | 穿过目录、访问其中已知名称的条目 |

```bash
chmod 764 file
chmod u=rwx,g=rw,o=r file
chown user:group file
chgrp group file
```

`764` 分别表示所有者 `rwx`、所属组 `rw-`、其他用户 `r--`。删除文件主要看其父目录的写入和搜索权限，不等同于文件本身的写权限；还可能受 sticky bit、ACL 等约束。root 通常拥有绕过常规权限检查的能力，但仍受 capability、挂载选项、安全模块等约束。

## 用户、用户组和服务

| 命令 | 用途 |
| --- | --- |
| `useradd`、`usermod`、`userdel` | 创建、修改、删除用户 |
| `passwd user`、`passwd -S user` | 设置密码、查看密码状态 |
| `su - user`、`sudo command` | 切换用户环境、按 sudo 策略以指定身份执行命令 |
| `groupadd`、`groupmod`、`groupdel` | 创建、修改、删除用户组 |
| `systemctl status service`、`start`、`stop`、`restart` | 查看状态及管理 systemd 服务 |
| `systemctl enable service` | 配置开机启动；不等于立即启动 |
| `journalctl -u service -f` | 持续查看指定服务日志 |

本地用户和组信息常见于 `/etc/passwd`、`/etc/group`；认证信息、PAM 及目录服务等还会影响实际账户行为。修改 systemd 单元文件后使用 `systemctl daemon-reload` 重新加载配置。

## 进程、资源与网络排查

| 目标 | 常用命令 | 看什么 |
| --- | --- | --- |
| 进程 | `ps -ef`、`ps aux`、`pgrep -a java` | PID、状态、命令、CPU 和内存 |
| 实时资源 | `top`、`htop`、`free -h`、`vmstat 1` | CPU、内存、可运行任务及 I/O 等待；`htop` 可能需额外安装 |
| 负载 | `uptime` | 运行时间和 load average；负载不等同于 CPU 使用率 |
| 磁盘 | `df -h`、`df -i`、`du -sh directory` | 文件系统容量、inode 和目录占用 |
| 网络地址 | `ip addr` | 接口、地址和状态；旧环境可能使用 `ifconfig` |
| 网络连接 | `ss -lntp` | TCP 监听端口及关联进程，具体可见信息受权限限制 |
| 网络连通 | `ping host` | ICMP 可达情况，不代表 TCP 端口必然可连接 |
| 服务日志 | `journalctl -u service -f`、`tail -f app.log` | 服务启动错误和持续日志 |

`sar` 可按采样间隔查看历史或实时资源指标，是否可用取决于安装和采集配置。需要终止进程时先确认 PID，通常先发送 `kill PID`（`SIGTERM`）以允许清理；无法正常退出时再考虑 `kill -9 PID`（`SIGKILL`，不能被捕获或忽略）。

## 环境变量与 Bash 启动文件

环境变量可供当前进程及其后启动的子进程使用，子进程修改不会反向修改父 shell。`env` 查看环境变量，`export -p` 查看已导出的变量，`echo "$PATH"` 查看 PATH。

```bash
export JAVA_HOME="/path/to/jdk"
export PATH="$JAVA_HOME/bin:$PATH"
```

在终端中 `export` 的修改仅影响当前 shell 和之后继承它的子进程，关闭 shell 后不再自动保留。需要长期生效时，按 shell 类型修改对应配置，再重新启动 shell 或执行 `source`；`source` 会在当前 shell 中执行文件，内容应可信。

以 Bash 为例：登录 shell 通常读取 `/etc/profile`，再读取 `~/.bash_profile`、`~/.bash_login`、`~/.profile` 中第一个存在且可读的文件；交互式非登录 shell 通常读取 `~/.bashrc`。实际链路还取决于发行版配置，部分登录配置会主动加载 `~/.bashrc`；非交互 shell 有不同规则，不能一概而论。
