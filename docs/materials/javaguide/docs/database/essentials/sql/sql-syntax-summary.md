---
title: SQL 语法基础
---

# SQL 语法基础

根据 [JavaGuide 原文](https://github.com/Snailclimb/JavaGuide/blob/992dae31eade2a34ba8dbbbcf5ed9de5511325ec/docs/database/sql/sql-syntax-summary.md)整理；上游另注明参考[SQL 语法速成手册](https://juejin.cn/post/6844903790571700231)和 [MySQL 教程](https://www.begtut.com/mysql/mysql-tutorial.html)。以下示例主要使用 MySQL 语法，实际行为依数据库版本、SQL 模式和表结构而异。

## 术语与语句分类

数据库组织表等对象；表包含列和行，模式描述结构和约束，主键唯一标识一行。SQL 关键字不区分大小写通常是语法层面的规则；字符串比较是否区分大小写依排序规则，标识符大小写行为依产品和平台。

| 分类 | 典型语句 | 作用 |
| --- | --- | --- |
| DDL | `CREATE`、`ALTER`、`DROP`、`TRUNCATE` | 定义数据库对象 |
| DML | `INSERT`、`UPDATE`、`DELETE` | 修改行；部分资料将查询也归入 DML |
| DQL | `SELECT` | 查询行 |
| TCL | `COMMIT`、`ROLLBACK`、`SAVEPOINT` | 管理事务 |
| DCL | `GRANT`、`REVOKE` | 控制权限 |

## 查询、过滤、排序

```sql
SELECT DISTINCT department_id, name
FROM employee
WHERE salary >= 5000 AND department_id IN (10, 20)
ORDER BY department_id ASC, salary DESC
LIMIT 10 OFFSET 20;
```

- `SELECT *` 读取所有列；`AS` 指定别名，`DISTINCT` 对所选列的组合去重。
- `WHERE` 过滤行，支持 `=`, `<>`, `<`, `<=`, `>`, `>=`、`BETWEEN ... AND ...`、`IN`、`AND`、`OR`、`NOT`。`BETWEEN` 包含两端；括号明确组合条件。
- `LIKE` 的 `%` 表示任意长度字符串，`_` 表示一个字符；匹配细节受排序规则及转义设置影响。
- `NULL` 表示未知或缺失，不用 `= NULL` 判断，使用 `IS NULL`、`IS NOT NULL`；与 NULL 的普通比较通常为 UNKNOWN。
- `ORDER BY` 默认升序，降序用 `DESC`；未指定排序不能依赖结果顺序。分页时最好加入唯一的次级排序字段，避免相同排序值造成边界不稳定。

## 插入、更新、删除

```sql
INSERT INTO employee (id, name, department_id, salary)
VALUES (1, 'Ada', 10, 8000), (2, 'Lin', 20, 7000);

INSERT INTO employee_archive (id, name)
SELECT id, name FROM employee WHERE department_id = 10;

UPDATE employee SET salary = salary * 1.05 WHERE department_id = 10;
DELETE FROM employee WHERE id = 2;
```

插入应明确列名，使值与列对应；缺省列受默认值和约束影响。`UPDATE` 和 `DELETE` 不写 `WHERE` 会作用于所有行，执行前应核对条件与事务范围。

## 聚合、分组与查询顺序

```sql
SELECT department_id, COUNT(*) AS employees, AVG(salary) AS avg_salary
FROM employee
WHERE salary IS NOT NULL
GROUP BY department_id
HAVING COUNT(*) >= 2
ORDER BY avg_salary DESC;
```

`COUNT(*)` 统计行数，`COUNT(column)` 不统计该列为 NULL 的行，`COUNT(DISTINCT column)` 统计非 NULL 的不同值；`SUM`、`AVG`、`MIN`、`MAX` 通常忽略 NULL。`WHERE` 在分组前过滤行，`HAVING` 在分组后过滤组；除聚合表达式外，选择列需要符合数据库的分组规则和 SQL 模式。

理解查询结果的常见**逻辑顺序**是 `FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT`。这是理解语义的顺序，不表示优化器实际只能按该顺序物理执行。

## 连接与集合组合

```sql
SELECT e.id, e.name, d.name AS department
FROM employee AS e
LEFT JOIN department AS d ON e.department_id = d.id
WHERE e.salary > 5000;
```

- `INNER JOIN` 返回满足 `ON` 条件的匹配行；`LEFT JOIN` 保留左表未匹配行，右表列以 NULL 补齐；`RIGHT JOIN` 对称保留右表。`CROSS JOIN` 产生笛卡尔积。
- 对外连接，在 `ON` 中限定右表参与匹配，与在 `WHERE` 中对右表列过滤不等价：后者可能去掉 NULL 补齐的行，使结果表现为内连接。
- 一对多连接可能增加行数；聚合时要防止因连接重复而重复计数。
- `UNION` 合并结果并去重，`UNION ALL` 保留重复行；各查询的列数及对应类型要兼容。整个结果需要排序时，在组合查询末尾使用 `ORDER BY`。

## 子查询与谓词

```sql
SELECT e.id, e.name
FROM employee AS e
WHERE EXISTS (
    SELECT 1 FROM department AS d
    WHERE d.id = e.department_id AND d.name = 'Engineering'
);
```

子查询可出现在 `WHERE`、`FROM` 等位置；相关子查询引用外层当前行。`IN` 与 `EXISTS` 的适用方式和执行计划取决于数据与优化器，不能仅凭写法断言哪个更快。`NOT IN` 的子查询若返回 NULL，三值逻辑可能使结果与预期不符，需明确过滤 NULL 或考虑 `NOT EXISTS`。`BETWEEN` 属于范围谓词，不是子查询。

## 常用函数

| 类别 | 示例 | 要点 |
| --- | --- | --- |
| 文本 | `UPPER(name)`、`LOWER(name)`、`CONCAT(a, b)`、`SUBSTRING(name, 1, 3)` | 函数名、位置起点和 NULL 行为依数据库而异 |
| 日期 | `CURRENT_DATE`、`CURRENT_TIMESTAMP`、`DATE_FORMAT(ts, '%Y-%m')` | 注意时区、数据类型和 MySQL 专有格式 |
| 数值 | `ABS(x)`、`ROUND(x, 2)`、`MOD(x, y)` | 精度、舍入和除零行为依类型及实现 |
| NULL | `COALESCE(a, b, 0)`、MySQL 的 `IFNULL(a, 0)` | 返回首个非 NULL 值；不要把 NULL 与 0 或空串混同 |

函数作用于索引列时，优化器可能无法使用普通索引进行预期的范围查找；需结合索引、版本、表达式索引及执行计划判断。

## 数据库、表、视图和索引

```sql
CREATE DATABASE IF NOT EXISTS demo;
USE demo;

CREATE TABLE department (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE employee (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department_id BIGINT,
    salary DECIMAL(10, 2) DEFAULT 0,
    CONSTRAINT fk_employee_department
      FOREIGN KEY (department_id) REFERENCES department(id)
);
ALTER TABLE employee ADD COLUMN email VARCHAR(255);
CREATE INDEX idx_employee_department ON employee (department_id);
CREATE UNIQUE INDEX idx_employee_email ON employee (email);
CREATE VIEW employee_public AS SELECT id, name FROM employee;
```

`PRIMARY KEY`、`UNIQUE`、`NOT NULL`、`DEFAULT`、`CHECK` 和 `FOREIGN KEY` 约束数据；检查约束的实际支持情况取决于产品和版本。普通索引与唯一索引的区别是后者施加唯一性约束；NULL 的唯一性规则依数据库而异。

```sql
DROP VIEW employee_public;
DROP INDEX idx_employee_email ON employee;
ALTER TABLE employee DROP COLUMN email;
DROP TABLE employee;
DROP DATABASE demo;
```

上述 `DROP` 会删除相应对象；`DROP TABLE`、`DROP DATABASE` 还会删除对象中的数据。示例用于说明语法，执行前必须确认目标与备份。

## 事务与权限

```sql
START TRANSACTION;
SAVEPOINT before_raise;
UPDATE employee SET salary = salary + 100 WHERE id = 1;
ROLLBACK TO SAVEPOINT before_raise;
COMMIT;
```

`COMMIT` 提交，`ROLLBACK` 回滚未提交工作，保存点支持回滚事务中的一部分。隔离性、锁、持久性及 DDL 是否隐式提交依数据库和存储引擎；MySQL 某些 DDL 会隐式提交。

```sql
CREATE USER 'app'@'localhost' IDENTIFIED BY 'example_password';
GRANT SELECT ON demo.* TO 'app'@'localhost';
SHOW GRANTS FOR 'app'@'localhost';
REVOKE SELECT ON demo.* FROM 'app'@'localhost';
DROP USER 'app'@'localhost';
```

账户由用户名和主机范围共同决定；授权遵循最小权限。`RENAME USER` 可改账户名，`ALTER USER` 可修改认证信息，语法和权限取决于 MySQL 版本。不要将真实口令硬编码到脚本或版本库中。

## 存储过程、游标与触发器

存储过程把数据库端执行逻辑封装为可调用对象，通常通过 `CALL procedure_name(...)` 调用。游标用于逐行读取结果集，适合确实需要逐行处理的情况；集合式 SQL 往往更简洁。触发器在指定表的 `INSERT`、`UPDATE` 或 `DELETE` 事件前后执行。

```sql
DELIMITER //
CREATE PROCEDURE list_employees()
BEGIN
    SELECT id, name FROM employee;
END //
DELIMITER ;

CALL list_employees();
DROP PROCEDURE list_employees;
```

```sql
DELIMITER //
CREATE TRIGGER employee_before_insert
BEFORE INSERT ON employee
FOR EACH ROW
BEGIN
    SET NEW.name = TRIM(NEW.name);
END //
DELIMITER ;

SHOW TRIGGERS;
DROP TRIGGER employee_before_insert;
```

`DELIMITER` 是 MySQL 客户端命令，用于临时改变提交整个语句给服务器的分隔符，不是服务器 SQL 语句。触发器使用 `NEW` 和 `OLD` 访问新旧行；不同事件和时机允许的引用或修改不同。使用触发器时应考虑副作用、调试和事务边界。
