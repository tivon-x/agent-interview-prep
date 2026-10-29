---
title: 数据库笔试与面试重点笔记
chapterGroups: true
---

# 数据库笔试与面试重点笔记

依据 [JavaGuide 数据库专题](https://javaguide.cn/database/)整理，覆盖 SQL、MySQL 和 Redis，按原文章节保留知识点及练习。原文快照：`992dae31eade2a34ba8dbbbcf5ed9de5511325ec`；各篇链接指向对应原文。

Redis 集群独立文章仅有付费资料入口，免费内容中的相关知识见 Redis 面试题。

## SQL 与数据库基础

- [数据库基础常见面试题总结](./sql/basis.md)
- [SQL语法基础知识总结](./sql/sql-syntax-summary.md)
- [SQL常见面试题总结（1）](./sql/sql-questions-01.md)
- [SQL常见面试题总结（2）](./sql/sql-questions-02.md)
- [SQL常见面试题总结（3）](./sql/sql-questions-03.md)
- [SQL常见面试题总结（4）](./sql/sql-questions-04.md)
- [SQL常见面试题总结（5）](./sql/sql-questions-05.md)

## MySQL

- [MySQL常见面试题总结](./mysql/mysql-questions-01.md)
- [MySQL索引详解](./mysql/mysql-index.md)
- [MySQL索引失效场景总结](./mysql/mysql-index-invalidation.md)
- [MySQL隐式转换造成索引失效](./mysql/index-invalidation-caused-by-implicit-conversion.md)
- [MySQL事务隔离级别详解](./mysql/transaction-isolation-level.md)
- [InnoDB存储引擎对MVCC的实现](./mysql/innodb-implementation-of-mvcc.md)
- [MySQL三大日志(binlog、redo log和undo log)详解](./mysql/mysql-logs.md)
- [SQL语句在MySQL中的执行过程](./mysql/how-sql-executed-in-mysql.md)
- [MySQL执行计划分析](./mysql/mysql-query-execution-plan.md)
- [MySQL高性能优化规范建议总结](./mysql/mysql-high-performance-optimization-specification-recommendations.md)
- [一千行 MySQL 学习笔记](./mysql/a-thousand-lines-of-mysql-study-notes.md)
- [MySQL备份与恢复详解：mysqldump、XtraBackup、binlog和PITR](./mysql/mysql-backup-and-restore.md)
- [MySQL数据同步到Elasticsearch详解：常见方案与一致性处理](./mysql/mysql-to-elasticsearch-sync.md)
- [MySQL查询缓存详解](./mysql/mysql-query-cache.md)
- [MySQL自增主键一定是连续的吗？](./mysql/mysql-auto-increment-primary-key-continuous.md)
- [MySQL日期类型选择建议](./mysql/some-thoughts-on-database-storage-time.md)

## Redis

- [缓存基础常见面试题总结](./redis/cache-basics.md)
- [Redis常见面试题总结(上)](./redis/redis-questions-01.md)
- [Redis常见面试题总结(下)](./redis/redis-questions-02.md)
- [Redis 5 种基本数据类型详解](./redis/redis-data-structures-01.md)
- [Redis 3 种特殊数据类型详解](./redis/redis-data-structures-02.md)
- [3种常用的缓存读写策略详解](./redis/3-commonly-used-cache-read-and-write-strategies.md)
- [Redis持久化机制详解](./redis/redis-persistence.md)
- [Redis常见阻塞原因总结](./redis/redis-common-blocking-problems-summary.md)
- [Redis内存碎片详解](./redis/redis-memory-fragmentation.md)
- [Redis为什么用跳表实现有序集合](./redis/redis-skiplist.md)
- [如何基于Redis实现延时任务？](./redis/redis-delayed-task.md)
- [如何基于Redis实现消息队列？](./redis/redis-stream-mq.md)
- [Redis 集群（原文无免费正文）](./redis/redis-cluster.md)
