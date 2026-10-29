---
title: 数据库时间类型如何选择
---

# 数据库时间类型如何选择

来源：[JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/some-thoughts-on-database-storage-time.md)，快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。

优先用数据库的日期时间类型而非普通字符串：类型检查、范围查询、排序与日期运算更明确；字符串格式不统一时尤其容易产生比较和校验错误。

| 类型 | 语义与边界 |
| --- | --- |
| `DATE` | 只有日期，适合生日、账期等不含时刻的数据 |
| `DATETIME` | 日历日期和时间，不自动按会话时区转换；适合需保留本地日历时间的场景，时区需另行约定 |
| `TIMESTAMP` | MySQL 存取时与会话时区转换，范围比 `DATETIME` 窄；适合表达绝对时刻，需核对版本的范围和精度 |
| 整数时间戳 | 可表达绝对时刻，但需明确秒/毫秒、UTC、精度及取值范围，且转换展示和 SQL 日期运算不如原生类型直观 |

`DATETIME` 本身不保存时区，不能单凭字段判断事件发生的绝对时刻。跨时区系统应约定 UTC 或保存时区信息，并在应用与会话层保持一致；夏令时下本地时间可能重复或不存在。`TIMESTAMP` 范围与 2038 限制依数据库实现和版本核查，不能混同所有数据库。PostgreSQL 使用 `timestamp with time zone` / `timestamp without time zone`，不提供同名 MySQL `DATETIME`。
