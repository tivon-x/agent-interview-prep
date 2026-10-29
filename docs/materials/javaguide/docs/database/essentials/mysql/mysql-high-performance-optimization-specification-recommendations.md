---
title: MySQL 表结构、索引与 SQL 优化
---

# MySQL 表结构、索引与 SQL 优化

来源：[JavaGuide 整理](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/mysql-high-performance-optimization-specification-recommendations.md)，作者听风，[原文](https://www.cnblogs.com/huchong/p/10219318.html)，JavaGuide 获授权并补充；快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

## 表和字段

结合事务和恢复需求选择存储引擎，MySQL 通常使用 InnoDB。命名统一、为字段写清语义和单位；字符集、排序规则在库表及关联字段间保持一致，现代 MySQL 常用 `utf8mb4`。选择满足范围的合适整数类型、以 `DECIMAL` 保存精确金额；日期使用日期类型，不用无约束字符串。

是否允许 `NULL` 由业务语义决定，查询时注意三值逻辑；`TEXT`、`BLOB`、枚举、分区和反范式均有适用场景，避免把旧规约的“禁止”或固定行数阈值当成通用事实。大文件通常放对象存储并在数据库保存标识，但要考虑权限、生命周期与一致性。结合访问方式控制单表规模和列数；容量瓶颈应通过实测确定。

## 索引

为 InnoDB 表选择稳定且合理的主键；根据高频过滤、JOIN、排序和覆盖查询设计联合索引及列顺序。检查重复或冗余索引，避免为每列单独建索引；索引数量越多，写入和空间成本越高。索引是否足够需要结合实际计划和负载，原文中的“最多 5 个”等数字只是旧规约示例。

## SQL 与操作

- 显式列出 `SELECT` 和 `INSERT` 字段，避免依赖列顺序；使用参数化语句，校验输入类型。
- 关注类型隐式转换、列上函数运算、深分页、无界排序或随机排序、过量回表和大结果集；用执行计划及耗时数据验证。
- 子查询、JOIN、`IN`、`OR` 的优劣取决于优化器和语义，不应机械替换；`UNION ALL` 不去重，只有业务不需去重时才能代替 `UNION`。
- 对海量更新、删除、DDL 做分批、限速和回滚预案；在线 DDL 或在线变更工具的适用性要按版本和锁行为验证。
- 区分生产、测试账号，遵守最小权限；禁止将生产系统当作随意压测环境，性能实验须有明确环境和授权。
