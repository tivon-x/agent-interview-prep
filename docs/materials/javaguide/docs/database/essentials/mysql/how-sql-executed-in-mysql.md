---
title: SQL 在 MySQL 中如何执行
---

# SQL 在 MySQL 中如何执行

来源：[JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/how-sql-executed-in-mysql.md)，作者[木木匠](https://github.com/kinglaw1204)；快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

## Server 层与存储引擎

连接器负责连接、认证及会话；分析器解析 SQL 和名称；优化器结合统计信息与可用索引选择计划；执行器按计划调用存储引擎读取或修改数据。Server 层负责 SQL、权限及执行协调，InnoDB 等存储引擎通过接口提供表数据和索引能力。

MySQL 5.7 的查询缓存按查询文本及相关条件缓存完整结果，表发生修改会使关联缓存失效；MySQL 8.0 已移除该功能，不能把旧版查询缓存当成当前通用查询流程。

## 查询与更新

普通查询经过连接与权限检查、解析、优化和执行；是否全表扫描、二级索引扫描、覆盖索引或回表由计划及数据决定。一致性读在 InnoDB 中按隔离级别和 Read View 选择可见版本。

更新需要定位行、检查约束、获取所需锁并修改记录；undo log 支持回滚和旧版本读取，redo log 支持崩溃恢复，binlog 用于复制和基于时间点恢复。开启 binlog 时，InnoDB 与 Server 层通过协调提交保障 redo 和 binlog 的一致性；实际写入和持久化时点受事务、组提交和刷盘配置影响。
