---
title: MySQL 自增主键为何不连续
---

# MySQL 自增主键为何不连续

来源：[JavaGuide 转载](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/mysql-auto-increment-primary-key-continuous.md)，作者飞天小牛肉，[原文](https://mp.weixin.qq.com/s/qci10h9rJx_COZbHV3aygQ)；快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

`AUTO_INCREMENT` 分配唯一候选值，不保证无空洞，也不能据此判断提交顺序、记录数量或业务流水连续性。

## 哪些情况会产生间隔？

1. **步长与偏移**：`auto_increment_increment` 和 `auto_increment_offset` 可令生成序列按指定步长前进；显式插入较大值也可能提高后续分配值。
2. **唯一键冲突或插入失败**：值可能已分配但行未成功写入，分配值一般不会归还。
3. **事务回滚**：已申请的自增值不会随回滚恢复；并发事务已使用更大值，回退计数会引入冲突或额外串行化。
4. **批量插入**：`INSERT ... SELECT` 等无法预知行数的语句可能预分配一批值，未用完的值产生空洞；具体分配受版本和自增锁模式影响。

## 分配、重启与锁模式

省略列或插入 `NULL` 通常触发分配；插入 `0` 是否触发还受 `NO_AUTO_VALUE_ON_ZERO` SQL 模式影响。MySQL 5.x 原文实验中 InnoDB 重启时可能从现有最大值重建计数；MySQL 8.0 增加自增计数持久化能力，但崩溃恢复细节仍取决于版本和持久化条件。`innodb_autoinc_lock_mode` 影响并发分配和基于语句复制的安全性，不能认为它能让所有已提交记录无间断。
