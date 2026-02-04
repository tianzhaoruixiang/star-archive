-- 为已有 person 表增加 related_persons 列（仅用于已有库；新库由 01-init-schema 建表时已包含）
-- 执行：mysql -h doris-fe -P 9030 -u root --default-character-set=utf8 person_monitor < 07-alter-person-related-persons.sql
ALTER TABLE person ADD COLUMN related_persons STRING COMMENT '关系人JSON：[{"name":"关系人名称","relation":"关系名称","brief":"关系人简介"}, ...]';
