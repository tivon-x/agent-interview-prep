---
title: 招行 AI 一面：Python 与开发基础
description: Java 和数据库问法、Python 异常与浅拷贝、SQL、异步并发，以及代码和 AI 应用提效。
---

# Python 与开发基础

这一章用 20 分钟过完。优先练“Java、数据库、异常、浅拷贝、效率”五类问法。

## 1. 会不会 Java？

> 我的主要开发语言是 Python，实习中接触过 Java 的业务动作封装和接口定义。AI 应用这部分我更熟悉 Python、FastAPI 和 LangGraph；如果岗位需要 Java，我愿意结合项目补齐语言、框架和工程规范。

如果问“Java 和 Python 有什么区别”：

> Java 是静态类型语言，通常先编译为字节码，再由 JVM 执行；Python 是动态类型语言，写脚本、数据处理和 AI 应用比较方便。两者都能做后端，具体使用要考虑团队技术栈、现有系统和性能要求。

## 2. 会不会数据库？用过什么？

> 我学过数据库系统，能够用 SQL 做查询、关联、聚合和基本数据维护，个人 AI 应用中也用到 SQLite 管理应用数据。关系型数据库适合保存用户、文档和任务等结构化信息；向量索引用于语义检索，两者在 RAG 应用里通常配合使用。

### 数据库基础快问

| 问题 | 回答要点 |
| --- | --- |
| 主键和索引有什么作用？ | 主键唯一标识一条记录；索引用于加快符合条件的查询，也会增加存储和写入成本。 |
| 事务的 ACID？ | 原子性、一致性、隔离性、持久性。多步业务要一起成功或回滚时，需要事务。 |
| INNER JOIN 和 LEFT JOIN？ | INNER JOIN 保留匹配的记录；LEFT JOIN 保留左表记录，右表不匹配的字段为 NULL。 |
| WHERE 和 HAVING？ | WHERE 在分组前筛选行，HAVING 对分组和聚合结果筛选。 |
| SQL 慢怎么排查？ | 先看执行计划、扫描行数和索引使用，再检查条件、关联、排序及返回量。 |
| 联合索引？ | 由多个字段组成，字段顺序影响可用的查询方式；设计时结合常用筛选与排序。 |
| SQL 注入怎么防？ | 使用参数化查询，把数据作为参数传入，避免直接拼接 SQL。 |

### 能看懂这段 SQL

统计一段时间内，各类 AI 请求的调用量和平均耗时，并只保留至少 10 次调用的类别：

```sql
SELECT task_type,
       COUNT(*) AS call_count,
       AVG(latency_ms) AS avg_latency_ms
FROM ai_requests
WHERE created_at >= '2026-11-01'
  AND created_at < '2026-11-06'
GROUP BY task_type
HAVING COUNT(*) >= 10
ORDER BY call_count DESC;
```

解释顺序：**时间过滤 → 按任务类型分组 → 聚合 → 筛选分组 → 排序。**

## 3. Python 怎么抛出错误？

> 用 `raise` 抛出异常，比如 `raise ValueError("amount must be positive")`。调用方用 `try / except` 处理；`finally` 用来做清理。如果在处理异常时需要继续交给上层，可以直接写 `raise` 重新抛出。

```python
def validate_amount(amount):
    if amount <= 0:
        raise ValueError("amount must be positive")
    return amount


try:
    validate_amount(-1)
except ValueError as exc:
    print(f"Invalid input: {exc}")
finally:
    print("Validation finished")
```

追问时补充：尽量捕获具体异常；记录错误并给出处理结果；需要保留原始错误原因时用 `raise NewError(...) from exc`。

## 4. Python 浅拷贝怎么实现？和深拷贝有什么区别？

> 浅拷贝可以用 `copy.copy()`，列表还可以用 `a.copy()`、`a[:]` 或 `list(a)`。它会创建一个新的外层容器，里面的元素仍引用原对象；如果元素是可变对象，修改内部对象会互相影响。深拷贝用 `copy.deepcopy()`，会递归复制内部对象。

```python
import copy

original = [[1], [2]]
assigned = original
shallow = original.copy()
deep = copy.deepcopy(original)

shallow[0].append(3)
print(original)  # [[1, 3], [2]]
print(deep)      # [[1], [2]]

shallow.append([4])
print(len(original))  # 2
print(len(shallow))   # 3
print(assigned is original)  # True
print(shallow is original)   # False
```

一句话记忆：**赋值共享对象，浅拷贝只复制外层，深拷贝递归复制。**

## 5. 代码怎么提升效率？

> 我会先定位瓶颈，再决定优化方式。计算慢就检查算法、数据结构和重复计算；数据库慢就看查询和索引；网络或模型调用慢就考虑异步、合理并发、缓存和减少调用。优化后在相同输入下比较耗时、资源消耗和结果质量。

如果问的是“怎么提高开发效率”：

> 我会复用已有工具和公共逻辑，把重复操作脚本化，保持函数职责清楚，配合 Git、日志和自动化检查。AI 可以辅助阅读、起草和排错，关键逻辑由自己检查，再通过实际运行判断结果。

### 放到你的 AI 项目里怎么讲？

> 比如 RAG 应用里，文档解析和 embedding 可以在导入阶段完成，提问时直接检索；检索后通过重排和上下文预算，把更有价值的内容交给模型。互不依赖的查询可以合理并行，重复请求可以在权限与版本允许时复用结果。优化时也要看回答质量有没有下降。

## 6. async / await、线程和进程怎么选？

> 请求模型、搜索和数据库这类 I/O 等待多的任务，适合使用异步或线程来提高并发；CPU 密集任务可以考虑多进程，或者交给能够释放 GIL 的底层库。`async / await` 需要配合异步接口，直接在异步函数里执行长时间阻塞操作，仍会阻塞事件循环。

工程上还要设置并发上限、超时和失败处理，避免请求数量超过外部服务或本地资源的承受范围。

## 7. FastAPI 在你的项目里负责什么？

> FastAPI 负责把知识库、检索和聊天等功能提供为后端接口，接收并校验请求，调用业务逻辑，再返回结果。比较耗时的文档导入可以交给后台任务；聊天过程可以用 SSE 向前端发送进度和最终答案，让用户知道系统正在处理什么。

## 8. 列表、元组、字典，平时怎么选？

> 列表适合保存可变的有序集合，元组适合表达固定的一组值，字典适合按 key 查找和组织字段。比如检索结果可以用列表，文档元数据可以用字典。字典基于哈希实现，查找平均时间复杂度通常是 O(1)。

异常与拷贝语义可对照 [Python 官方异常文档](https://docs.python.org/zh-cn/3/tutorial/errors.html)和 [copy 文档](https://docs.python.org/zh-cn/3/library/copy.html)。
