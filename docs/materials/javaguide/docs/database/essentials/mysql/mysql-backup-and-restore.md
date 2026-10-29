---
title: MySQL 备份、binlog 与恢复演练
---

# MySQL 备份、binlog 与恢复演练

来源：[JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/mysql-backup-and-restore.md)，快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

备份用于误删、损坏、故障和勒索后的恢复；主从复制会同步误操作，不能代替独立备份。**RPO** 是允许丢失的时间窗口，**RTO** 是允许的恢复时间；两者决定全量备份频率、binlog 保存与恢复设施。

## 备份方式

| 方式 | 特点 |
| --- | --- |
| 逻辑备份 | 导出 SQL 或逻辑数据，跨环境较灵活；大库导出导入慢，工具和对象覆盖需核对 |
| 物理备份 | 保存数据文件，恢复大库通常更快；版本、引擎、平台及工具兼容性需确认 |
| binlog 增量 | 从一致性全量备份对应位置/GTID 回放至目标时间或事件；依赖连续完整的 binlog 链 |

`mysqldump --single-transaction` 常用于 InnoDB 一致性逻辑备份，但不保证非事务表一致，备份期间 DDL 也可能破坏一致性；需要按权限和需求处理例程、触发器、事件及 GTID。MySQL Shell Dump Utilities 可并行导出/导入，实际兼容和选项以部署版本为准。XtraBackup 提供物理备份及 prepare 阶段，工具与 MySQL 版本必须匹配。

## 逻辑备份与恢复

```bash
mysqldump --host=127.0.0.1 --user=backup_user --password \
  --single-transaction --routines --events --triggers \
  --source-data=2 --databases order_db > order_db.sql
mysql --host=127.0.0.1 --user=restore_user --password < order_db.sql
```

示例中 `--databases` 让 dump 包含建库与选择库语句；如果只传库名，不自动得到同样的建库脚本。`--source-data=2` 以注释记录实例级 binlog 位点，配合 `--single-transaction` 时起始阶段可能短暂获取全局读锁，不能称作完全无锁；旧版本名称及可用选项按安装版本确认。例程、事件、触发器需要相应权限；部分库导出在 GTID 环境可能包含源实例的 GTID 状态，恢复到已有历史的实例前要明确评估 `--set-gtid-purged`，不要照搬默认值。

## 时间点恢复与物理备份

时间点恢复（PITR）：在隔离环境恢复全量备份，核对其位点/GTID，验证 binlog 连续，再按事件边界回放到误操作之前；按需要处理时区、跨库事务及幂等。不可假定仅凭一个日期字符串就安全排除目标事务。

先用 `mysqlbinlog --base64-output=DECODE-ROWS -vv binlog.000120` 解码便于检查的行事件；该输出用于检查，正式回放应按工具文档使用可执行输出。确定事件或事务边界后，`mysqlbinlog --start-position=154 --stop-position=987654 binlog.000120 | mysql --binary-mode ...` 是按位置回放的示意；实际位置必须来自备份和日志，不可直接复制示例数字。跨多个 binlog 时起始位置作用于第一个文件，结束位置作用于最后一个。按时间恢复还要核对工具执行环境时区。

物理备份需先备份数据、prepare 一致性状态，再在满足版本及空数据目录等前提下恢复；不能只复制正在运行实例的文件就断言可恢复。备份与回放都应首先在隔离环境演练，单库恢复还要评估跨库事务及实例级 binlog 的影响。

## 验证备份

备份需要异地、访问控制、加密、保留策略、成功告警和校验。定期恢复演练，记录实际耗时、数据完整性、事务一致性和应用验证；只确认备份文件存在，不能证明可恢复。
