-- 为已有 person 表增加婚姻现状列（仅用于已有库；新库由 01-init-schema 建表时已包含）
-- 执行：mysql -h doris-fe -P 9030 -u root --default-character-set=utf8 person_monitor < 07-alter-person-marital.sql
ALTER TABLE person ADD COLUMN marital_status VARCHAR(50) COMMENT '婚姻现状：未婚/已婚/离异/丧偶等';
