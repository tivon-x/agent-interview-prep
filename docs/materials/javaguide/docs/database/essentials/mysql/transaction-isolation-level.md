---
title: MySQL 事务隔离级别
---

# MySQL 事务隔离级别

来源：[JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/transaction-isolation-level.md)，作者 SnailClimb、guang19；快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

## 并发读异常

- 脏读：读取到其他事务尚未提交的修改，修改可能回滚。
- 不可重复读：同一事务再次读取同一行，因其他事务提交更新或删除而看到不同结果。
- 幻读：同一事务按相同条件读取记录集合时，因其他事务插入或删除而看到集合变化。

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
| --- | --- | --- | --- |
| READ UNCOMMITTED | 可能 | 可能 | 可能 |
| READ COMMITTED | 避免 | 可能 | 可能 |
| REPEATABLE READ | 避免 | 避免 | SQL 标准仍允许；InnoDB 通过 MVCC 和范围锁在常见场景中防止 |
| SERIALIZABLE | 避免 | 避免 | 避免 |

InnoDB 默认 REPEATABLE READ，具体配置可用 `SELECT @@transaction_isolation` 查询。`START TRANSACTION` 开始事务，`COMMIT` 提交，`ROLLBACK` 回滚；`SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED` 设置会话级隔离级别。

## InnoDB 的读视图与范围锁

普通 `SELECT` 是一致性快照读。RC 下每次一致性读创建新 Read View；RR 通常在事务中首次一致性读创建视图并复用，但事务自身修改可见。`SELECT ... FOR UPDATE`、更新和删除属于当前读，根据执行计划和锁定范围加锁，RR 下范围扫描可能使用 next-key lock（记录锁 + 间隙锁）限制并发插入。

首次普通查询不锁住范围。其他事务插入提交后，同一事务中的后续当前读可能看到新行；混用快照读和当前读不能笼统断言“绝无幻读”。具体锁取决于索引、谓词和隔离级别。Serializable 并不意味着所有事务实际严格逐个执行，而是要求结果等价于某种串行执行。
