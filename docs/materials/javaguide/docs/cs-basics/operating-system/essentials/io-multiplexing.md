---
title: I/O 多路复用：select、poll 与 epoll
---

# I/O 多路复用：select、poll 与 epoll

根据 [JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/cs-basics/operating-system/io-multiplexing.md)整理，快照版本 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

## 就绪与完成

网络读取可分为等待数据到达内核缓冲区，以及将数据从内核缓冲区复制到用户缓冲区。I/O 多路复用让一个线程等待多个文件描述符（fd）就绪，再对就绪的 fd 调用 `read` / `recv`，减少为大量空闲连接分别等待的线程开销；它不保证单次读取更快。

就绪通知不是 I/O 完成通知。多路复用通常归入同步 I/O：应用仍需发起实际读写。就绪后能否立即读到数据还受并发读取和 fd 模式影响，因此事件循环通常配合非阻塞 fd。

| 模型 | 等待和处理 |
| --- | --- |
| 阻塞 I/O | 读调用等待数据就绪并完成复制后返回 |
| 非阻塞 I/O | 无数据时立即返回 `EAGAIN` / `EWOULDBLOCK`，反复主动查询可能空转 |
| I/O 多路复用 | 等待多个 fd 的就绪事件，应用再发起读写 |
| 信号驱动 I/O | 就绪时收到信号，应用再发起读写 |
| 异步 I/O | 提交请求后等待完成通知；具体实现依赖平台和 API |

## select、poll、epoll

| 维度 | select | poll | epoll |
| --- | --- | --- | --- |
| 监听集合 | `fd_set` 位图 | `pollfd` 数组 | `epoll_ctl` 维护内核中的兴趣集合 |
| 描述符限制 | Linux glibc 的 `FD_SETSIZE` 通常为 1024，限制可安全表示的 fd 编号 | 无该固定限制，但受进程 fd 和内存限制 | 受 fd、内存和系统监视数量限制 |
| 每次等待 | 传入位图，返回时被改写，下次须重新准备 | 传入数组，`events` 输入、`revents` 输出 | `epoll_wait` 返回本批就绪事件，无须每次重传全量集合 |
| 查找就绪项 | 扫描候选范围 | 扫描数组 | 等待阶段不扫描完整集合，结果处理主要随就绪事件数变化 |
| 模式与平台 | 水平触发，跨平台 | 水平触发，多见于 Unix 类系统 | 默认水平触发，也支持边缘触发，Linux 专有 |

`select` 的 `nfds` 通常是最大 fd 加 1；`select` 返回后原集合被修改。`poll` 不受 `FD_SETSIZE` 的位图大小限制，但仍需处理全部数组项。

`epoll_create1` 创建实例，`epoll_ctl` 增删改监听项，`epoll_wait` 等待就绪事件。Linux 当前实现使用红黑树维护注册项、使用就绪链表和回调组织已就绪事件；这些是实现细节，接口层面应记住兴趣集合和就绪列表。返回事件仍需复制到用户空间，epoll 并非依靠 mmap 消除该复制。

大量连接中只有少数活跃时，epoll 避免每次扫描和重传完整监听集合；它仍有注册、回调、锁竞争和结果复制等成本。连接少且大多活跃时，不能断言 epoll 一定更快。

## LT 与 ET

- **水平触发（LT）**：默认模式。只要仍满足就绪条件，后续等待仍会通知。
- **边缘触发（ET）**：关注状态变化。若通知后只读走部分数据，剩余数据可能长期得不到新通知。

例：对端发送 2 KB，只读 1 KB。LT 下一轮通常继续报告可读；ET 下不能依赖再次通知来处理剩余 1 KB。

ET 通常使用非阻塞 fd，并在一次处理过程中循环读到 `EAGAIN` / `EWOULDBLOCK`；`read` 返回 0 表示对端关闭写方向，`EINTR` 通常重试。监听 socket 的 `accept` 也需处理到 `EAGAIN`。为避免持续活跃的单个连接饿死其他连接，可结合处理预算与应用层就绪队列。

写入可能短写：应用需保存剩余数据，在需要时监听可写事件；同时处理 `EPOLLERR`、`EPOLLHUP`、`EPOLLRDHUP`。多线程分派同一 fd 时，可按需要使用 `EPOLLONESHOT` 并重新注册事件。

## 相关应用和边界

- Redis 事件循环在不同平台选择 epoll、kqueue 或 select；Redis 的网络 I/O 线程与命令执行线程的具体分工要按版本确认。
- Java NIO `Selector` 抽象多路复用，底层实现取决于操作系统与 JDK；Netty 的原生传输和触发模式也要看具体版本。
- 多个等待者可能因同一事件被唤醒，Linux 的 `EPOLLEXCLUSIVE` 能在适用场景缓解惊群，但不保证所有部署方式严格只唤醒一个等待者。
