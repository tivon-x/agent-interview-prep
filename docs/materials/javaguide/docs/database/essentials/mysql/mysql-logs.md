---
title: MySQL redo log、undo log 和 binlog
---

# MySQL redo log、undo log 和 binlog

来源：[JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/mysql-logs.md)，含程序猿阿星投稿和 JavaGuide 补充；快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

| 日志 | 作用 | 主要层次 |
| --- | --- | --- |
| redo log | 记录物理页修改相关信息，崩溃后重做已持久化日志 | InnoDB，循环使用 |
| undo log | 支持事务回滚及 MVCC 构造旧版本 | InnoDB，旧版本不再需要后由 purge 清理 |
| binlog | 记录已提交事务的变更事件，用于复制与时间点恢复 | Server 层，按文件追加 |

## redo 与 WAL

先记录 redo，再允许修改过的数据页持久化；提交不必等待所有脏数据页刷盘，恢复时可根据 redo 补做。`innodb_flush_log_at_trx_commit=1` 通常每次提交写入并刷盘，`2` 每次提交写入操作系统缓存、周期刷盘，`0` 通常周期写入并刷盘；0/2 在不同故障下可能丢失最近事务。实际持久性还依赖存储设备对 flush 的实现及配置。

redo log buffer、操作系统页缓存与持久化日志文件是不同层次；写入系统缓存不代表已刷到持久介质。检查点推进后，不再需要用于恢复的旧 redo 空间可被复用；日志容量与后台刷脏策略影响写入压力，但不是无限追加的归档文件。

## binlog 与两阶段提交

binlog 可使用 statement、row 或 mixed 格式，复制与恢复需要正确保留文件和位置/GTID；`sync_binlog` 控制同步频率。通常想降低崩溃丢失风险会综合考虑 `innodb_flush_log_at_trx_commit=1` 和 `sync_binlog=1`，仍需验证硬件及完整恢复链。

开启 binlog 时内部协调将 InnoDB redo 先置于 prepare，再写入并按配置持久化 binlog，随后完成提交。恢复时，对于处于 prepare 的事务，检查关联的完整 binlog/事务标识：存在对应已提交记录则完成提交，否则回滚。组提交、版本和配置会改变具体批次与写盘顺序；不能把两阶段提交等同跨所有外部系统的分布式事务。

例如 prepare 后、binlog 完整记录前崩溃，恢复时缺少对应完整提交记录，事务通常回滚；binlog 已完整记录、redo 尚未标记最终提交时，恢复过程可完成提交。上述判断前提是有关日志已按配置实际持久化，并且必须依实现识别完整事务。

## undo

undo 保存撤销修改及构造历史版本所需的信息，不应理解为简单保存反向 SQL 字符串。insert 的 undo 与 update/delete 的历史版本生命周期不同；长事务或长期 Read View 可能延迟清理。undo 自身也受 redo 保护。
