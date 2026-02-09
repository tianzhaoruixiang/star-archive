-- 将事件聚合结果写入 event / event_news（与 05-test-news-event-aggregation.sql 对应）
-- 事件簇 1：北京朝阳区交通事故
USE `person_monitor`;

INSERT INTO event (event_id, title, summary, event_date, news_count, first_publish_time, last_publish_time, created_time, updated_time) VALUES
('evt-agg-1', '北京朝阳区某路口多车追尾事故 致多人受伤', NULL, '2025-02-08', 3, '2025-02-08 08:15:00', '2025-02-08 18:00:00', NOW(), NOW());

INSERT INTO event_news (event_id, news_id, publish_time, created_time) VALUES
('evt-agg-1', md5('event-agg-1-北京朝阳区多车追尾事故-北京晨报'), '2025-02-08 08:15:00', NOW()),
('evt-agg-1', md5('event-agg-1-朝阳区交通事故致多人受伤-新京报'), '2025-02-08 12:30:00', NOW()),
('evt-agg-1', md5('event-agg-1-北京朝阳区重大交通事故最新进展-北青报'), '2025-02-08 18:00:00', NOW());

-- 事件簇 2：杭州人才新政
INSERT INTO event (event_id, title, summary, event_date, news_count, first_publish_time, last_publish_time, created_time, updated_time) VALUES
('evt-agg-2', '杭州发布人才新政 进一步放宽落户条件', NULL, '2025-02-08', 3, '2025-02-08 09:00:00', '2025-02-08 16:45:00', NOW(), NOW());

INSERT INTO event_news (event_id, news_id, publish_time, created_time) VALUES
('evt-agg-2', md5('event-agg-2-杭州发布人才新政放宽落户-杭州日报'), '2025-02-08 09:00:00', NOW()),
('evt-agg-2', md5('event-agg-2-杭州人才引进政策再升级-钱江晚报'), '2025-02-08 14:20:00', NOW()),
('evt-agg-2', md5('event-agg-2-杭州市出台新一轮人才安居政策-浙江在线'), '2025-02-08 16:45:00', NOW());

-- 事件簇 3：华为公司折叠屏新品
INSERT INTO event (event_id, title, summary, event_date, news_count, first_publish_time, last_publish_time, created_time, updated_time) VALUES
('evt-agg-3', '华为公司发布新一代折叠屏手机 起售价 8999 元', NULL, '2025-02-09', 2, '2025-02-09 09:30:00', '2025-02-09 11:00:00', NOW(), NOW());

INSERT INTO event_news (event_id, news_id, publish_time, created_time) VALUES
('evt-agg-3', md5('event-agg-3-华为公司发布新一代折叠屏手机-第一财经'), '2025-02-09 09:30:00', NOW()),
('evt-agg-3', md5('event-agg-3-华为公司折叠屏新品今日发布售价公布-科技日报'), '2025-02-09 11:00:00', NOW());

-- 事件簇 4：周杰伦上海演唱会
INSERT INTO event (event_id, title, summary, event_date, news_count, first_publish_time, last_publish_time, created_time, updated_time) VALUES
('evt-agg-4', '周杰伦上海演唱会圆满落幕 三万人合唱收官', NULL, '2025-02-09', 2, '2025-02-09 19:00:00', '2025-02-09 21:30:00', NOW(), NOW());

INSERT INTO event_news (event_id, news_id, publish_time, created_time) VALUES
('evt-agg-4', md5('event-agg-4-周杰伦上海演唱会圆满落幕-娱乐周刊'), '2025-02-09 19:00:00', NOW()),
('evt-agg-4', md5('event-agg-4-周杰伦上海站演唱会反响热烈-新浪娱乐'), '2025-02-09 21:30:00', NOW());

-- 事件簇 5：西安工地古墓
INSERT INTO event (event_id, title, summary, event_date, news_count, first_publish_time, last_publish_time, created_time, updated_time) VALUES
('evt-agg-5', '西安某工地施工发现古代墓葬 文物部门已介入', NULL, '2025-02-09', 3, '2025-02-09 08:00:00', '2025-02-09 17:00:00', NOW(), NOW());

INSERT INTO event_news (event_id, news_id, publish_time, created_time) VALUES
('evt-agg-5', md5('event-agg-5-西安施工发现古代墓葬-陕西日报'), '2025-02-09 08:00:00', NOW()),
('evt-agg-5', md5('event-agg-5-西安发现唐宋时期古墓-华商报'), '2025-02-09 12:00:00', NOW()),
('evt-agg-5', md5('event-agg-5-西安工地古墓发掘工作启动-三秦都市报'), '2025-02-09 17:00:00', NOW());

-- 事件簇 6：单条新闻事件
INSERT INTO event (event_id, title, summary, event_date, news_count, first_publish_time, last_publish_time, created_time, updated_time) VALUES
('evt-agg-6', '北京市开通首条无人驾驶公交线路 全长约 15 公里', NULL, '2025-02-09', 1, '2025-02-09 10:00:00', '2025-02-09 10:00:00', NOW(), NOW());

INSERT INTO event_news (event_id, news_id, publish_time, created_time) VALUES
('evt-agg-6', md5('event-agg-6-北京市开通首条无人驾驶公交线路-中国交通报'), '2025-02-09 10:00:00', NOW());
