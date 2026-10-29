---
title: MySQL EXPLAIN 执行计划
---

# MySQL EXPLAIN 执行计划

来源：[JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/mysql-query-execution-plan.md)，快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

`EXPLAIN SELECT ...` 查看优化器估计的执行计划；`EXPLAIN FORMAT=JSON` 展示更详细的信息。MySQL 8.0.18 起 `EXPLAIN ANALYZE` 会实际执行查询并给出实际耗时、行数和循环次数，应避免在生产环境对高成本查询盲目运行。

## 先看哪些字段？

| 字段 | 核对重点 |
| --- | --- |
| `id` / `select_type` | 查询块标识和类型，如 SIMPLE、PRIMARY、SUBQUERY、DERIVED、UNION；不要仅凭数字机械推断完整执行顺序 |
| `table` / `partitions` | 访问的表、派生表或分区 |
| `type` | 访问方式，如 const、eq_ref、ref、range、index、ALL；index 是全索引扫描，ALL 是全表扫描 |
| `possible_keys` / `key` | 候选索引与实际选用索引；有候选不代表最终使用 |
| `key_len` / `ref` | 索引键使用的最大字节长度和比较对象；长度受编码、可空等影响，不能单靠它断言完整谓词 |
| `rows` / `filtered` | 估计扫描行数和条件过滤比例；`rows × filtered / 100` 可粗估向后续 JOIN 传递的行数 |
| `Extra` | 覆盖索引、条件下推、排序和临时表等补充信息 |

`Using index` 通常表示覆盖索引；`Using index condition` 是索引条件下推；`Using where` 表示仍需过滤；`Using filesort` 表示额外排序，不必然发生磁盘 I/O；`Using temporary` 表示使用临时表。`index_merge` 可能合并多个索引的并集或交集。

## 如何理解访问方式？

`const` 常对应完整主键或唯一键定位至最多一行；`eq_ref` 常见于关联时每个外层行最多命中一个唯一非空索引行；`ref` 可匹配多个索引项；`range` 使用索引范围；`index` 扫描整棵索引；`ALL` 扫描表。它们不是整个查询性能的绝对排序：匹配率、循环次数、覆盖和回表都会改变总成本。

例：`EXPLAIN SELECT id, name FROM users WHERE name='Ada'`；若 `key=idx_name`、`type=ref`，说明计划使用该索引进行引用查找。继续查看 `rows`、`filtered` 和 `Extra`，再和 `EXPLAIN ANALYZE` 的实际行数与循环次数比较；`rows=1000, filtered=10` 粗估会向后续关联传递约 100 行，并非实际保证值。

索引合并可能显示 `Using union(...)`、`Using sort_union(...)` 或 `Using intersection(...)`；JOIN 也可能使用 join buffer 或 hash join，具体算法和可用条件需查看执行计划与版本，而非从一个 `type` 值推断。`Using temporary` 或 `Using filesort` 值得检查，但并非一定错误或性能问题。

## 如何结合实际结果判断？

计划是成本估计而非实际结果。核对实际扫描量、回表次数、排序、JOIN 扇出和耗时；即使 `type=ref` 也可能因匹配大量行很慢，而小表的全表扫描可能合理。统计信息失真时可审慎分析 `ANALYZE TABLE` 的适用性与影响，不用单个字段代替完整性能评估。
