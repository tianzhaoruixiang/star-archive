-- ==========================================
-- 重点人员档案监测系统 - 数据库初始化脚本
-- 创建时间: 2026-01-29
-- Doris 4.0
-- ==========================================

-- 1. 人物表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS person (
    `person_id` VARCHAR(200) NOT NULL COMMENT '人物编号：MD5(原始姓名+出生日期+性别+国籍)',
    `is_key_person` TINYINT DEFAULT 0 COMMENT '是否重点人群: 0-否, 1-是',
    `chinese_name` VARCHAR(100) COMMENT '中文姓名',
    `original_name` VARCHAR(200) COMMENT '原始姓名',
    `alias_names` TEXT COMMENT '人物别名JSON数组',
    `avatar_files` TEXT COMMENT '头像文件SeaweedFS编号JSON数组',
    `gender` VARCHAR(10) COMMENT '性别',
    `id_numbers` TEXT COMMENT '证件号码JSON数组',
    `birth_date` DATETIME COMMENT '出生日期',
    `nationality` VARCHAR(100) COMMENT '国籍',
    `nationality_code` VARCHAR(3) COMMENT '国籍三字码',
    `household_address` VARCHAR(500) COMMENT '户籍地址',
    `highest_education` VARCHAR(50) COMMENT '最高学历',
    `phone_numbers` TEXT COMMENT '手机号JSON数组',
    `emails` TEXT COMMENT '邮箱JSON数组',
    `passport_numbers` TEXT COMMENT '护照号JSON数组',
    `id_card_number` VARCHAR(18) COMMENT '身份证号',
    `twitter_accounts` TEXT COMMENT 'Twitter账号JSON数组',
    `linkedin_accounts` TEXT COMMENT '领英账号JSON数组',
    `facebook_accounts` TEXT COMMENT 'Facebook账号JSON数组',
    `person_tags` TEXT COMMENT '人物标签名称JSON数组',
    `work_experience` JSON COMMENT '[{"start_time":"","end_time":"","organization":"","department":"","job":""}, ...]',
    `education_experience` JSON COMMENT '[{"start_time":"","end_time":"","school_name":"","department":"","major":""}, ...]',
    `remark` TEXT COMMENT '备注信息',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(person_id)
COMMENT "人物档案表"
DISTRIBUTED BY HASH(person_id) BUCKETS 16
PROPERTIES (
    "enable_unique_key_merge_on_write" = "true",
    "light_schema_change" = "true",
    "storage_format" = "v2",
    "replication_num" = "1"
);

-- 创建索引优化查询性能
ALTER TABLE person ADD INDEX idx_key_person (is_key_person) USING BITMAP;
ALTER TABLE person ADD INDEX idx_chinese_name (chinese_name) USING INVERTED;
ALTER TABLE person ADD INDEX idx_original_name (original_name) USING INVERTED;
ALTER TABLE person ADD INDEX idx_nationality (nationality) USING INVERTED;
ALTER TABLE person ADD INDEX idx_birth_date (birth_date) USING INVERTED;
ALTER TABLE person ADD INDEX idx_gender (gender) USING BITMAP;
ALTER TABLE person ADD INDEX idx_education (highest_education) USING INVERTED;
ALTER TABLE person ADD INDEX idx_created_time (created_time) USING INVERTED;
ALTER TABLE person ADD INDEX idx_id_card (id_card_number) USING INVERTED;

-- 2. 人物行程表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS person_travel (
    `travel_id` BIGINT AUTO_INCREMENT COMMENT '行程ID',
    `person_id` VARCHAR(200) NOT NULL COMMENT '人物编号',
    `event_time` DATETIME NOT NULL COMMENT '发生时间',
    `person_name` VARCHAR(200) NOT NULL COMMENT '人物姓名',
    `departure` VARCHAR(500) COMMENT '出发地',
    `destination` VARCHAR(500) COMMENT '目的地',
    `travel_type` VARCHAR(20) NOT NULL COMMENT '行程类型: TRAIN-火车, FLIGHT-飞机, CAR-汽车',
    `ticket_number` VARCHAR(100) COMMENT '行程票据编号',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(travel_id, person_id, event_time)
COMMENT "人物行程表"
PARTITION BY RANGE(event_time) ()
DISTRIBUTED BY HASH(person_id) BUCKETS 24
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true",
    "dynamic_partition.enable" = "true",
    "dynamic_partition.time_unit" = "MONTH",
    "dynamic_partition.start" = "-6",
    "dynamic_partition.end" = "3",
    "dynamic_partition.prefix" = "p_",
    "dynamic_partition.buckets" = "24",
    "storage_medium" = "SSD"
);

-- 添加查询索引
ALTER TABLE person_travel ADD INDEX idx_event_time (event_time) USING INVERTED;
ALTER TABLE person_travel ADD INDEX idx_travel_type (travel_type) USING BITMAP;
ALTER TABLE person_travel ADD INDEX idx_departure (departure) USING INVERTED;
ALTER TABLE person_travel ADD INDEX idx_destination (destination) USING INVERTED;
ALTER TABLE person_travel ADD INDEX idx_person_id (person_id) USING INVERTED;
ALTER TABLE person_travel ADD INDEX idx_ticket (ticket_number) USING INVERTED;

-- 3. 人物社交动态表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS person_social_dynamic (
    `dynamic_id` VARCHAR(64) NOT NULL COMMENT '社交动态编号：MD5(社交内容)',
    `social_account_type` VARCHAR(50) NOT NULL COMMENT '社交账号类型: TWITTER, LINKEDIN, FACEBOOK, WEIBO',
    `social_account` VARCHAR(200) NOT NULL COMMENT '社交账号',
    `title` VARCHAR(500) COMMENT '标题',
    `content` TEXT COMMENT '社交内容',
    `image_files` TEXT COMMENT '图片SeaweedFS编号JSON数组',
    `publish_time` DATETIME NOT NULL COMMENT '发表时间',
    `publish_location` VARCHAR(200) COMMENT '发表地点',
    `like_count` BIGINT DEFAULT 0 COMMENT '点赞数',
    `share_count` BIGINT DEFAULT 0 COMMENT '转发数',
    `comment_count` BIGINT DEFAULT 0 COMMENT '评论数',
    `view_count` BIGINT DEFAULT 0 COMMENT '浏览量',
    `related_person_ids` TEXT COMMENT '关联人物编号JSON数组',
    `extended_fields` JSON COMMENT '扩展信息: {"topic_ids":[], "mentioned_users":[], "bg_color":"", "hashtags":[]}',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(dynamic_id)
COMMENT "人物社交动态表"
PARTITION BY RANGE(publish_time) ()
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
ALTER TABLE person_social_dynamic ADD INDEX idx_social_type (social_account_type) USING BITMAP;
ALTER TABLE person_social_dynamic ADD INDEX idx_social_account (social_account) USING INVERTED;
ALTER TABLE person_social_dynamic ADD INDEX idx_title (title) USING INVERTED;
ALTER TABLE person_social_dynamic ADD INDEX idx_location (publish_location) USING INVERTED;

-- 4. 新闻表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS news (
    `news_id` VARCHAR(64) NOT NULL COMMENT '新闻编号：MD5(新闻标题+内容)',
    `media_name` VARCHAR(200) NOT NULL COMMENT '发表媒体名称',
    `title` VARCHAR(500) NOT NULL COMMENT '新闻标题',
    `content` TEXT COMMENT '新闻内容',
    `authors` TEXT COMMENT '新闻作者JSON数组',
    `publish_time` DATETIME NOT NULL COMMENT '新闻发布时间',
    `tags` TEXT COMMENT '新闻标签JSON数组',
    `original_url` VARCHAR(1000) COMMENT '原始网页URL',
    `category` VARCHAR(50) COMMENT '新闻类别: POLITICS-政治, ECONOMY-经济, CULTURE-文化, SPORTS-体育, TECHNOLOGY-科技',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(news_id)
COMMENT "新闻表"
PARTITION BY RANGE(publish_time) ()
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
ALTER TABLE news ADD INDEX idx_category (category) USING BITMAP;
ALTER TABLE news ADD INDEX idx_publish_time (publish_time) USING INVERTED;
ALTER TABLE news ADD INDEX idx_media (media_name) USING INVERTED;
ALTER TABLE news ADD INDEX idx_url (original_url) USING INVERTED;

-- 5. 标签表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS tag (
    `tag_id` BIGINT NOT NULL COMMENT '标签编号',
    `first_level_name` VARCHAR(100) COMMENT '一级标签类名',
    `second_level_name` VARCHAR(100) COMMENT '二级标签类名',
    `tag_name` VARCHAR(255) NOT NULL COMMENT '标签名称',
    `tag_description` TEXT COMMENT '标签描述',
    `calculation_rules` TEXT COMMENT '标签计算规则',
    `parent_tag_id` BIGINT COMMENT '父标签编号',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(tag_id)
COMMENT "标签表"
DISTRIBUTED BY HASH(tag_id) BUCKETS 8
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true",
    "storage_medium" = "SSD"
);

-- 标签查询索引
ALTER TABLE tag ADD INDEX idx_tag_name (tag_name) USING INVERTED;
ALTER TABLE tag ADD INDEX idx_first_level (first_level_name) USING INVERTED;
ALTER TABLE tag ADD INDEX idx_second_level (second_level_name) USING INVERTED;
ALTER TABLE tag ADD INDEX idx_parent_tag (parent_tag_id) USING INVERTED;
ALTER TABLE tag ADD INDEX idx_created_time (created_time) USING INVERTED;

-- 6. 目录表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS directory (
    `directory_id` INT NOT NULL COMMENT '目录编号',
    `parent_directory_id` INT COMMENT '父目录编号',
    `directory_name` VARCHAR(200) NOT NULL COMMENT '目录名称',
    `directory_type` VARCHAR(20) COMMENT '目录类型: PUBLIC-公共, PRIVATE-个人',
    `creator_username` VARCHAR(100) COMMENT '创建者用户名称',
    `creator_user_id` INT COMMENT '创建者用户编号',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(directory_id)
COMMENT "目录表"
DISTRIBUTED BY HASH(directory_id) BUCKETS 5
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE directory ADD INDEX idx_parent_id (parent_directory_id) USING INVERTED;
ALTER TABLE directory ADD INDEX idx_creator (creator_user_id) USING INVERTED;
ALTER TABLE directory ADD INDEX idx_directory_name (directory_name) USING INVERTED;
ALTER TABLE directory ADD INDEX idx_directory_type (directory_type) USING BITMAP;

-- 7. 上传文档表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS uploaded_document (
    `document_id` VARCHAR(64) NOT NULL COMMENT '文档编号：MD5(文档内容)',
    `document_name` VARCHAR(500) COMMENT '文档名称',
    `document_title` VARCHAR(500) COMMENT '文档标题',
    `document_type` VARCHAR(50) COMMENT 'pdf, doc, txt, html, ppt, xlsx',
    `file_path_id` VARCHAR(100) COMMENT 'SeaweedFS唯一编号',
    `file_size` BIGINT COMMENT '文档大小(字节)',
    `source` VARCHAR(50) COMMENT '来源: USER_UPLOAD-用户上传, SYSTEM_COLLECT-系统采集',
    `author` VARCHAR(200) COMMENT '文档作者',
    `original_content` TEXT COMMENT '文档原始文本内容',
    `metadata` JSON COMMENT '文档元数据: {"page_count":0, "word_count":0, "format_version":"", "created_time":""}',
    `language` VARCHAR(20) COMMENT '文档语种: zh-CN, en-US, ja-JP等',
    `translated_content` TEXT COMMENT '文档翻译后内容',
    `upload_username` VARCHAR(100) COMMENT '上传用户名称',
    `upload_user_id` INT COMMENT '上传用户编号',
    `directory_id` INT COMMENT '所属目录编号',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(document_id)
COMMENT "上传文档表"
DISTRIBUTED BY HASH(document_id) BUCKETS 12
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true",
    "storage_format" = "v2"
);

-- 文档检索索引
ALTER TABLE uploaded_document ADD INDEX idx_document_type (document_type) USING BITMAP;
ALTER TABLE uploaded_document ADD INDEX idx_source (source) USING BITMAP;
ALTER TABLE uploaded_document ADD INDEX idx_directory (directory_id) USING INVERTED;
ALTER TABLE uploaded_document ADD INDEX idx_created_time (created_time) USING INVERTED;
ALTER TABLE uploaded_document ADD INDEX idx_content (original_content) USING INVERTED PROPERTIES("parser" = "standard");
ALTER TABLE uploaded_document ADD INDEX idx_title (document_title) USING INVERTED;
ALTER TABLE uploaded_document ADD INDEX idx_author (author) USING INVERTED;
ALTER TABLE uploaded_document ADD INDEX idx_language (language) USING BITMAP;
ALTER TABLE uploaded_document ADD INDEX idx_uploader (upload_user_id) USING INVERTED;

-- 8. 文档分块表 (支持向量检索)
CREATE TABLE IF NOT EXISTS document_chunk (
    `chunk_id` VARCHAR(64) NOT NULL COMMENT '分块编号：MD5(分块内容)',
    `document_id` VARCHAR(64) NOT NULL COMMENT '文档编号',
    `chunk_index` INT NOT NULL COMMENT '分块序号',
    `content` TEXT NOT NULL COMMENT '文本内容',
    `content_length` INT COMMENT '内容长度',
    `vector` TEXT COMMENT '向量嵌入JSON数组',
    `metadata` JSON COMMENT '块级元数据: {"page_num":1, "section_title":"", "char_count":0}',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(chunk_id)
COMMENT "文档分块表"
DISTRIBUTED BY HASH(chunk_id) BUCKETS 32
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true",
    "storage_format" = "v2"
);

-- 向量索引和全文索引
ALTER TABLE document_chunk ADD INDEX idx_content (content) USING INVERTED PROPERTIES("parser" = "standard");
ALTER TABLE document_chunk ADD INDEX idx_document (document_id) USING INVERTED;
ALTER TABLE document_chunk ADD INDEX idx_chunk_index (chunk_index) USING INVERTED;

-- 9. 问答历史表 (Duplicate Key 模型)
CREATE TABLE IF NOT EXISTS qa_history (
    `session_id` VARCHAR(100) NOT NULL,
    `question_id` BIGINT NOT NULL,
    `user_id` VARCHAR(100),
    `question_type` VARCHAR(50) COMMENT '问题类型: DOC_QA-文档问答, PERSON_QUERY-人物查询, NEWS_SEARCH-新闻检索, TRAVEL_ANALYSIS-行程分析',
    `question` TEXT NOT NULL,
    `answer` TEXT,
    `source_doc_ids` TEXT COMMENT '引用的文档ID JSON数组',
    `source_chunk_ids` TEXT COMMENT '引用的文本块ID JSON数组',
    `source_person_ids` TEXT COMMENT '引用的人物ID JSON数组',
    `source_news_ids` TEXT COMMENT '引用的新闻ID JSON数组',
    `confidence_score` FLOAT COMMENT '置信度',
    `query_time_ms` INT COMMENT '查询耗时(毫秒)',
    `model_used` VARCHAR(50) COMMENT '使用的模型',
    `created_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    `feedback` TINYINT COMMENT '用户反馈: 1-赞, -1-踩, 0-无反馈'
)
DUPLICATE KEY(session_id, question_id)
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
ALTER TABLE qa_history ADD INDEX idx_question_type (question_type) USING BITMAP;
ALTER TABLE qa_history ADD INDEX idx_feedback (feedback) USING BITMAP;
ALTER TABLE qa_history ADD INDEX idx_question (question) USING INVERTED PROPERTIES("parser" = "standard");
ALTER TABLE qa_history ADD INDEX idx_session (session_id) USING INVERTED;

-- 10. 用户表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS user (
    `user_id` INT AUTO_INCREMENT COMMENT '用户ID',
    `username` VARCHAR(100) NOT NULL COMMENT '用户名',
    `password` VARCHAR(255) NOT NULL COMMENT '密码（加密）',
    `real_name` VARCHAR(100) COMMENT '真实姓名',
    `email` VARCHAR(100) COMMENT '邮箱',
    `phone` VARCHAR(20) COMMENT '手机号',
    `role` VARCHAR(20) DEFAULT 'USER' COMMENT '角色: ADMIN, USER',
    `status` VARCHAR(20) DEFAULT 'ACTIVE' COMMENT '状态: ACTIVE, INACTIVE',
    `last_login_time` DATETIME COMMENT '最后登录时间',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(user_id)
COMMENT "用户表"
DISTRIBUTED BY HASH(user_id) BUCKETS 4
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE user ADD INDEX idx_username (username) USING INVERTED;
ALTER TABLE user ADD INDEX idx_email (email) USING INVERTED;
ALTER TABLE user ADD INDEX idx_status (status) USING BITMAP;
ALTER TABLE user ADD INDEX idx_role (role) USING BITMAP;

-- 11. 重点人员库表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS key_person_library (
    `library_id` INT AUTO_INCREMENT COMMENT '库ID',
    `library_name` VARCHAR(200) NOT NULL COMMENT '库名称',
    `description` TEXT COMMENT '库描述',
    `owner_user_id` INT COMMENT '所有者用户ID',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(library_id)
COMMENT "重点人员库表"
DISTRIBUTED BY HASH(library_id) BUCKETS 4
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE key_person_library ADD INDEX idx_library_name (library_name) USING INVERTED;
ALTER TABLE key_person_library ADD INDEX idx_owner (owner_user_id) USING INVERTED;

-- 12. 重点人员库成员表 (Duplicate Key 模型)
CREATE TABLE IF NOT EXISTS key_person_library_member (
    `library_id` INT NOT NULL COMMENT '库ID',
    `person_id` VARCHAR(200) NOT NULL COMMENT '人物ID',
    `added_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '添加时间',
    `added_by` INT COMMENT '添加者用户ID'
)
DUPLICATE KEY(library_id, person_id)
COMMENT "重点人员库成员表"
DISTRIBUTED BY HASH(library_id) BUCKETS 8
PROPERTIES (
    "replication_num" = "1"
);

ALTER TABLE key_person_library_member ADD INDEX idx_person_id (person_id) USING INVERTED;

-- 13. 分析模型表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS analysis_model (
    `model_id` INT AUTO_INCREMENT COMMENT '模型ID',
    `model_name` VARCHAR(200) NOT NULL COMMENT '模型名称',
    `description` TEXT COMMENT '模型描述',
    `conditions` JSON COMMENT '筛选条件（JSON格式）',
    `creator_user_id` INT COMMENT '创建者用户ID',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(model_id)
COMMENT "分析模型表"
DISTRIBUTED BY HASH(model_id) BUCKETS 4
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE analysis_model ADD INDEX idx_model_name (model_name) USING INVERTED;
ALTER TABLE analysis_model ADD INDEX idx_creator (creator_user_id) USING INVERTED;

-- 14. 分析模型运行记录表 (Duplicate Key 模型)
CREATE TABLE IF NOT EXISTS analysis_model_run (
    `run_id` BIGINT AUTO_INCREMENT COMMENT '运行ID',
    `model_id` INT NOT NULL COMMENT '模型ID',
    `run_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '运行时间',
    `status` VARCHAR(20) COMMENT '状态: RUNNING, COMPLETED, FAILED',
    `result_count` INT COMMENT '结果数量',
    `result_snapshot` JSON COMMENT '结果快照（人员ID列表）',
    `executed_by` INT COMMENT '执行者用户ID'
)
DUPLICATE KEY(run_id)
COMMENT "分析模型运行记录表"
DISTRIBUTED BY HASH(run_id) BUCKETS 8
PROPERTIES (
    "replication_num" = "1"
);

ALTER TABLE analysis_model_run ADD INDEX idx_model_id (model_id) USING INVERTED;
ALTER TABLE analysis_model_run ADD INDEX idx_run_time (run_time) USING INVERTED;
ALTER TABLE analysis_model_run ADD INDEX idx_status (status) USING BITMAP;

-- 15. 档案融合任务表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS fusion_task (
    `task_id` VARCHAR(64) NOT NULL COMMENT '任务ID',
    `document_id` VARCHAR(64) COMMENT '文档ID',
    `task_type` VARCHAR(20) COMMENT '任务类型: WORD, EXCEL, CSV',
    `status` VARCHAR(20) COMMENT '状态: PENDING, PROCESSING, COMPLETED, FAILED',
    `progress` INT DEFAULT 0 COMMENT '进度（0-100）',
    `extracted_count` INT DEFAULT 0 COMMENT '提取的档案数',
    `matched_count` INT DEFAULT 0 COMMENT '匹配的档案数',
    `error_message` TEXT COMMENT '错误信息',
    `creator_user_id` INT COMMENT '创建者用户ID',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP(),
    `updated_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP()
)
UNIQUE KEY(task_id)
COMMENT "档案融合任务表"
DISTRIBUTED BY HASH(task_id) BUCKETS 8
PROPERTIES (
    "replication_num" = "1",
    "enable_unique_key_merge_on_write" = "true"
);

ALTER TABLE fusion_task ADD INDEX idx_status (status) USING BITMAP;
ALTER TABLE fusion_task ADD INDEX idx_creator (creator_user_id) USING INVERTED;
ALTER TABLE fusion_task ADD INDEX idx_created_time (created_time) USING INVERTED;

-- 16. 档案融合结果表 (Duplicate Key 模型)
CREATE TABLE IF NOT EXISTS fusion_result (
    `task_id` VARCHAR(64) NOT NULL COMMENT '任务ID',
    `extracted_person_data` JSON COMMENT '提取的人员数据',
    `matched_person_id` VARCHAR(200) COMMENT '匹配到的人员ID',
    `similarity_score` FLOAT COMMENT '相似度分数',
    `match_fields` VARCHAR(500) COMMENT '匹配字段',
    `created_time` DATETIME DEFAULT CURRENT_TIMESTAMP()
)
DUPLICATE KEY(task_id)
COMMENT "档案融合结果表"
DISTRIBUTED BY HASH(task_id) BUCKETS 16
PROPERTIES (
    "replication_num" = "1"
);

ALTER TABLE fusion_result ADD INDEX idx_matched_person (matched_person_id) USING INVERTED;
ALTER TABLE fusion_result ADD INDEX idx_created_time (created_time) USING INVERTED;
