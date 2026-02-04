-- 为已有 archive_import_task 表增加完成时间字段（仅用于已有库；新库需在 01-init-schema 中表定义里加入该列）
-- 执行：mysql -h doris-fe -P 9030 -u root --default-character-set=utf8 person_monitor < 10-alter-archive-import-task-completed.sql
ALTER TABLE archive_import_task ADD COLUMN completed_time DATETIME COMMENT '任务完成时间（状态变为 SUCCESS 或 FAILED 时写入）';
