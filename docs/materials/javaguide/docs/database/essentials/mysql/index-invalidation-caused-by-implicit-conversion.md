---
title: MySQL 隐式转换与索引
---

# MySQL 隐式转换与索引

来源：[JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/index-invalidation-caused-by-implicit-conversion.md)；原文另注明 [出处](https://www.guitu18.com/post/2019/11/24/61.html)，实验基于 MySQL 5.7.26。快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

比较的列和参数类型不一致时 MySQL 可能隐式转换，转换发生在索引列一侧时尤其可能失去有效的索引定位能力，也可能改变结果。例：`num` 是整数索引列、`code` 是 `VARCHAR` 索引列：

```sql
SELECT * FROM test1 WHERE num = 10000;
SELECT * FROM test1 WHERE num = '10000';
SELECT * FROM test1 WHERE code = 10000;
SELECT * FROM test1 WHERE code = '10000';
```

原文的 5.7 实验中，第 3 条不能按字符串索引精确定位：多个不同字符串如 `'10000'`、`'010000'` 进行数值转换后可能比较相等。第 1、2、4 条在该样本中可使用索引；这不是对所有数据、版本和计划的保证。数值型列与字符串常量比较也可能受到数据类型、范围、排序规则等影响，不应依赖隐式转换。

给绑定参数使用与列一致的类型，字符列使用字符串参数；关联列的数据类型、字符集和排序规则也应检查。使用 `EXPLAIN` / `EXPLAIN ANALYZE`、警告信息及真实数据核验计划；`key`、`type` 与扫描行数共同判断，扫描二级索引也不等于有效的等值索引查找。

`NULL` 和普通比较通常得到 `UNKNOWN`，MySQL 的 `<=>` 是 NULL 安全等值比较。字符串转数字的细节受 SQL 模式、上下文和版本影响，不能把旧版实验概括成通用解析器规则。
