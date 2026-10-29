---
title: MySQL 索引无法有效使用的场景
---

# MySQL 索引无法有效使用的场景

来源：[JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/mysql-index-invalidation.md)，快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

“未使用索引”“扫描全索引”“未利用全部联合索引列”和“优化器认为全表扫描更便宜”是不同情况。要结合版本、实际数据、参数类型和 `EXPLAIN` 判断。

| 场景 | 原因与处理 |
| --- | --- |
| `SELECT *` | 可能失去覆盖，需要大量回表；不是必然不用索引。只取需要的列并比较计划 |
| 联合索引缺少左侧列 | 通常难以直接用完整键前缀定位；部分版本/场景可能选择 skip scan 等其他访问方式 |
| 索引列上函数、计算、转换 | 普通索引可能不能直接定位；可改写条件，或按版本考虑函数索引/生成列 |
| `LIKE '%abc'` | 前置通配符通常无法用常规 B+ 树前缀定位；`LIKE 'abc%'` 有机会走范围扫描 |
| `OR`、`IN`、`NOT IN` | 是否使用索引、index merge 或扫描取决于各条件、数据分布、成本和 NULL 语义；不能一概而论 |
| 字符列与数字参数比较 | 隐式转换可能妨碍字符串索引定位；绑定与列相同的类型 |
| `ORDER BY` | 筛选列、排序方向、联合索引顺序与范围条件可能使索引无法满足排序；`filesort` 不一定是磁盘排序 |

确认 `possible_keys` 与实际 `key`、`type`、预估和实际扫描行数、覆盖/回表及排序；对同一查询在生产数据规模下比较方案，不把出现索引名当作性能达标。

## 典型条件对照

```sql
-- 假设联合索引为 (user_id, created_at)，且 created_at 是日期时间
SELECT id FROM orders WHERE user_id = 7 AND created_at >= '2025-01-01';
SELECT id FROM orders WHERE DATE(created_at) = '2025-01-01';
```

第一条可考虑以索引前缀 user_id 加时间范围定位；第二条对列做函数计算，普通索引通常难以直接按原值范围定位。可改写为 `created_at >= '2025-01-01' AND created_at < '2025-01-02'`，并根据实际业务时区与数据类型确定边界。若 SQL 仍只按时间过滤，索引首列缺失也影响访问方式；需要考虑单独索引、skip scan 或接受扫描的成本。

对 `name LIKE 'Ann%'` 可考虑前缀范围，`name LIKE '%Ann'` 普通 B+ 树通常无法按前缀定位；是否选索引仍取决于排序规则、选择率与计划。`OR` 两边均可使用不同索引时优化器可能选择 index merge，但一边条件无有效索引或选择率太低时可能扫描；`NOT IN` 若集合包含 `NULL` 会影响 SQL 三值逻辑，不可只为索引将其机械改写。
