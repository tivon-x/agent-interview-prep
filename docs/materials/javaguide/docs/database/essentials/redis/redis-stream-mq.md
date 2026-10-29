---
title: Redis 消息队列：List、Pub/Sub 和 Stream
---

# Redis 消息队列：List、Pub/Sub 和 Stream

根据 [JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/redis/redis-stream-mq.md)整理，快照版本 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

## List

生产者从一端 `LPUSH` / `RPUSH`，消费者从另一端 `RPOP` / `LPOP`；`BLPOP` / `BRPOP` 可在没有数据时等待，避免频繁空轮询。多个消费者可竞争取任务，但普通弹出后消费者异常会使尚未处理的消息丢失；需要额外处理待处理队列、确认、超时重投和幂等。List 本身没有消费组、按消息 ID 查询和完整消费进度管理。

## Pub/Sub

发布者 `PUBLISH` 到频道，在线客户端通过 `SUBSCRIBE` 接收广播；多个订阅者均可收到同一消息。消息不是持久队列：订阅者断线或没有订阅者时消息不会自动积压重放，无法直接满足可靠消费和离线补收。

## Stream

Redis 5 起 Stream 提供有 ID 的追加消息流。`XADD` 写入；`XREAD` 按 ID 读取；`XGROUP`、`XREADGROUP` 组织消费组；消费者处理成功后 `XACK` 确认。未确认消息记录在 pending entries list（PEL），可用 `XPENDING` 检查，并通过 `XCLAIM` / `XAUTOCLAIM` 等按版本支持进行恢复。

同一个消费组的消费者通常分担消息，不同组各有消费进度；消费者宕机后需主动检查并重新领取 pending 消息。重复投递、处理成功但确认失败、消息截断与过期、服务持久化及故障恢复均需纳入设计；业务幂等和死信 / 重试策略仍由应用负责。Stream 是 Redis 内的数据结构，并不自动提供独立消息系统的所有可靠性和隔离能力。

Stream 的消息 ID 通常由时间戳和序号组成，内容为字段值对；内部使用紧凑结构与 radix tree 组织，支持 `XRANGE` / `XREVRANGE` 按 ID 查询。`XTRIM` 修剪、`XDEL` 删除、`XLEN` 查看长度，`XINFO` 查看流和消费组信息。消费者组记录 `last-delivered-id` 和已交付未确认消息，不应把读取位置误当作业务完成位置。

```text
XADD orders * order_id 42
XGROUP CREATE orders workers 0 MKSTREAM
XREADGROUP GROUP workers consumer-a COUNT 10 STREAMS orders >
XPENDING orders workers
XACK orders workers <message-id>
```

`>` 请求该组尚未投递的新消息，返回后先进入该组 PEL；处理成功后再用实际消息 ID 确认。若处理已产生外部效果但确认失败，恢复消费者可能再次领取，因此应以业务唯一标识去重。组从 `0` 还是 `$` 创建会影响从历史开始还是从新消息开始，实际行为需结合版本与需求检查。删除或裁剪消息与消费组的相互作用存在版本差异，不能把 PEL 条目当作永远保留的消息正文。

原文提及 Redis 8.2 对消息删除、修剪与消费组的交互进行了扩展，以及 Redis 8.6 的幂等生产能力；这些命令和行为需按实际部署版本查阅官方文档，生产侧去重也不等于消费副作用自动恰好一次。
