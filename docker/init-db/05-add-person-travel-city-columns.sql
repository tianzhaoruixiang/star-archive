-- 为 person_travel 表增加出发城市、到达城市字段（已有新 schema 的库可跳过）
-- 适用于在 01-init-schema.sql 未包含 destination_city/departure_city 时单独执行
USE person_monitor;

ALTER TABLE person_travel ADD COLUMN destination_city VARCHAR(50) COMMENT '到达城市';
ALTER TABLE person_travel ADD COLUMN departure_city VARCHAR(50) COMMENT '出发城市';
