---
title: 中国银行信息科技岗阅读路线
description: 根据两类岗位面经，按数据库、Java、数据分析、计算机基础和银行科技场景选择已有资料。
---

# 中国银行信息科技岗阅读路线

先看[技术考点](index.md)，再按下面的顺序读；每读完一项，合上资料试着回答对应问题。优先级是根据两类面经和你的 Python、AI 应用背景安排的，不代表实际面试的固定考察比例。站内 JavaGuide 是快照，也可以对照 [JavaGuide 计算机基础目录](https://javaguide.cn/cs-basics/)阅读更新内容。

## 第一优先：直接对应题目

### 1. 数据库与缓存

1. 先看[Python 与开发基础](../cmb-ai/fundamentals.md)的数据库部分：SQL、主键、索引、事务和慢查询，建立回答框架。
2. 读 [MySQL 索引](../../materials/javaguide/docs/database/mysql/mysql-index.md)与[事务隔离级别](../../materials/javaguide/docs/database/mysql/transaction-isolation-level.md)：重点讲清索引的收益与代价、ACID、并发事务问题和隔离级别。再看 [MySQL 面试题](../../materials/javaguide/docs/database/mysql/mysql-questions-01.md)查漏。
3. 看 [Redis 常见面试题](../../materials/javaguide/docs/database/redis/redis-questions-01.md)中的数据类型及场景；再看[分布式事务](../../materials/javaguide/docs/distributed-system/distributed-transaction.md)中的 2PC、TCC 和可靠消息，能说明一致性与复杂度的取舍即可。

**读完能答：** 索引为什么加快查询、事务怎样保护转账、Redis 类型怎么选、跨服务事务为什么更复杂。MySQL 与 Oracle 的差异本路线暂没有对应的专门资料，先了解各自的定位和常见 SQL、事务差异，不把某版本的差异当成通用结论。

### 2. Java 与并发

1. 看 [Java 基础面试题](../../materials/javaguide/docs/java/basis/java-basic-questions-01.md)及[第二篇](../../materials/javaguide/docs/java/basis/java-basic-questions-02.md)，按目录定位基本类型、包装类、相等比较和异常处理。
2. 看[并发基础](../../materials/javaguide/docs/java/concurrent/java-concurrent-questions-01.md)、[锁](../../materials/javaguide/docs/java/concurrent/java-lock.md)和[并发容器](../../materials/javaguide/docs/java/concurrent/java-concurrent-collections.md)，重点是线程安全、`synchronized` 和常见容器用途。
3. 看 [JVM 面试题](../../materials/javaguide/docs/java/jvm/jvm-interview-questions.md)的内存与排查部分，区分内存泄漏与内存溢出。

**读完能答：** `int` 和 `Integer` 如何比较、异常怎么处理、多个线程共享数据有什么问题。结合自己真实接触过的 Java 工作说明熟悉程度，不把学习材料里的示例当成经历。

### 3. 数据分析与模型

- [特征处理与 PCA](../ml-basics/06-clustering-features.md)：先读特征处理和 PCA，回答缺失值、特征选择与降维；聚类细节按时间选读。
- [指标与类别不平衡](../ml-basics/02-evaluation.md)：重点看准确率、精确率、召回率及类别不平衡，解释为什么准确率高不一定能投入使用、预测错误如何评估。
- [CNN 基础](../dl-basics/05-cnn.md)：理解卷积和主要结构即可，除非项目或面试官深入追问，再看尺寸计算。
- [Python 与开发基础](../cmb-ai/fundamentals.md)：复习异常、容器、异步与线程；PyTorch 只按真实掌握情况准备。

ETL 的抽取、转换、加载，以及 ODS、DWD、DWS 的分层概念可先用[后端与数据平台检查表](../backend-checklist.md)列提纲；这份检查表只有关键词，不是完整讲解，数据清洗流程、数仓分层和非结构化数据处理需要另找资料补充。

## 第二优先：基础与银行场景

### 4. 网络与操作系统

这些是对开发基础的补充，并非本次题库中明确出现的全部原题。先读 JavaGuide [计算机网络面试题上](../../materials/javaguide/docs/cs-basics/network/other-network-questions.md)和[下](../../materials/javaguide/docs/cs-basics/network/other-network-questions2.md)，重点看 HTTP / HTTPS、TCP / UDP 和一次请求的过程。再看[操作系统面试题上](../../materials/javaguide/docs/cs-basics/operating-system/operating-system-basic-questions-01.md)的进程线程、死锁、内存管理。

时间有限时，把 [JavaGuide 计算机基础目录](https://javaguide.cn/cs-basics/)作为查漏入口，不必从头读完整套；数据结构先复习数组、链表、哈希表、栈和队列，以及它们的基本操作和复杂度。

### 5. 银行科技应用

看[银行 AI 应用与风险](../cmb-ai/bank-fit.md)中敏感数据、知识助手设计和运行风险部分，练习把 AI、数据分析或区块链放进具体业务场景，说明作用、限制和人工兜底。该页面中的招商银行产品和机构介绍只适用于招行，不能当作中国银行的事实。

再用[后端检查表](../backend-checklist.md)复习接口、超时、重试、幂等、权限和审计，尝试回答电子银行后台效率与手机银行体验问题。区块链、物联网、5G 只需先能说清概念与应用边界；不要把区块链记录等同于保证源头数据真实。

## 最后怎么检验

回到[技术考点](index.md)，分别用 30～60 秒口述数据库索引、事务、Java 并发、数据清洗、模型评估和银行 AI 场景；卡住时回对应章节。面经中的题目可能随个人项目追问，不能据此推断下一场面试一定会考哪些题。
