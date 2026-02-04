-- 为已有 tag 表增加「是否重点标签」字段（仅用于已有库；新库需在 01-init-schema 中 tag 表定义里加入该列）
-- 执行：mysql -h doris-fe -P 9030 -u root --default-character-set=utf8 person_monitor < 08-alter-tag-key-tag.sql
ALTER TABLE tag ADD COLUMN key_tag BOOLEAN DEFAULT 0 COMMENT '是否重点标签：重点人员页左侧仅展示重点标签，右侧仅展示命中重点标签的人员';
