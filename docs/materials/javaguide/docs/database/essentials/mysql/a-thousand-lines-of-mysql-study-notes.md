---
title: MySQL 常用 SQL 操作速查
---

# MySQL 常用 SQL 操作速查

来源：[JavaGuide 转载](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/mysql/a-thousand-lines-of-mysql-study-notes.md)，[原文：一千行 MySQL 学习笔记](https://shockerli.net/post/1000-line-mysql-note/)；快照 `992dae31eade2a34ba8dbbbcf5ed9de5511325ec`。原文包含旧版命令和大量语法，具体兼容性须按服务端版本核对。

## 数据库、表和连接

`mysql -h host -P port -u user -p` 连接后输入密码；`SELECT DATABASE(), USER(), VERSION()` 查看上下文，`SHOW PROCESSLIST` 查看线程。避免把密码直接写在命令行参数中。

```sql
SHOW DATABASES;
CREATE DATABASE example CHARACTER SET utf8mb4;
USE example;
SHOW TABLES;
SHOW CREATE TABLE users;
DESCRIBE users;
CREATE TABLE users (id BIGINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL);
ALTER TABLE users ADD COLUMN created_at DATETIME;
CREATE INDEX idx_users_name ON users(name);
DROP INDEX idx_users_name ON users;
```

`ALTER TABLE` 可添加、修改、删除字段和索引；`MODIFY` 修改定义，`CHANGE` 可同时改名，须完整保留所需列属性。`CREATE TABLE new LIKE old` 复制表结构，`CREATE TABLE ... AS SELECT` 的索引和约束行为需核查。`DROP DATABASE`、`DROP TABLE` 和 `TRUNCATE TABLE` 会删除数据，执行前确认范围、恢复手段和权限。

`SHOW CREATE DATABASE example` 查看库定义，`SHOW ENGINES` 查看存储引擎。`CREATE TEMPORARY TABLE` 建立会话临时表，会话结束后释放；重命名可用 `RENAME TABLE old TO new`。`SHOW TABLE STATUS` 提供引擎、行数估计、空间等信息，InnoDB 行数并非精确值。

## 数据类型、约束和字符集

整数、定点 `DECIMAL`、浮点、字符、二进制、日期时间等按范围与业务语义选择。`PRIMARY KEY` 唯一非空，`UNIQUE`、`NOT NULL`、`DEFAULT`、`AUTO_INCREMENT`、`FOREIGN KEY` 各有各的约束作用；外键行为取决于引擎和定义。`CHARACTER SET` 控制编码，`COLLATE` 决定比较和排序规则；客户端、连接、数据库、表和列的配置可能不同，现代 MySQL 通常用 `utf8mb4`。

整数类型有不同范围，`UNSIGNED` 用于非负范围；`DECIMAL(p,s)` 适合精确十进制，浮点适合允许近似的数值。`CHAR` / `VARCHAR` 在长度与填充行为上不同，`TEXT` / `BLOB` 可存较大文本 / 二进制。`DATE`、`TIME`、`DATETIME`、`TIMESTAMP` 分别承载不同时间语义；MySQL `TIMESTAMP` 涉及会话时区。是否允许 NULL 应由业务决定，空值测试使用 `IS NULL` / `IS NOT NULL`，不是 `= NULL`。

## 查询与数据修改

```sql
INSERT INTO users (name) VALUES ('Ada');
UPDATE users SET name = 'Grace' WHERE id = 1;
DELETE FROM users WHERE id = 2;
SELECT name, COUNT(*) AS n FROM users WHERE id > 0
GROUP BY name HAVING COUNT(*) > 1 ORDER BY n DESC LIMIT 10;
```

`WHERE` 在分组前筛选，`HAVING` 在分组后筛选；`ORDER BY` 控制排序，`LIMIT` 限制结果。`INNER JOIN` 只保留匹配行，`LEFT JOIN` 保留左表未匹配行；条件放在 `ON` 或 `WHERE` 对外连接结果可能不同。`UNION` 去重，`UNION ALL` 保留重复；子查询可用于 `IN`、`EXISTS` 等，注意 NULL 与关联子查询的语义。`REPLACE` 遇唯一键冲突可能先删除旧行再插入，不是普通 UPDATE。

条件表达式还包括 `BETWEEN ... AND ...`、`IN (...)`、`LIKE` 和逻辑 `AND` / `OR` / `NOT`；`LIKE` 的 `%` 表示任意长度，`_` 表示一个字符。聚合函数 `COUNT`、`SUM`、`AVG`、`MIN`、`MAX` 聚合每组的行，`COUNT(*)` 与 `COUNT(nullable_column)` 的 NULL 计数不同。`DISTINCT` 按选中列组合去重。

```sql
SELECT u.id, o.id AS order_id
FROM users AS u LEFT JOIN orders AS o ON o.user_id = u.id;
SELECT id FROM users WHERE id IN (SELECT user_id FROM orders);
SELECT id FROM users WHERE id > 100 ORDER BY id LIMIT 20;
```

`JOIN` 需明确连接键，缺少条件可能得到笛卡尔积。深分页的 `OFFSET` 可能扫描并丢弃大量行；稳定唯一排序键下可考虑键集分页。修改和删除应先核验 WHERE、事务影响和目标数据。

## 事务、对象和维护

`START TRANSACTION` / `COMMIT` / `ROLLBACK` 控制事务；DDL、`TRUNCATE` 等语句可能隐式提交，具体行为按引擎和版本核查。视图保存查询定义，触发器响应特定表事件；存储过程和函数封装 SQL，变量、游标、条件处理及权限规则按版本和业务需求设计。显式表锁与行锁的作用域不同，事务中谨慎混用。

```sql
CREATE VIEW active_users AS SELECT id, name FROM users WHERE active = 1;
START TRANSACTION;
UPDATE accounts SET balance = balance - 10 WHERE id = 1;
COMMIT;
SHOW CREATE VIEW active_users;
```

视图能简化或限制查询，但不默认把结果物化，复杂视图也可能有性能成本。触发器通常区分 `BEFORE` / `AFTER` 与 `INSERT` / `UPDATE` / `DELETE`，自动行为必须纳入故障排查；存储过程通过 `CALL` 执行，存储函数可在允许的 SQL 表达式中使用，权限及副作用要明确。`DELIMITER` 是 mysql 客户端切换输入终止符的指令，不是服务端 SQL 语法。

在事务内可使用 `SAVEPOINT` 和 `ROLLBACK TO SAVEPOINT` 回退到保存点，但引擎支持与隐式提交会影响效果；并发控制还需考虑锁、隔离级别和死锁重试。表级 `LOCK TABLES` 与事务语义存在交互，不能假设其等价于 `SELECT ... FOR UPDATE`。

使用 `CREATE USER`、`GRANT`、`REVOKE` 管理访问并遵守最小权限。`SHOW VARIABLES`、`SHOW ENGINE INNODB STATUS`、`EXPLAIN`、`ANALYZE TABLE` 可辅助检查；`REPAIR TABLE` 等维护命令不是所有存储引擎都支持。备份恢复必须包含一致性、binlog、数据及恢复验证，不能把一次导出视作完成。

`SHOW CREATE TABLE` 和 `SHOW COLUMNS` 可核对现有定义；`CHECK TABLE`、`OPTIMIZE TABLE`、`ANALYZE TABLE` 的锁、磁盘及耗时影响取决于引擎和版本，不能盲目在高负载生产库执行。`SET NAMES` 调整客户端连接相关字符集，必须与客户端编码一致；不应随意修改既有列的字符集和排序规则而不评估数据转换。
