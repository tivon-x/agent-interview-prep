---
title: MySQL 查询缓存与版本边界
---

# MySQL 查询缓存与版本边界

来源：[JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/mysql-query-cache.md)，快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

MySQL 旧版查询缓存保存完整 SELECT 结果，查询文本和相关上下文需要匹配；命中可绕过后续查询执行。涉及的表发生数据变更时，相关缓存失效。事务状态、非确定性函数、用户变量等也可能限制缓存使用，具体规则以所用版本为准。

优点是重复且很少更新的完全相同查询可能节省计算；缺点是表更新频繁时失效多、维护和同步成本高、内存碎片及全局竞争可能抵消收益。不同 SQL 文本、大小写或上下文也可能影响命中。

MySQL 5.7 可通过 `query_cache_type`、`query_cache_size` 等旧配置管理；**MySQL 8.0 已移除查询缓存**，这些参数和 `SQL_CACHE` 不是 8.0 通用优化手段。它不同于 InnoDB Buffer Pool 的数据页缓存，也不同于 Redis 或应用层缓存；应用层缓存须自己处理失效和一致性。
