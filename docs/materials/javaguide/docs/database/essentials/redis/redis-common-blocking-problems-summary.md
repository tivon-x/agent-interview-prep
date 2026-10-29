---
title: Redis 常见阻塞原因与排查
---

# Redis 常见阻塞原因与排查

根据 [JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/redis/redis-common-blocking-problems-summary.md)整理，快照版本 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

JavaGuide 原文注明整理完善自[阿 Q 说代码](https://mp.weixin.qq.com/s/0Nqfq_eQrUb12QH6eBbHXA)。

Redis 命令执行路径可能被长命令、持久化、删除和系统资源争用拖慢。应结合慢日志、`LATENCY`、`INFO`、CPU、磁盘、网络与业务时序定位；慢日志主要记录命令执行耗时，不涵盖所有网络等待和排队时间。

## 常见原因

| 原因 | 现象与处理 |
| --- | --- |
| 复杂度高的命令 | `KEYS`、大集合全量读取或集合运算会增加主线程处理时间；使用 `SCAN` / `HSCAN` 等分批迭代，并接受扫描期间数据变化与重复结果 |
| 同步快照 | `SAVE` 会阻塞；线上通常使用 `BGSAVE`，仍需监控 fork 和 COW |
| AOF 写入与刷盘 | 磁盘慢、日志积压或重写时可能影响延迟；观察 AOF 状态、磁盘吞吐与 fsync 延迟，不能只看主线程 |
| 大 key | 访问、网络传输、同步释放均可能造成延迟；用 `SCAN`、`--bigkeys` 等采样定位，拆分并限制单次请求 |
| 批量清理 | `FLUSHDB`、大量删除等可阻塞；按版本评估异步选项、`UNLINK` 和分批清理 |
| 扩容 / 迁移 | 节点搬迁、网络与大键迁移影响响应；控制批次、监控和演练 |
| swap、CPU、网络 | swap 导致缺页等待；CPU 争用、网卡或连接队列饱和也可表现为超时；检查系统指标与容量 |

`UNLINK` 先从键空间移除，释放工作可异步进行，但内存不会保证立刻回收；具体支持取决于 Redis 版本。热 key 和大 key 不同：热 key 是访问集中，大 key 是单 key 数据量或元素数大，两者可能同时存在。
