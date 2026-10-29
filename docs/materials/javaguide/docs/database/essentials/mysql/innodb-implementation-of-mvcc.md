---
title: InnoDB 如何实现 MVCC
---

# InnoDB 如何实现 MVCC

来源：[JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/innodb-implementation-of-mvcc.md)，快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

MVCC 结合行版本和 Read View 实现一致性非锁定读。InnoDB 修改记录时保留用于回滚和构造历史版本的 undo 信息；快照读在当前版本不可见时沿版本链找到可见的旧版本。它减少读写冲突，不意味着写写冲突或所有读写均不会等待。

## 版本链与视图

- `DB_TRX_ID` 表示最近修改该记录的事务；`DB_ROLL_PTR` 指向对应 undo 信息。表没有合适主键或唯一非空索引时，InnoDB 可生成隐藏行 ID 作为聚簇索引。
- Read View 包含创建者事务、创建视图时活跃事务集合、活跃事务最小 ID 和当时的分配上界。具体字段命名取决于版本。
- 版本由当前事务产生时对自身可见；低于活跃事务下界的版本通常可见；达到或超过视图创建时上界的版本不可见；处于中间区间时，若创建者仍在视图活跃集合中则不可见，否则可见。不可见时继续沿 undo 版本链查找。
- 删除也以可恢复的版本信息参与判断。旧版本需保留至不再被任何存活视图需要，长事务可能阻碍 purge 并增加 undo 历史。

例：Read View 创建时活跃事务为 101、102，当前事务为 103、上界为 104；版本事务 102 在活跃集合中不可见，沿版本链找到事务 1 的版本则可见。之后 101、102 即使提交，该旧视图仍保持判断结果。

## 快照读和当前读

RC 下每次一致性读创建新视图；RR 通常在首次一致性读创建视图并在同一事务复用。`START TRANSACTION WITH CONSISTENT SNAPSHOT` 等语句会影响建立时机。`SELECT ... FOR UPDATE`、`FOR SHARE` / `LOCK IN SHARE MODE` 以及更新删除的当前读需要按隔离级别获取锁。

RR 的一致性读稳定读取视图；当前读可能使用 next-key lock 约束范围内新插入，实际锁定取决于索引与访问路径。混用早先快照读和之后当前读可能看到不同集合，不能断言所有幻读情形都被消除。
