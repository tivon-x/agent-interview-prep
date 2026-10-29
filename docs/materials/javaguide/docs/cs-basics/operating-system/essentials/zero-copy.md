---
title: 零拷贝：mmap、sendfile 与 splice
---

# 零拷贝：mmap、sendfile 与 splice

根据 [JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/cs-basics/operating-system/zero-copy.md)整理，快照版本 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

## 计数口径

以下比较采用同一简化场景：普通文件通过 TCP socket 原样发送，文件页初始未命中 Page Cache，不做用户态 TLS、压缩或格式转换，设备支持 DMA。只统计数据本身的拷贝，不统计元数据。

零拷贝指减少或避免 CPU 对数据本身的内存间复制，不等于没有数据搬运。磁盘到内存、内存到网卡通常仍有 DMA；缓存命中、协议栈和设备能力变化都会改变实际次数。一次系统调用的用户态 / 内核态切换，也不同于线程被调度换出的上下文切换。

## 传统 read + write

以一轮读写为例：

1. 磁盘经 DMA 到内核 Page Cache。
2. CPU 将数据从内核缓冲区复制到用户缓冲区。
3. CPU 将用户缓冲区复制到 socket 发送缓冲区。
4. 网卡经 DMA 读取发送缓冲区。

该模型下为 **2 次 DMA、2 次 CPU 拷贝**；`read` 和 `write` 分别进出内核，合计 4 次模式切换。`write` 返回不意味着网卡 DMA 已发送完成，网络发送通常随后异步进行。

## mmap + write

`mmap` 将文件区域映射到进程虚拟地址空间，用户映射和 Page Cache 可以指向同一批物理页；创建映射本身不等于立即读盘。访问尚未驻留的映射页时，内核处理缺页，必要时从磁盘加载。

调用 `write` 发送映射区数据时，仍可能由 CPU 将数据复制到 socket 缓冲区。简化模型中通常是 **2 次 DMA、1 次 CPU 拷贝**，省去内核到独立用户读缓冲区的复制；映射和缺页本身也有开销，不能把切换次数视为固定值。

映射允许用户态访问数据，适合特定的大文件或重复访问场景，但小文件和随机访问未必受益。若文件被其他进程截断，随后访问被截断的映射部分可能收到 `SIGBUS`。

## sendfile 与 SG-DMA

`sendfile` 在两个文件描述符之间由内核传输数据，典型场景是普通文件到 socket，应用不必将内容读入用户缓冲区。描述符类型限制取决于内核版本；输入通常需支持 mmap 式读取，不能把它当作通用的 socket 到 socket 接口。

- 不具备相关优化时，数据可从 Page Cache 由 CPU 复制到 socket 缓冲区，简化模型为 2 次 DMA、1 次 CPU 拷贝。
- 内核、协议栈和网卡支持合适的 scatter-gather 路径时，socket 发送结构可引用页面并保存描述信息，由设备读取页面，避免 CPU 复制 payload；简化模型为 2 次 DMA、0 次 CPU payload 拷贝。
- 一次 `sendfile` 调用通常对应一次进入和一次退出内核，但短传输、循环调用、阻塞和具体路径会改变总开销。

## splice

`splice` 至少要求输入或输出的一端为管道。文件到 socket 可分两次调用：文件到管道、管道到 socket。内核可借助管道缓冲区中的页引用转移数据，避免进入用户空间；文件系统或设备不支持相应路径时可能退化为复制。`SPLICE_F_MOVE` 不是消除复制的保证。

两次调用在简化模型中对应约 4 次模式切换；实际应用还需处理短传输、非阻塞操作的 `EAGAIN` 和重试。

| 方式 | CPU payload 拷贝 | 适用方向与限制 |
| --- | --- | --- |
| `read` + `write` | 2 次 | 应用可读写数据；需要用户缓冲区 |
| `mmap` + `write` | 1 次 | 应用可访问映射区；仍有映射和缺页开销 |
| `sendfile` | 0 或 1 次 | 文件原样发送；实际路径取决于设备和协议栈 |
| `splice` | 通常可避免，但不保证 | 借助管道在支持的描述符间转发，例如 socket 到 socket |

上表次数仅适用于开头的简化口径。TLS 用户态加密、压缩、格式转换或内容修改可能需要处理 payload，不能保证沿用同一条零拷贝路径。

## Java 与消息系统

- `FileChannel.map` 创建 `MappedByteBuffer`，与文件内存映射相关；`FileChannel.transferTo` / `transferFrom` 的底层路径取决于 JDK、操作系统和目标 channel，不能直接断言必然调用 `sendfile`。
- `transferTo` 可能短传输，调用方应根据返回值处理剩余数据，非阻塞目标还要处理暂时无法继续写入的情况。
- Kafka 的日志段原样发送可借助 `transferTo` 走内核优化路径；用户态 TLS、格式转换等可能使路径变化。RocketMQ 的 CommitLog 常用内存映射进行读写；具体实现需结合版本确认。
