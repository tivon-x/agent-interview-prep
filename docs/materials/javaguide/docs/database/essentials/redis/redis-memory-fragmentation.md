---
title: Redis 内存碎片
---

# Redis 内存碎片

根据 [JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/redis/redis-memory-fragmentation.md)整理，快照版本 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

内存分配器按大小类别分配，申请值小于分配块会产生内部碎片；键值大小变化、删除和反复分配也可能留下难复用的空闲区域。Redis 删除数据后，分配器未必立即将空闲页归还操作系统，因此 RSS 可能高于 Redis 逻辑使用量。

`INFO memory` 中 `used_memory` 是分配器记录的 Redis 内存，`used_memory_rss` 是进程驻留内存，`mem_fragmentation_ratio` 是二者之比。RSS 还包含代码、共享库等，不等于纯碎片；数据量小、COW、swap 等都可能影响比值。结合 `allocator_allocated`、`allocator_active`、`allocator_resident`、系统 swap 和绝对字节数判断，不应只看单一阈值。

启用 active defragmentation 可在支持的 Redis 与分配器环境下渐进整理内存，但需要 CPU，具体配置和效果因版本而异。还可调整数据大小分布、清理过期大键，或在具备高可用和恢复方案时通过受控迁移 / 重启释放内存；先评估延迟与可用性。
