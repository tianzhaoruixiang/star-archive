-- 将人物表证件号码从数组改为单值（仅用于已有库；新库需在 01-init-schema 中 person 表定义里使用 id_number）
-- 执行：mysql -h doris-fe -P 9030 -u root --default-character-set=utf8 person_monitor < 13-alter-person-id-number.sql
ALTER TABLE person ADD COLUMN id_number VARCHAR(200) COMMENT '证件号码';
