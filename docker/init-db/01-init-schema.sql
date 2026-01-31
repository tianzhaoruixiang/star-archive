-- ==========================================
-- 重点人员档案监测系统 - 数据库初始化脚本
-- Doris 4.0
-- ==========================================
DROP DATABASE IF EXISTS `person_monitor`;
CREATE DATABASE IF NOT EXISTS `person_monitor`;
USE `person_monitor`;

-- 会话字符集设为 UTF-8，避免中文乱码（Doris 使用 utf8）
SET NAMES 'utf8';

-- 1. 人物表 (Unique Key 模型)
-- 人物表 - 使用 Unique Key 模型保证人物唯一性
CREATE TABLE IF NOT EXISTS person
(
    `person_id` VARCHAR(200) NOT NULL COMMENT '人物编号：MD5(原始姓名+出生日期+性别+国籍)',
    `person_type` VARCHAR(50) COMMENT '人物类型分类',
    `is_key_person` BOOLEAN DEFAULT 0 COMMENT '是否重点人群',
    `chinese_name` VARCHAR(100) COMMENT '中文姓名',
    `original_name` VARCHAR(200) COMMENT '原始姓名',
    `alias_names` ARRAY<VARCHAR(100)> COMMENT '人物别名',
    `organization` VARCHAR(100) COMMENT '机构名称',
    `belonging_group` VARCHAR(50) COMMENT '所属群体（用于首页群体类别统计，如康复、确诊、疑似、正常）',
    `avatar_files` ARRAY<VARCHAR(100)> COMMENT '头像文件SeaweedFS编号',
    `gender` VARCHAR(10) COMMENT '性别',
    `id_numbers` ARRAY<VARCHAR(50)> COMMENT '证件号码数组',
    `birth_date` DATE COMMENT '出生日期',
    `nationality` VARCHAR(100) COMMENT '国籍',
    `nationality_code` VARCHAR(3) COMMENT '国籍三字码',
    `household_address` VARCHAR(500) COMMENT '户籍地址',
    `highest_education` VARCHAR(50) COMMENT '最高学历',
    `phone_numbers` ARRAY<VARCHAR(20)> COMMENT '手机号数组',
    `emails` ARRAY<VARCHAR(100)> COMMENT '邮箱数组',
    `passport_numbers` ARRAY<VARCHAR(50)> COMMENT '护照号数组',
    `id_card_number` VARCHAR(18) COMMENT '身份证号',
    `visa_type` VARCHAR(50) COMMENT '签证类型：公务签证/外交签证/记者签证/旅游签证/其他（首页签证类型排名按此统计）',
    `visa_number` VARCHAR(100) COMMENT '签证号码',
    `twitter_accounts` ARRAY<VARCHAR(100)> COMMENT 'Twitter账号',
    `linkedin_accounts` ARRAY<VARCHAR(100)> COMMENT '领英账号',
    `facebook_accounts` ARRAY<VARCHAR(100)> COMMENT 'Facebook账号',
    `person_tags` ARRAY<VARCHAR(50)> COMMENT '人物标签名称数组',
    `work_experience` STRING COMMENT '[{"start_time":"","end_time":"","organization":"","department":"","job":""}, ...]',
    `education_experience` STRING COMMENT '[{"start_time":"","end_time":"","school_name":"","department":"","major":""}, ...]',
    `remark` STRING COMMENT '备注信息',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'
)
UNIQUE KEY(`person_id`)
COMMENT "人物档案表"
DISTRIBUTED BY HASH(person_id) BUCKETS 16
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true",
    "light_schema_change" = "true",
    "storage_format" = "v2"
);

-- 创建索引优化查询性能
ALTER TABLE person ADD INDEX idx_person_type (person_type) USING INVERTED;
ALTER TABLE person ADD INDEX idx_chinese_name (chinese_name) USING INVERTED;
ALTER TABLE person ADD INDEX idx_original_name (original_name) USING INVERTED;
ALTER TABLE person ADD INDEX idx_nationality (nationality) USING INVERTED;
ALTER TABLE person ADD INDEX idx_birth_date (birth_date) USING INVERTED;
ALTER TABLE person ADD INDEX idx_tags (person_tags) USING INVERTED;
ALTER TABLE person ADD INDEX idx_gender (gender) USING INVERTED;
ALTER TABLE person ADD INDEX idx_education (highest_education) USING INVERTED;
ALTER TABLE person ADD INDEX idx_key_person (is_key_person) USING INVERTED;
ALTER TABLE person ADD INDEX idx_created_time (created_time) USING INVERTED;
ALTER TABLE person ADD INDEX idx_id_card (id_card_number) USING INVERTED;
ALTER TABLE person ADD INDEX idx_visa_type (visa_type) USING INVERTED;
ALTER TABLE person ADD INDEX idx_phone (phone_numbers) USING INVERTED;
ALTER TABLE person ADD INDEX idx_email (emails) USING INVERTED;
ALTER TABLE person ADD INDEX idx_belonging_group (belonging_group) USING INVERTED;

-- 2. 人物行为活动数据人物行程表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS person_travel
(
    `travel_id` BIGINT NOT NULL COMMENT '行程ID',
    `person_id` VARCHAR(200) NOT NULL COMMENT '人物编号',
    `event_time` DATETIME NOT NULL COMMENT '发生时间',
    `person_name` VARCHAR(200) NOT NULL COMMENT '人物姓名',
    `departure` VARCHAR(500) COMMENT '出发地',
    `destination` VARCHAR(500) COMMENT '目的地',
    `travel_type` VARCHAR(20) NOT NULL COMMENT '行程类型: TRAIN-火车, FLIGHT-飞机, CAR-汽车',
    `ticket_number` VARCHAR(100) COMMENT '行程票据编号',
    `visa_type` VARCHAR(50) COMMENT '签证类型: 公务签证/外交签证/记者签证/旅游签证/其他，出入境时填写',
    `destination_province` VARCHAR(50) COMMENT '目的地省份（用于各地排名统计）',
    `departure_province` VARCHAR(50) COMMENT '出发地省份（用于各地排名统计）',
    `destination_city` VARCHAR(50) COMMENT '到达城市',
    `departure_city` VARCHAR(50) COMMENT '出发城市',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'
)
UNIQUE KEY(`travel_id`, `person_id`, `event_time`)
COMMENT "人物行程表"
PARTITION BY RANGE(event_time) (PARTITION p_initial VALUES LESS THAN ("2030-01-01 00:00:00"))
DISTRIBUTED BY HASH(person_id) BUCKETS 24
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true",
    "dynamic_partition.enable" = "true",
    "dynamic_partition.time_unit" = "MONTH",
    "dynamic_partition.start" = "-6",
    "dynamic_partition.end" = "3",
    "dynamic_partition.prefix" = "p_",
    "dynamic_partition.buckets" = "24"
);

-- 添加查询索引
ALTER TABLE person_travel ADD INDEX idx_event_time (event_time) USING INVERTED;
ALTER TABLE person_travel ADD INDEX idx_travel_type (travel_type) USING INVERTED;
ALTER TABLE person_travel ADD INDEX idx_departure (departure) USING INVERTED;
ALTER TABLE person_travel ADD INDEX idx_destination (destination) USING INVERTED;
ALTER TABLE person_travel ADD INDEX idx_person_id (person_id) USING INVERTED;
ALTER TABLE person_travel ADD INDEX idx_ticket (ticket_number) USING INVERTED;

-- 3.人物社交动态表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS person_social_dynamic
(
    `dynamic_id` VARCHAR(64) NOT NULL COMMENT '社交动态编号：MD5(社交内容)',
    `publish_time` DATETIME NOT NULL COMMENT '发表时间',
    `social_account_type` VARCHAR(50) NOT NULL COMMENT '社交账号类型: TWITTER, LINKEDIN, FACEBOOK, WEIBO',
    `social_account` VARCHAR(200) NOT NULL COMMENT '社交账号',
    `title` VARCHAR(500) COMMENT '标题',
    `content` STRING COMMENT '社交内容',
    `image_files` ARRAY<VARCHAR(100)> COMMENT '图片SeaweedFS编号',
    `publish_location` VARCHAR(200) COMMENT '发表地点',
    `like_count` BIGINT DEFAULT 0 COMMENT '点赞数',
    `share_count` BIGINT DEFAULT 0 COMMENT '转发数',
    `comment_count` BIGINT DEFAULT 0 COMMENT '评论数',
    `view_count` BIGINT DEFAULT 0 COMMENT '浏览量',
    `related_person_ids` ARRAY<VARCHAR(200)> COMMENT '关联人物编号',
    `extended_fields` STRING COMMENT '扩展信息: {"topic_ids":[], "mentioned_users":[], "bg_color":"", "hashtags":[]}',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'
)
UNIQUE KEY(`dynamic_id`, `publish_time`)
COMMENT "人物社交动态表"
PARTITION BY RANGE(publish_time) (PARTITION p_initial VALUES LESS THAN ("2030-01-01 00:00:00"))
DISTRIBUTED BY HASH(dynamic_id) BUCKETS 32
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true",
    "dynamic_partition.enable" = "true",
    "dynamic_partition.time_unit" = "DAY",
    "dynamic_partition.start" = "-90",
    "dynamic_partition.end" = "3",
    "dynamic_partition.prefix" = "p_",
    "dynamic_partition.buckets" = "32"
);

-- 全文索引和倒排索引
ALTER TABLE person_social_dynamic ADD INDEX idx_content (`content`) USING INVERTED PROPERTIES("parser" = "standard");
ALTER TABLE person_social_dynamic ADD INDEX idx_publish_time (publish_time) USING INVERTED;
ALTER TABLE person_social_dynamic ADD INDEX idx_social_type (social_account_type) USING INVERTED;
ALTER TABLE person_social_dynamic ADD INDEX idx_social_account (social_account) USING INVERTED;
ALTER TABLE person_social_dynamic ADD INDEX idx_related_persons (related_person_ids) USING INVERTED;
ALTER TABLE person_social_dynamic ADD INDEX idx_title (title) USING INVERTED;
ALTER TABLE person_social_dynamic ADD INDEX idx_location (publish_location) USING INVERTED;

-- 4. 新闻表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS news
(
    `news_id` VARCHAR(64) NOT NULL COMMENT '新闻编号：MD5(新闻标题+内容)',
    `publish_time` DATETIME NOT NULL COMMENT '新闻发布时间',
    `media_name` VARCHAR(200) NOT NULL COMMENT '发表媒体名称',
    `title` VARCHAR(500) NOT NULL COMMENT '新闻标题',
    `content` STRING COMMENT '新闻内容',
    `authors` ARRAY<VARCHAR(100)> COMMENT '新闻作者数组',
    `tags` ARRAY<VARCHAR(50)> COMMENT '新闻标签列表',
    `original_url` VARCHAR(1000) COMMENT '原始网页URL',
    `category` VARCHAR(50) COMMENT '新闻类别: POLITICS-政治, ECONOMY-经济, CULTURE-文化, SPORTS-体育, TECHNOLOGY-科技',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'
)
UNIQUE KEY(`news_id`, `publish_time`)
COMMENT "新闻表"
PARTITION BY RANGE(publish_time) (PARTITION p_initial VALUES LESS THAN ("2030-01-01 00:00:00"))
DISTRIBUTED BY HASH(news_id) BUCKETS 16
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true",
    "dynamic_partition.enable" = "true",
    "dynamic_partition.time_unit" = "DAY",
    "dynamic_partition.start" = "-365",
    "dynamic_partition.end" = "3",
    "dynamic_partition.prefix" = "p_",
    "dynamic_partition.buckets" = "16"
);

-- 新闻全文检索索引
ALTER TABLE news ADD INDEX idx_title (title) USING INVERTED PROPERTIES("parser" = "standard");
ALTER TABLE news ADD INDEX idx_content (content) USING INVERTED PROPERTIES("parser" = "standard");
ALTER TABLE news ADD INDEX idx_tags (tags) USING INVERTED;
ALTER TABLE news ADD INDEX idx_category (category) USING INVERTED;
ALTER TABLE news ADD INDEX idx_publish_time (publish_time) USING INVERTED;
ALTER TABLE news ADD INDEX idx_media (media_name) USING INVERTED;
ALTER TABLE news ADD INDEX idx_authors (authors) USING INVERTED;
ALTER TABLE news ADD INDEX idx_url (original_url) USING INVERTED;

-- 5. 标签表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS tag
(
    `tag_id` BIGINT NOT NULL COMMENT '标签编号',
    `first_level_name` VARCHAR(100) COMMENT '一级标签类名',
    `second_level_name` VARCHAR(100) COMMENT '二级标签类名',
    `tag_name` VARCHAR(255) NOT NULL COMMENT '标签名称',
    `tag_description` STRING COMMENT '标签描述',
    `calculation_rules` STRING COMMENT '标签计算规则',
    `parent_tag_id` BIGINT COMMENT '父标签编号',
    `first_level_sort_order` INT DEFAULT 0 COMMENT '一级标签展示顺序：1基本属性 2身份属性 3关系属性 4组织架构 5行为规律 6异常行为',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'
)
UNIQUE KEY(`tag_id`)
COMMENT "标签表"
DISTRIBUTED BY HASH(tag_id) BUCKETS 8
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

-- 标签查询索引
ALTER TABLE tag ADD INDEX idx_tag_name (tag_name) USING INVERTED;
ALTER TABLE tag ADD INDEX idx_first_level (first_level_name) USING INVERTED;
ALTER TABLE tag ADD INDEX idx_second_level (second_level_name) USING INVERTED;
ALTER TABLE tag ADD INDEX idx_parent_tag (parent_tag_id) USING INVERTED;
ALTER TABLE tag ADD INDEX idx_created_time (created_time) USING INVERTED;

-- 6. 目录表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS directory
(
    `directory_id` INT NOT NULL COMMENT '目录编号',
    `parent_directory_id` INT COMMENT '父目录编号',
    `directory_name` VARCHAR(200) NOT NULL COMMENT '目录名称',
    `creator_username` VARCHAR(100) COMMENT '创建者用户名称',
    `creator_user_id` INT COMMENT '创建者用户编号',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'
)
UNIQUE KEY(`directory_id`)
COMMENT "目录表"
DISTRIBUTED BY HASH(directory_id) BUCKETS 5
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE directory ADD INDEX idx_parent_id (parent_directory_id) USING INVERTED;
ALTER TABLE directory ADD INDEX idx_creator (creator_user_id) USING INVERTED;
ALTER TABLE directory ADD INDEX idx_directory_name (directory_name) USING INVERTED;

-- 6.1 重点人员库-人员关联表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS person_directory
(
    `directory_id` INT NOT NULL COMMENT '目录编号',
    `person_id` VARCHAR(200) NOT NULL COMMENT '人物编号',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
)
UNIQUE KEY(`directory_id`, `person_id`)
COMMENT "重点人员库与人员关联表"
DISTRIBUTED BY HASH(directory_id) BUCKETS 5
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE person_directory ADD INDEX idx_person_id (person_id) USING INVERTED;

-- 7. 上传文档表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS uploaded_document
(
    `document_id` VARCHAR(64) NOT NULL COMMENT '文档编号：MD5(文档内容)',
    `document_name` VARCHAR(500) COMMENT '文档名称',
    `document_title` VARCHAR(500) COMMENT '文档标题',
    `document_type` VARCHAR(50) COMMENT 'pdf, doc, txt, html, ppt, xlsx',
    `file_path_id` VARCHAR(100) COMMENT 'SeaweedFS唯一编号',
    `file_size` BIGINT COMMENT '文档大小(字节)',
    `source` VARCHAR(50) COMMENT '来源: USER_UPLOAD-用户上传, SYSTEM_COLLECT-系统采集',
    `author` VARCHAR(200) COMMENT '文档作者',
    `original_content` STRING COMMENT '文档原始文本内容',
    `metadata` STRING COMMENT '文档元数据: {"page_count":0, "word_count":0, "format_version":"", "created_time":""}',
    `language` VARCHAR(20) COMMENT '文档语种: zh-CN, en-US, ja-JP等',
    `translated_content` STRING COMMENT '文档翻译后内容',
    `upload_username` VARCHAR(100) COMMENT '上传用户名称',
    `upload_user_id` INT COMMENT '上传用户编号',
    `directory_id` INT COMMENT '所属目录编号',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'
)
UNIQUE KEY(`document_id`)
COMMENT "上传文档表"
DISTRIBUTED BY HASH(document_id) BUCKETS 12
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true",
    "storage_format" = "v2"
);

-- 文档检索索引
ALTER TABLE uploaded_document ADD INDEX idx_document_type (document_type) USING INVERTED;
ALTER TABLE uploaded_document ADD INDEX idx_source (source) USING INVERTED;
ALTER TABLE uploaded_document ADD INDEX idx_directory (directory_id) USING INVERTED;
ALTER TABLE uploaded_document ADD INDEX idx_created_time (created_time) USING INVERTED;
ALTER TABLE uploaded_document ADD INDEX idx_content (original_content) USING INVERTED PROPERTIES("parser" = "standard");
ALTER TABLE uploaded_document ADD INDEX idx_title (document_title) USING INVERTED;
ALTER TABLE uploaded_document ADD INDEX idx_author (author) USING INVERTED;
ALTER TABLE uploaded_document ADD INDEX idx_language (language) USING INVERTED;
ALTER TABLE uploaded_document ADD INDEX idx_uploader (upload_user_id) USING INVERTED;

-- 8. 文档分块表 (支持向量检索)
CREATE TABLE IF NOT EXISTS document_chunk
(
    `chunk_id` VARCHAR(64) NOT NULL COMMENT '分块编号：MD5(分块内容)',
    `document_id` VARCHAR(64) NOT NULL COMMENT '文档编号',
    `chunk_index` INT NOT NULL COMMENT '分块序号',
    `content` STRING NOT NULL COMMENT '文本内容',
    `content_length` INT COMMENT '内容长度',
    `vector` ARRAY<FLOAT> NOT NULL COMMENT '向量嵌入',
    `metadata` STRING COMMENT '块级元数据: {"page_num":1, "section_title":"", "char_count":0}',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'
)
DUPLICATE KEY(`chunk_id`)
COMMENT "文档分块表"
DISTRIBUTED BY HASH(chunk_id) BUCKETS 32
PROPERTIES (
    "replication_num" = "1",
    "storage_format" = "v2"
);

-- 向量索引和全文索引
ALTER TABLE document_chunk ADD INDEX idx_content (content) USING INVERTED PROPERTIES("parser" = "standard");
ALTER TABLE document_chunk ADD INDEX idx_document (document_id) USING INVERTED;
ALTER TABLE document_chunk ADD INDEX idx_vector (vector) USING ANN PROPERTIES("index_type" = "hnsw", "metric_type" = "inner_product", "dim" = "1536");
ALTER TABLE document_chunk ADD INDEX idx_chunk_index (chunk_index) USING INVERTED;

-- 9. 问答历史表 (优化版)
CREATE TABLE IF NOT EXISTS qa_history
(
    `session_id` VARCHAR(100) NOT NULL,
    `question_id` BIGINT NOT NULL,
    `user_id` VARCHAR(100),
    `question_type` VARCHAR(50) COMMENT '问题类型: DOC_QA-文档问答, PERSON_QUERY-人物查询, NEWS_SEARCH-新闻检索, TRAVEL_ANALYSIS-行程分析',
    `question` STRING NOT NULL COMMENT '问题内容',
    `answer` STRING COMMENT '回答内容',
    `source_doc_ids` ARRAY<VARCHAR(64)> COMMENT '引用的文档ID',
    `source_chunk_ids` ARRAY<VARCHAR(64)> COMMENT '引用的文本块ID',
    `source_person_ids` ARRAY<VARCHAR(200)> COMMENT '引用的人物ID',
    `source_news_ids` ARRAY<VARCHAR(64)> COMMENT '引用的新闻ID',
    `confidence_score` FLOAT COMMENT '置信度',
    `query_time_ms` INT COMMENT '查询耗时(毫秒)',
    `model_used` VARCHAR(50) COMMENT '使用的模型',
    `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `feedback` TINYINT COMMENT '用户反馈: 1-赞, -1-踩, 0-无反馈'
)
DUPLICATE KEY(`session_id`, `question_id`)
COMMENT "问答历史表"
PARTITION BY RANGE (created_time) ()
DISTRIBUTED BY HASH(session_id) BUCKETS 16
PROPERTIES (
    "replication_num" = "1",
    "dynamic_partition.enable" = "true",
    "dynamic_partition.time_unit" = "DAY",
    "dynamic_partition.start" = "-30",
    "dynamic_partition.end" = "3",
    "dynamic_partition.prefix" = "p_",
    "dynamic_partition.buckets" = "16"
);

-- 索引优化
ALTER TABLE qa_history ADD INDEX idx_created_time (created_time) USING INVERTED;
ALTER TABLE qa_history ADD INDEX idx_user_id (user_id) USING INVERTED;
ALTER TABLE qa_history ADD INDEX idx_question_type (question_type) USING INVERTED;
ALTER TABLE qa_history ADD INDEX idx_feedback (feedback) USING INVERTED;
ALTER TABLE qa_history ADD INDEX idx_question (question) USING INVERTED PROPERTIES("parser" = "standard");
ALTER TABLE qa_history ADD INDEX idx_session (session_id) USING INVERTED;

-- ==========================================
-- 10. 人员档案导入融合相关表
-- ==========================================

-- 10.1 档案导入任务表
CREATE TABLE IF NOT EXISTS archive_import_task
(
    `task_id` VARCHAR(64) NOT NULL COMMENT '任务编号：UUID',
    `document_id` VARCHAR(64) COMMENT '关联上传文档编号',
    `file_name` VARCHAR(500) COMMENT '原始文件名',
    `file_path_id` VARCHAR(100) COMMENT 'SeaweedFS 文件编号',
    `file_type` VARCHAR(20) COMMENT '文件类型: DOC, DOCX, XLS, XLSX, CSV, PDF',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态: PENDING, EXTRACTING, MATCHING, SUCCESS, FAILED',
    `original_text` STRING COMMENT '解析后的原始文档全文，用于与抽取结果对比阅读',
    `creator_user_id` INT COMMENT '创建者用户编号',
    `creator_username` VARCHAR(100) COMMENT '创建者用户名',
    `extract_count` INT DEFAULT 0 COMMENT '提取出的人物数量',
    `error_message` STRING COMMENT '失败时错误信息',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'
)
UNIQUE KEY(`task_id`)
COMMENT "人员档案导入任务表"
DISTRIBUTED BY HASH(task_id) BUCKETS 8
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE archive_import_task ADD INDEX idx_status (status) USING INVERTED;
ALTER TABLE archive_import_task ADD INDEX idx_creator (creator_user_id) USING INVERTED;
ALTER TABLE archive_import_task ADD INDEX idx_created_time (created_time) USING INVERTED;

-- 10.2 档案提取结果表
CREATE TABLE IF NOT EXISTS archive_extract_result
(
    `result_id` VARCHAR(64) NOT NULL COMMENT '结果编号：UUID',
    `task_id` VARCHAR(64) NOT NULL COMMENT '任务编号',
    `extract_index` INT NOT NULL COMMENT '同一任务中人物序号',
    `original_name` VARCHAR(200) COMMENT '原始姓名',
    `birth_date` DATE COMMENT '出生日期',
    `gender` VARCHAR(10) COMMENT '性别',
    `nationality` VARCHAR(100) COMMENT '国籍',
    `original_text` TEXT COMMENT '原始文本内容',
    `raw_json` TEXT COMMENT '大模型返回的完整结构化 JSON（与 person 表结构一致）',
    `confirmed` BOOLEAN DEFAULT 0 COMMENT '用户是否确认导入',
    `imported` BOOLEAN DEFAULT 0 COMMENT '是否已导入 person 表',
    `imported_person_id` VARCHAR(200) COMMENT '导入后的人物编号',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
)
UNIQUE KEY(`result_id`)
COMMENT "档案提取结果表（结构化参考 person 表，人工确认后导入）"
DISTRIBUTED BY HASH(result_id) BUCKETS 8
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE archive_extract_result ADD INDEX idx_task_id (task_id) USING INVERTED;
ALTER TABLE archive_extract_result ADD INDEX idx_original_name (original_name) USING INVERTED;
ALTER TABLE archive_extract_result ADD INDEX idx_birth_date (birth_date) USING INVERTED;
ALTER TABLE archive_extract_result ADD INDEX idx_gender (gender) USING INVERTED;
ALTER TABLE archive_extract_result ADD INDEX idx_nationality (nationality) USING INVERTED;

-- 10.3 档案相似匹配结果表
CREATE TABLE IF NOT EXISTS archive_similar_match
(
    `match_id` BIGINT NOT NULL COMMENT '匹配记录ID',
    `task_id` VARCHAR(64) NOT NULL COMMENT '任务编号',
    `result_id` VARCHAR(64) NOT NULL COMMENT '提取结果编号',
    `person_id` VARCHAR(200) NOT NULL COMMENT '库内人物编号',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
)
UNIQUE KEY(`match_id`)
COMMENT "档案相似匹配结果表"
DISTRIBUTED BY HASH(match_id) BUCKETS 8
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE archive_similar_match ADD INDEX idx_task_id (task_id) USING INVERTED;
ALTER TABLE archive_similar_match ADD INDEX idx_result_id (result_id) USING INVERTED;
ALTER TABLE archive_similar_match ADD INDEX idx_person_id (person_id) USING INVERTED;

-- 系统配置表（key-value，控制系统名称、Logo、前端 base URL、各导航与核心板块显示隐藏）
CREATE TABLE IF NOT EXISTS system_config
(
    `config_key`   VARCHAR(100)  NOT NULL COMMENT '配置键',
    `config_value` VARCHAR(1000) NULL COMMENT '配置值',
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
)
UNIQUE KEY(`config_key`)
COMMENT "系统配置表"
DISTRIBUTED BY HASH(config_key) BUCKETS 1
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

-- ==========================================
-- 11. 智能化模型管理 - 预测模型表
-- ==========================================
CREATE TABLE IF NOT EXISTS prediction_model
(
    `model_id` VARCHAR(64) NOT NULL COMMENT '模型编号：UUID',
    `name` VARCHAR(200) NOT NULL COMMENT '模型名称',
    `description` VARCHAR(500) COMMENT '模型描述',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PAUSED' COMMENT '状态: RUNNING-运行中, PAUSED-已暂停',
    `rule_config` STRING COMMENT '语义规则（自然语言），如：满足年龄大于20岁且具有高消费标签的所有人群',
    `locked_count` INT DEFAULT 0 COMMENT '锁定人数（模型识别出的重点人数）',
    `accuracy` VARCHAR(50) COMMENT '准确率，如 92.5%',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间'
)
UNIQUE KEY(`model_id`)
COMMENT "预测模型表-智能化模型管理"
DISTRIBUTED BY HASH(model_id) BUCKETS 4
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE prediction_model ADD INDEX idx_status (status) USING INVERTED;
ALTER TABLE prediction_model ADD INDEX idx_created_time (created_time) USING INVERTED;

-- 11.1 模型锁定人员表（语义匹配结果：模型启动后大模型根据语义规则筛选出的人员）
CREATE TABLE IF NOT EXISTS prediction_model_locked_person
(
    `model_id` VARCHAR(64) NOT NULL COMMENT '模型编号',
    `person_id` VARCHAR(200) NOT NULL COMMENT '人物编号',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
)
UNIQUE KEY(`model_id`, `person_id`)
COMMENT "模型锁定人员-语义规则匹配结果"
DISTRIBUTED BY HASH(model_id) BUCKETS 4
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE prediction_model_locked_person ADD INDEX idx_person_id (person_id) USING INVERTED;

-- 关键查询示例（仅供参考；person_news_relation 未建时勿直接执行）
-- SELECT p.person_id, p.chinese_name, p.original_name, p.nationality, p.person_tags,
--     COUNT(DISTINCT t.travel_id) as travel_count, COUNT(DISTINCT s.dynamic_id) as social_count
-- FROM person p
-- LEFT JOIN person_travel t ON p.person_id = t.person_id AND t.event_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
-- LEFT JOIN person_social_dynamic s ON ARRAY_CONTAINS(s.related_person_ids, p.person_id) AND s.publish_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
-- WHERE p.is_key_person = true AND (ARRAY_CONTAINS(p.person_tags, '重点关注') OR p.nationality = '目标国家')
-- GROUP BY p.person_id, p.chinese_name, p.original_name, p.nationality, p.person_tags
-- ORDER BY travel_count DESC, social_count DESC LIMIT 100;
