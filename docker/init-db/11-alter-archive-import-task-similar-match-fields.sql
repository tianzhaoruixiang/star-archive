-- 为已有 archive_import_task 表增加相似判定属性组合字段（仅用于已有库；新库由 01-init-schema 建表时已包含）
ALTER TABLE archive_import_task ADD COLUMN similar_match_fields VARCHAR(200) COMMENT '相似档案判定属性组合，逗号分隔：originalName,birthDate,gender,nationality';
