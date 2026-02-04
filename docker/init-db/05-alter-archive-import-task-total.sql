-- 为已有 archive_import_task 表增加 total_extract_count 列（仅用于已有库；新库由 01-init-schema 建表时已包含）
-- 执行：mysql -h doris-fe -P 9030 -u root --default-character-set=utf8 person_monitor < 05-alter-archive-import-task-total.sql
ALTER TABLE archive_import_task ADD COLUMN total_extract_count INT DEFAULT 0 COMMENT '待提取人物总数';
