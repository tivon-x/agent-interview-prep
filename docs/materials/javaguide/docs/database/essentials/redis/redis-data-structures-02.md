---
title: Redis Bitmap、HyperLogLog 和 Geospatial
---

# Redis Bitmap、HyperLogLog 和 Geospatial

根据 [JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/redis/redis-data-structures-02.md)整理，快照版本 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

## Bitmap

Bitmap 以 String 的位操作表示状态：`SETBIT key offset 1`、`GETBIT`、`BITCOUNT` 和 `BITOP`。用户 ID 可作为偏移，记录签到、活跃等布尔状态；按日使用不同 key，通过位运算求共同活跃。偏移决定所需长度，稀疏且很大的 ID 可能造成内存浪费；统计口径、位序与窗口需提前定义。

例如 `SETBIT active:day1 7 1` 标记编号 7 活跃，`GETBIT active:day1 7` 读取，`BITCOUNT active:day1` 统计标记数；`BITOP AND active:both active:day1 active:day2` 后可统计两天都活跃的编号。对未设置的位置读取通常为 0；大偏移的首次扩展可能造成分配开销。

## HyperLogLog

HyperLogLog 近似统计去重后的基数，适合页面 UV 等大量元素场景。`PFADD` 加入元素，`PFCOUNT` 估计基数，`PFMERGE` 合并多个统计。其空间开销较低但有估计误差，Redis 常见标准误差约 0.81%；不能列出具体元素，也不能替代需要精确去重的集合。实现可使用稀疏和稠密表示，稠密结构通常约 12 KB；实际总开销取决于编码和 key 等元数据。

例如按天 `PFADD uv:day1 user1 user2`，再用 `PFCOUNT uv:day1` 得估计去重人数；`PFMERGE uv:week uv:day1 uv:day2` 估算多个时间窗口的并集，而不是把各天计数直接相加。

## Geospatial

地理位置命令用于存经纬度并查询附近对象：`GEOADD`、`GEOPOS`、`GEODIST`、`GEOSEARCH`。数据基于有序集合与地理编码组织；旧版常见 `GEORADIUS`，新版本优先查看 `GEOSEARCH` 的可用性。查询半径、单位和返回数量应明确，球面距离、位置精度与地图业务距离不一定相同。

例如 `GEOADD shops 116.33 39.89 shop1` 按经度、纬度顺序保存，`GEODIST shops shop1 shop2 km` 查询两个成员距离；基于中心点与半径查询还需明确排序和结果上限。GEO 编码是索引工具，边界附近候选通常仍需按距离过滤。
