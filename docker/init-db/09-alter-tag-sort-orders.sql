-- 为已有 tag 表增加二级、三级展示顺序字段（仅用于已有库；新库需在 01-init-schema 中 tag 表定义里加入该列）
-- 执行：mysql -h doris-fe -P 9030 -u root --default-character-set=utf8 person_monitor < 09-alter-tag-sort-orders.sql
ALTER TABLE tag ADD COLUMN second_level_sort_order INT DEFAULT 999 COMMENT '二级分类展示顺序：同一级下多个二级分类的排序，数字越小越靠前';
ALTER TABLE tag ADD COLUMN tag_sort_order INT DEFAULT 999 COMMENT '三级标签展示顺序：同二级下多个标签的排序，数字越小越靠前';
