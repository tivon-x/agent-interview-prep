---
title: Redis 延时任务
---

# Redis 延时任务

根据 [JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/redis/redis-delayed-task.md)整理，快照版本 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

## 过期事件监听

启用 keyspace notification 后，可订阅对应数据库的 `__keyevent@<db>__:expired`，利用过期 key 触发业务处理。事件在 Redis 实际删除过期 key 时发出，而非到期时刻的精确定时；惰性检查和主动过期扫描可能引入延迟。

通知使用 Pub/Sub：没有订阅者或连接断开时消息不持久化，订阅者恢复后无法自动补收；多个实例订阅还会各自收到消息。因此不能单凭过期事件保证不丢、不重复或准时执行。

## 有序集合与 Redisson

可将到期时间作为 Sorted Set score，调度器寻找已到期元素并转移到就绪队列。Redisson 的延迟队列使用 Redis 结构和客户端调度机制实现；具体命令、数据结构和 API 可用性应以安装版本为准。共享就绪队列可让多个消费者竞争获取，但消费者获取后崩溃仍可能丢失处理结果，重试也可能重复执行。

数据能否恢复取决于 Redis 持久化与故障窗口；需要可靠任务时，还要设计原子领取、确认、超时重投、幂等及数据库补偿。任务量、可接受延迟和可靠性要求较高时，可评估支持延迟消息与消费确认的消息系统。
