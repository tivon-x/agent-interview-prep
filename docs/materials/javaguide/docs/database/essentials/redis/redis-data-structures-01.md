---
title: Redis 五种基本数据类型
---

# Redis 五种基本数据类型

根据 [JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/redis/redis-data-structures-01.md)整理，快照版本 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

## String

二进制安全的值，可保存字符串、序列化对象或数字。`SET key value`、`GET key`、`SET key value NX EX seconds`、`INCR` / `INCRBY`、`MGET` / `MSET` 常用于缓存、限时标记和计数。整数递增命令在 Redis 内执行，避免客户端先读后写产生的竞争；数值类型和溢出仍受命令约束。

缓存整个对象适合一起读取和整体更新；Hash 支持字段操作，但内存和网络开销取决于编码、字段大小与访问模式，不能绝对断言哪个总是更省。String 的底层编码可能是整数、embstr 或 raw 等，实现取决于版本和值。

`SET ... NX EX` 将“仅当不存在时设置”和过期时间合并到同一命令，可作为锁获取的基本操作；释放锁必须校验唯一 token，不能无条件删除。`INCR` 可用于访问次数，但高频计数还要处理 key 过期、是否允许负数与溢出。批量命令减少网络往返，集群环境中多 key 是否允许执行取决于 slot。

## List

有序、允许重复，适合按两端插入和移除。`LPUSH` / `RPUSH`、`LPOP` / `RPOP`、`LRANGE`、`LLEN`、`BLPOP` / `BRPOP` 可实现简单队列。阻塞弹出是消费等待机制，不等同于持久化确认和失败重投；查看长列表时避免无限制 `LRANGE 0 -1`。现代版本通常采用 quicklist，节点内部编码随版本变化。

例如生产者执行 `RPUSH jobs task1`，消费者执行 `BLPOP jobs 10`，列表为空时最多等待约定时间。若消费者弹出后崩溃，任务不再留在原列表，需设计处理中队列、确认和重试；广播给所有订阅者则不是普通竞争弹出的语义。

## Hash

一个 key 下保存字段和值：`HSET`、`HGET`、`HMGET`、`HINCRBY`、`HDEL`、`HSCAN` 适用于对象、用户资料、购物车等按字段访问场景。大对象、热 key 和一次读取全部字段需要控制；普通 key 过期与字段过期是不同能力，后者的可用性取决于 Redis 版本。

购物车可用 `HSET cart:42 item:7 2` 保存商品数量、`HINCRBY cart:42 item:7 1` 原子增量；价格库存与订单最终状态仍应由业务权威数据源校验。

## Set

无序、不重复：`SADD`、`SREM`、`SISMEMBER`、`SCARD`、`SINTER` / `SUNION` / `SDIFF`。常用于去重、标签、共同关注与抽样；`SRANDMEMBER` 抽样不移除，`SPOP` 抽样并移除。大集合的集合运算可能耗时，应限制规模。

两个用户的关注集合通过 `SINTER` 得到共同关注，`SDIFF` 可查一方有而另一方没有的成员；结果很大时要评估服务端计算和返回量，不能把集合运算视为无成本。

## Sorted Set

成员唯一，每个成员对应 score，按分数排序；同分时按成员字典序比较。`ZADD`、`ZINCRBY`、`ZSCORE`、`ZRANGE`、`ZRANK` 可实现排行榜和按时间扫描任务。使用截止时间作 score 的延时任务仍需设计领取、确认、重试和幂等，不能只凭扫描保证可靠消费。

例如 `ZADD scores 90 alice 80 bob` 记录分数，`ZINCRBY scores 5 bob` 增加分数；查询榜首时注意命令默认升序，以及 `REV`、分数边界、排名从零开始等参数和版本差异。整数能否无损表示还受 score 双精度表示范围限制。

短小集合可采用紧凑编码，规模扩大后通常由字典与跳表等结构支撑；阈值及具体编码因 Redis 版本和配置而异。
