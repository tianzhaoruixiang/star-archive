-- 为已有 person 表增加软删字段（仅用于已有库；新库需在 01-init-schema 中 person 表定义里加入以下列）
-- 执行：mysql -h doris-fe -P 9030 -u root --default-character-set=utf8 person_monitor < 06-alter-person-deleted.sql
ALTER TABLE person ADD COLUMN deleted BOOLEAN DEFAULT 0 COMMENT '是否已删除（软删）';
ALTER TABLE person ADD COLUMN deleted_time DATETIME COMMENT '删除时间';
ALTER TABLE person ADD COLUMN deleted_by VARCHAR(100) COMMENT '删除人用户名';
