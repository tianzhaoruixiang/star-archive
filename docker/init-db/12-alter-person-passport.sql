-- 为已有 person 表增加护照号、护照类型字段（仅用于已有库；新库需在 01-init-schema 中 person 表定义里加入以下列）
-- 执行：mysql -h doris-fe -P 9030 -u root --default-character-set=utf8 person_monitor < 12-alter-person-passport.sql
ALTER TABLE person ADD COLUMN passport_number VARCHAR(200) COMMENT '主护照号';
ALTER TABLE person ADD COLUMN passport_type VARCHAR(100) COMMENT '护照类型：普通护照/外交护照/公务护照/旅行证等';
