# 业务需求描述

假如你是一个资深软件架构式，前端采用 react 技术，后端采用 springboot 3.3 + jdk21， 数据库采用 docker-compose 本地运行方式。
实现重点人员档案监测系统，本系统是一个重点人员档案监测行为动态的系统。包含首页统计大屏、人员档案、（新闻社交）态势感知、重点人员库、工作区等五个主要功能。


## 前端模块划分
### 0.导航栏
横向，可以点击首页、人员档案、态势感知、重点人员库、个人工作区五个模块，最右侧有登录用户名及登录登出按钮。
### 1. 首页
展示系统数据的统计信息，中间部分展示中国地图（离线模式），围绕地图以卡片形式展示系统统计信息，中国地图的每一个省份都支持下探点击查看详情。

#### 1.1 最上展示监测人员总数、重点人员总数、今日新闻数量、新增社交动态的数量。

#### 1.2 中间展示中国地图，要求每个省份可以点击下探到单独省份页面，地图省份颜色根据该省人员数量不同进行区分，人员数量越多的省份，省份颜色热度越高。
地图左上角展示机构分布统计卡片，右上角展示人员在各省活动数量排名，左下角展示人员出入境签证类型统计卡片，右下角展示人员所属群体类别统计卡片。

##### 1.2.1 机构分布统计卡片 包含人员所属的机构数量统计以及排序，卡片展示前五名机构名称及人员数量，可滚动查看所有机构情况，并可展开形成弹窗展示全部情况。

##### 1.2.2 活跃省份排名统计卡片（支持筛选全部、昨日新增、驻留）
“全部”为个省份人员数量展示，数量越多省份排名越靠前，展示前5名省份，其余省份可滚动查看；“昨日新增”为昨天到达各个省份的人员的数量，数量越多省份排名越靠前，展示前5名省份，其余省份可滚动查看；“昨日流出”为昨日离开各省的人员数量；“驻留”为该省份留下的人员的数量，计算方式为“驻留”加上“昨日新增”，减去“昨日流出”。以上数量及到达情况均通过民航铁路实时信息进行计算。

##### 1.2.3 出入境签证类型卡片 根据人员信息中签证信息进行统计排名，包含公务签证、旅游签证、记者签证等。

##### 1.2.4 人员类别卡片 根据人员信息中的业务标签统计人员数量并进行排名。

#### 1.3 点击地图上某个省份查看详情时，中间可以单独展示单独省份的地图，以各市包含人员数量多少进行着色，数量越多，颜色热度越高，地图周围展示卡片为将全国地图展示的卡片内容换为该省范围信息及数量统计内容。

#### 1.4 点击地图上各个卡片的内容时，自动弹出该省、机构、市人员档案卡片，并可以点击查看人员档案详情。 

## 2. 人员档案
通过标签筛选来筛选展示人员卡片，整个页面由导航栏、筛选标签和人员卡片展示三个模块组成。

### 2.1 导航栏同首页

### 2.2 标签筛选，包含三级标签，一级标签共六个大类 基本属性、身份属性、组织机构、异常行为、关系属性、行为规律，采用doris4.0数据库存储。首次进入系统时，计算每个标签人员数量，并跟随在标签名称后。字体组件样式尽可能小一些，给人员卡片留出位置

#### 2.2.1 基本属性 包含年龄（50后、60后、70后...通过人员信息的出生日期计算），性别（男、女），教育水平（高中及以下、本科、硕士及以下）、原籍地（河南省、河北省...）、拥有境外社交媒体（X、FB）、入境签证类型（公务签证、外交签证、记者签证、旅游签证、其他）

#### 2.2.2 身份属性 包含外国（2015年后长期出国、2020年后出国、出入第三国）、留学生（留学生、毕业后来华）

#### 2.2.3 组织结构 包含1机构、2机构、3机构、4机构、5机构、6机构

#### 2.2.4 异常行为 包括特殊人群（1类、2类、3类、4类、5类），高消费群体（曾住高档酒店、铁路一等/商务座），小众APP（境外社交、金融借贷、涉黄赌毒、音视频），其他。

#### 2.2.5 关系属性 同行人员、个人关系、通讯录好友。

#### 2.2.6 行为规律 历史出国频次（高>=10,中5-10，低<5），常活动城市（北京、沈阳、丹东...），近三年出国频次（2次及以下、2-5次、5-10次、10次以上），国内大范围出行（国内到访城市>5），往返第三国，出国未归，多次快进快出。

### 2.3 人员展示 展示根据标签筛选展示人员卡片，每页展示20个人员卡片，每行展示5个，模块最下方可进行翻页和页面跳转操作。

#### 2.3.1 人员卡片上要显示人员的照片、姓名、证件号、出生日期、业务标签和最后更新时间，点击人物卡片可跳转到人员详情页。
#### 2.3.2 人员详情页以简历形式展示，最上部展示照片、姓名、业务标签。基本信息（证件号、手机号、出生日期、邮箱、职业、邮箱），教育经历，工作经历，民航铁路信息（以时间轴形式展示航班、车次详情，左侧展示航班，右侧展示车次，默认展示最新三次，可展开），社交媒体动态（每款社交软件一个卡片，按时间顺序展示最新社交动态，可展开或滚动查看全部信息）。
## 3. 重点人员库
### 3.1 上部导航栏同首页
### 3.2 导航栏下左侧部分有重点人员库目录，可以列表形式展示所有重点人员库名称。
### 3.3 导航栏下右侧部分以人员卡片形式，展示左侧目录选中的人员库，每页展示16个卡片，可页面跳转。
## 4. 态势感知
包含导航栏、新闻动态、社交动态、新闻分析、社交分析
### 4.1 导航栏同首页

### 4.2 新闻动态模块

以卡片形式展示相关新闻，按日期进行排序，并且可以搜索关键词查找新闻，点入新闻可查看详情。

### 4.3 社交动态模块

以卡片形式展示社交动态内容，按社交平台进行展示，每个社交平台可点击查看发言详情和动态详情。

### 4.4 新闻分析

对新闻数据进行排名，选出今日热点排行前十，同步进行词云绘制。按新闻类别进行分类，并绘制图表。
### 4.5 社交分析

对社交数据进行排名，选出今日热点排行前十，同步进行词云绘制。按社交类别进行分类，并绘制图表。

## 5. 工作区

工作区分为两个模块，数据管理和模型管理。可通过二级菜单进行模块切换
### 5.1 数据管理

数据管理分为两大板块，个人区和公共区，个人区和公共区均支持类似网络云盘的各类文件上传、下载、管理，支持文件夹管理，文档的图标完全采用 word类似的图标。

系统支持用户登录功能，公共区的文档所有人可见，个人区的文档只有当前用户可见。

### 5.2 模型管理
用户可以新建模型，通过建模的方式精细化锁定重点人员，运行模型可通过模型计算来展示所有符合要求人员卡片，形成新的页面展示这些人员。用户可新增、删除模型。模型计算结果进行版本保存。

### 5.3 档案融合
用户可以针对上传的文件（Word和 excel，csv 两类数据）进行任务档案智能化（大模型）提取，并根据提取结果比对数据库中是否存在相似的人员档案（相似档案判断条件:原始姓名+出生日期+性别+国籍）。

## 数据存储模型设计
结构化数据采用 doris 4.0 存储，涉及到的数据表如下：

### 1. 人物表 (Unique Key 模型)
-- 人物表 - 使用 Unique Key 模型保证人物唯一性
CREATE TABLE IF NOT EXISTS person (
    `person_id` VARCHAR(200) NOT NULL COMMENT '人物编号：MD5(原始姓名+出生日期+性别+国籍)',
    `is_key_person` BOOLEAN DEFAULT false COMMENT '是否重点人群',
    `chinese_name` VARCHAR(100) COMMENT '中文姓名',
    `original_name` VARCHAR(200) COMMENT '原始姓名',
    `alias_names` ARRAY<VARCHAR(100)> COMMENT '人物别名',
    `avatar_files` ARRAY<VARCHAR(100)> COMMENT '头像文件SeaweedFS编号',
    `gender` VARCHAR(10) COMMENT '性别',
    `id_numbers` ARRAY<VARCHAR(50)> COMMENT '证件号码数组',
    `birth_date` DATETIME COMMENT '出生日期',
    `nationality` VARCHAR(100) COMMENT '国籍',
    `nationality_code` VARCHAR(3) COMMENT '国籍三字码',
    `household_address` VARCHAR(500) COMMENT '户籍地址',
    `highest_education` VARCHAR(50) COMMENT '最高学历',
    `phone_numbers` ARRAY<VARCHAR(20)> COMMENT '手机号数组',
    `emails` ARRAY<VARCHAR(100)> COMMENT '邮箱数组',
    `passport_numbers` ARRAY<VARCHAR(50)> COMMENT '护照号数组',
    `id_card_number` VARCHAR(18) COMMENT '身份证号',
    `twitter_accounts` ARRAY<VARCHAR(100)> COMMENT 'Twitter账号',
    `linkedin_accounts` ARRAY<VARCHAR(100)> COMMENT '领英账号',
    `facebook_accounts` ARRAY<VARCHAR(100)> COMMENT 'Facebook账号',
    `person_tags` ARRAY<VARCHAR(50)> COMMENT '人物标签名称数组',
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
    "storage_format" = "v2"
);

-- 创建索引优化查询性能
ALTER TABLE person ADD INDEX idx_key_person (is_key_person) USING BITMAP;
ALTER TABLE person ADD INDEX idx_chinese_name (chinese_name) USING INVERTED;
ALTER TABLE person ADD INDEX idx_original_name (original_name) USING INVERTED;
ALTER TABLE person ADD INDEX idx_nationality (nationality) USING INVERTED;
ALTER TABLE person ADD INDEX idx_birth_date (birth_date) USING INVERTED;
ALTER TABLE person ADD INDEX idx_tags (person_tags) USING INVERTED;
ALTER TABLE person ADD INDEX idx_gender (gender) USING BITMAP;
ALTER TABLE person ADD INDEX idx_education (highest_education) USING INVERTED;
ALTER TABLE person ADD INDEX idx_created_time (created_time) USING INVERTED;
ALTER TABLE person ADD INDEX idx_id_card (id_card_number) USING INVERTED;
ALTER TABLE person ADD INDEX idx_phone (phone_numbers) USING INVERTED;
ALTER TABLE person ADD INDEX idx_email (emails) USING INVERTED;

### 2. 人物行为活动数据人物行程表 (Unique Key 模型)
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

### 3.人物社交动态表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS person_social_dynamic (
    `dynamic_id` VARCHAR(64) NOT NULL COMMENT '社交动态编号：MD5(社交内容)',
    `social_account_type` VARCHAR(50) NOT NULL COMMENT '社交账号类型: TWITTER, LINKEDIN, FACEBOOK, WEIBO',
    `social_account` VARCHAR(200) NOT NULL COMMENT '社交账号',
    `title` VARCHAR(500) COMMENT '标题',
    `content` TEXT COMMENT '社交内容',
    `image_files` ARRAY<VARCHAR(100)> COMMENT '图片SeaweedFS编号',
    `publish_time` DATETIME NOT NULL COMMENT '发表时间',
    `publish_location` VARCHAR(200) COMMENT '发表地点',
    `like_count` BIGINT DEFAULT 0 COMMENT '点赞数',
    `share_count` BIGINT DEFAULT 0 COMMENT '转发数',
    `comment_count` BIGINT DEFAULT 0 COMMENT '评论数',
    `view_count` BIGINT DEFAULT 0 COMMENT '浏览量',
    `related_person_ids` ARRAY<VARCHAR(200)> COMMENT '关联人物编号',
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
ALTER TABLE person_social_dynamic ADD INDEX idx_related_persons (related_person_ids) USING INVERTED;
ALTER TABLE person_social_dynamic ADD INDEX idx_title (title) USING INVERTED;
ALTER TABLE person_social_dynamic ADD INDEX idx_location (publish_location) USING INVERTED;

### 4. 新闻表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS news (
    `news_id` VARCHAR(64) NOT NULL COMMENT '新闻编号：MD5(新闻标题+内容)',
    `media_name` VARCHAR(200) NOT NULL COMMENT '发表媒体名称',
    `title` VARCHAR(500) NOT NULL COMMENT '新闻标题',
    `content` TEXT COMMENT '新闻内容',
    `authors` ARRAY<VARCHAR(100)> COMMENT '新闻作者数组',
    `publish_time` DATETIME NOT NULL COMMENT '新闻发布时间',
    `tags` ARRAY<VARCHAR(50)> COMMENT '新闻标签列表',
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
ALTER TABLE news ADD INDEX idx_tags (tags) USING INVERTED;
ALTER TABLE news ADD INDEX idx_category (category) USING BITMAP;
ALTER TABLE news ADD INDEX idx_publish_time (publish_time) USING INVERTED;
ALTER TABLE news ADD INDEX idx_media (media_name) USING INVERTED;
ALTER TABLE news ADD INDEX idx_authors (authors) USING INVERTED;
ALTER TABLE news ADD INDEX idx_url (original_url) USING INVERTED;

### 5. 标签表 (Unique Key 模型)
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

### 6. 目录表 (Unique Key 模型)
CREATE TABLE IF NOT EXISTS directory (
    `directory_id` INT NOT NULL COMMENT '目录编号',
    `parent_directory_id` INT COMMENT '父目录编号',
    `directory_name` VARCHAR(200) NOT NULL COMMENT '目录名称',
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

### 7. 上传文档表 (Unique Key 模型)
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

### 8. 文档分块表 (支持向量检索)
CREATE TABLE IF NOT EXISTS document_chunk (
    `chunk_id` VARCHAR(64) NOT NULL COMMENT '分块编号：MD5(分块内容)',
    `document_id` VARCHAR(64) NOT NULL COMMENT '文档编号',
    `chunk_index` INT NOT NULL COMMENT '分块序号',
    `content` TEXT NOT NULL COMMENT '文本内容',
    `content_length` INT COMMENT '内容长度',
    `vector` ARRAY<FLOAT> COMMENT '向量嵌入',
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
ALTER TABLE document_chunk ADD INDEX idx_vector (vector) USING ANN(
    metric_type = 'COSINE',
    dimension = 1536,
    nlist = 1024,
    nprobe = 32
);
ALTER TABLE document_chunk ADD INDEX idx_chunk_index (chunk_index) USING INVERTED;

### 9. 问答历史表 (优化版)
CREATE TABLE IF NOT EXISTS qa_history (
    `session_id` VARCHAR(100) NOT NULL,
    `question_id` BIGINT NOT NULL,
    `user_id` VARCHAR(100),
    `question_type` VARCHAR(50) COMMENT '问题类型: DOC_QA-文档问答, PERSON_QUERY-人物查询, NEWS_SEARCH-新闻检索, TRAVEL_ANALYSIS-行程分析',
    `question` TEXT NOT NULL,
    `answer` TEXT,
    `source_doc_ids` ARRAY<VARCHAR(64)> COMMENT '引用的文档ID',
    `source_chunk_ids` ARRAY<VARCHAR(64)> COMMENT '引用的文本块ID',
    `source_person_ids` ARRAY<VARCHAR(200)> COMMENT '引用的人物ID',
    `source_news_ids` ARRAY<VARCHAR(64)> COMMENT '引用的新闻ID',
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
ALTER TABLE qa_history ADD INDEX idx_confidence (confidence_score) USING INVERTED;

### 关键查询示例
-- 1. 人物综合档案查询
SELECT 
    p.person_id,
    p.chinese_name,
    p.original_name,
    p.nationality,
    p.person_tags,
    COUNT(DISTINCT t.travel_id) as travel_count,
    COUNT(DISTINCT s.dynamic_id) as social_count,
    COUNT(DISTINCT n.news_id) as news_mention_count
FROM person p
LEFT JOIN person_travel t ON p.person_id = t.person_id 
    AND t.event_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
LEFT JOIN person_social_dynamic s ON ARRAY_CONTAINS(s.related_person_ids, p.person_id)
    AND s.publish_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
LEFT JOIN person_news_relation pnr ON p.person_id = pnr.person_id
LEFT JOIN news n ON pnr.news_id = n.news_id
    AND n.publish_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
WHERE p.is_key_person = true
    AND (ARRAY_CONTAINS(p.person_tags, '重点关注') OR p.nationality = '目标国家')
GROUP BY p.person_id, p.chinese_name, p.original_name, p.nationality, p.person_tags
ORDER BY travel_count DESC, social_count DESC
LIMIT 100;

-- 2. 新闻热点分析
SELECT 
    DATE_FORMAT(publish_time, '%Y-%m-%d %H:00:00') as time_slot,
    category,
    media_name,
    COUNT(*) as news_count,
    AVG(LENGTH(content)) as avg_content_length,
    GROUP_CONCAT(DISTINCT tag) as hot_tags,
    SUM(CASE WHEN ARRAY_LENGTH(tags) > 3 THEN 1 ELSE 0 END) as multi_tag_count
FROM news
WHERE publish_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE_FORMAT(publish_time, '%Y-%m-%d %H:00:00'), category, media_name
HAVING news_count > 5
ORDER BY time_slot DESC, news_count DESC;

-- 3. 文档问答向量检索
WITH query_vector AS (SELECT [0.1, 0.2, ...] as vec)  -- 这里替换为实际的查询向量
SELECT 
    c.chunk_id,
    c.content,
    d.document_title,
    d.document_type,
    vector_similarity(c.vector, qv.vec) as similarity_score,
    MATCH(c.content, '查询关键词') as text_relevance,
    c.metadata->>'page_num' as page_number
FROM document_chunk c
CROSS JOIN query_vector qv
JOIN uploaded_document d ON c.document_id = d.document_id
WHERE vector_similarity(c.vector, qv.vec) > 0.7
    OR MATCH(c.content, '查询关键词')
ORDER BY (vector_similarity(c.vector, qv.vec) * 0.6 + MATCH(c.content, '查询关键词') * 0.4) DESC
LIMIT 20;


## 存储选型
采用 docker-compose 运行存储采用 doris4.0，非结构化存储采用 seaweedfs 存储， docker-compose 文件均存储在项目 docker 目录下

## 架构/前后端设计
### 1. 系统分层
- **前端层（React 18 + Vite）**：负责页面渲染、交互逻辑、可视化大屏与地图、路由与状态管理。
- **后端层（Spring Boot 3.3 + JDK21）**：提供统一 REST API、权限控制、数据聚合与统计计算、异步任务调度。
- **数据层（Doris 4.0 + SeaweedFS）**：结构化数据存储与检索、文档与图片非结构化存储、向量检索支持。
- **基础能力**：鉴权与审计、缓存（热点统计）、全文检索与向量检索、日志与监控。

### 2. 前端模块与路由
- `/dashboard` 首页统计大屏：地图下钻、卡片统计、排名展示。
- `/persons` 人员档案：标签筛选、分页、人员详情。
- `/key-persons` 重点人员库：库目录、卡片列表。
- `/situational` 态势感知：新闻动态、社交动态、分析图表。
- `/workspace` 工作区：数据管理（文件/目录）、模型管理、档案融合。

### 3. 后端模块职责
- **Auth**：登录、会话、用户信息、权限控制（公共/个人区）。
- **Dashboard**：统计指标聚合、地图数据、排名计算。
- **Person**：档案查询、标签统计、详情聚合（行程/社交/新闻）。
- **KeyPerson**：重点人员库目录管理与人员列表。
- **Situational**：新闻/社交动态查询与分析统计。
- **Workspace**：文件管理、模型管理、档案融合任务与结果。

### 4. 关键数据流（概述）
1. **首页统计**：Dashboard API 聚合 Doris 统计结果 -> 前端大屏渲染地图与卡片。
2. **人员档案**：标签查询 -> 人员分页列表 -> 详情页聚合行程与社交数据。
3. **态势感知**：新闻/社交列表查询 -> 热点分析 -> 词云与排行。
4. **工作区**：文件上传至 SeaweedFS -> 元数据写入 Doris -> 可检索与融合任务。

## 需求拆分为实现任务
### 1. 基础设施与认证
- 登录/登出与用户信息接口、会话管理、权限校验（公共区/个人区）。
- 统一错误码与响应体、分页返回结构。
- 产出：Auth API、公共响应 DTO、权限拦截器、单元测试。

### 2. 首页统计大屏
- 全国/省级地图数据接口、下钻逻辑与省份热度计算。
- 机构分布、活跃省份、签证类型、人员类别统计接口。
- 产出：Dashboard API、统计聚合服务、可视化组件。

### 3. 人员档案
- 三级标签树与标签统计数量接口。
- 人员筛选与分页、人员详情聚合（基本信息、行程、社交动态）。
- 产出：Person API、标签服务、详情聚合服务、详情页组件。

### 4. 重点人员库
- 重点人员库目录查询、库内人员分页列表。
- 产出：KeyPerson API、人员卡片复用、库目录组件。

### 5. 态势感知
- 新闻与社交动态列表、关键词搜索、详情查看。
- 热点排行、词云数据、分类统计接口。
- 产出：Situational API、分析统计服务、图表组件。

### 6. 工作区
- 目录树与文件列表、上传/下载/删除、权限控制（个人/公共）。
- 模型管理（新建/删除/运行/结果版本）。
- 档案融合任务（解析文件->提取->相似匹配）。
- 产出：Workspace API、文件服务、模型任务服务、融合任务服务。

## REST 接口与数据模型概要
### 1. 统一响应与分页
```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```
分页返回建议：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

### 2. 核心 REST API（摘要）
#### 2.1 Auth
- `POST /api/auth/login`：登录
- `POST /api/auth/logout`：登出
- `GET /api/auth/me`：当前用户信息

#### 2.2 Dashboard
- `GET /api/dashboard/overview`：监测总数、重点人员数、今日新闻数、社交动态数
- `GET /api/dashboard/map/provinces`：全国省级热度与数量
- `GET /api/dashboard/map/provinces/{provinceCode}/cities`：省级下钻城市热度
- `GET /api/dashboard/stats/organizations`：机构分布统计
- `GET /api/dashboard/stats/active-provinces?type=all|yesterdayAdded|yesterdayLeft|stay`：活跃省份排行
- `GET /api/dashboard/stats/visa-types`：签证类型排行
- `GET /api/dashboard/stats/person-categories`：人员类别排行

#### 2.3 Person
- `GET /api/tags/tree`：三级标签树
- `GET /api/tags/stats`：标签人数统计
- `GET /api/persons`：人员列表（筛选 + 分页）
- `GET /api/persons/{personId}`：人员详情
- `GET /api/persons/{personId}/travels`：行程列表（时间轴）
- `GET /api/persons/{personId}/social-dynamics`：社交动态

#### 2.4 Key Person
- `GET /api/key-person-libraries`：重点人员库目录
- `GET /api/key-person-libraries/{libraryId}/persons`：库内人员分页

#### 2.5 Situational
- `GET /api/news`：新闻列表（关键词、分类、时间）
- `GET /api/news/{newsId}`：新闻详情
- `GET /api/news/analysis/hot`：热点排行、词云数据
- `GET /api/social-dynamics`：社交动态列表（平台、时间）
- `GET /api/social-dynamics/{dynamicId}`：动态详情
- `GET /api/social-analysis/hot`：社交热点排行、词云数据

#### 2.6 Workspace
- `GET /api/workspace/directories`：目录树
- `GET /api/workspace/files?directoryId=`：文件列表
- `POST /api/workspace/files/upload`：文件上传
- `GET /api/workspace/files/{documentId}/download`：文件下载
- `DELETE /api/workspace/files/{documentId}`：文件删除
- `POST /api/workspace/models`：新建模型
- `DELETE /api/workspace/models/{modelId}`：删除模型
- `POST /api/workspace/models/{modelId}/run`：运行模型
- `GET /api/workspace/models/{modelId}/runs`：模型版本与结果
- `POST /api/workspace/fusion-tasks`：创建档案融合任务
- `GET /api/workspace/fusion-tasks/{taskId}`：任务状态与结果

### 3. DTO/Entity 概要（对齐现有表）
#### 3.1 PersonDTO / PersonEntity（person）
- `personId`、`isKeyPerson`、`chineseName`、`originalName`
- `gender`、`birthDate`、`nationality`、`personTags`
- `idNumbers`、`phoneNumbers`、`emails`、`avatarFiles`
- `educationExperience`、`workExperience`、`updatedTime`

#### 3.2 PersonTravelDTO / PersonTravelEntity（person_travel）
- `travelId`、`personId`、`eventTime`
- `departure`、`destination`、`travelType`、`ticketNumber`

#### 3.3 PersonSocialDynamicDTO / PersonSocialDynamicEntity（person_social_dynamic）
- `dynamicId`、`socialAccountType`、`socialAccount`
- `title`、`content`、`publishTime`、`publishLocation`
- `likeCount`、`shareCount`、`commentCount`、`viewCount`
- `relatedPersonIds`、`imageFiles`

#### 3.4 NewsDTO / NewsEntity（news）
- `newsId`、`mediaName`、`title`、`content`
- `authors`、`publishTime`、`tags`、`category`

#### 3.5 TagDTO / TagEntity（tag）
- `tagId`、`firstLevelName`、`secondLevelName`
- `tagName`、`parentTagId`、`calculationRules`

#### 3.6 DirectoryDTO / DirectoryEntity（directory）
- `directoryId`、`parentDirectoryId`、`directoryName`
- `creatorUserId`、`creatorUsername`

#### 3.7 UploadedDocumentDTO / UploadedDocumentEntity（uploaded_document）
- `documentId`、`documentName`、`documentType`
- `filePathId`、`fileSize`、`source`
- `originalContent`、`metadata`、`directoryId`

#### 3.8 DocumentChunkDTO / DocumentChunkEntity（document_chunk）
- `chunkId`、`documentId`、`chunkIndex`
- `content`、`contentLength`、`vector`、`metadata`

#### 3.9 QaHistoryDTO / QaHistoryEntity（qa_history）
- `sessionId`、`questionId`、`questionType`
- `question`、`answer`、`confidenceScore`
- `sourceDocIds`、`sourcePersonIds`、`sourceNewsIds`

### 4. 需要补充的模型（建议）
为满足“重点人员库/模型管理/档案融合”功能，可新增下列表（字段按实现细化）：\n
- **key_person_library**：库信息（libraryId、name、description、ownerUserId）。\n
- **key_person_library_member**：库与人员关系（libraryId、personId）。\n
- **analysis_model**：模型定义（modelId、name、conditions、creatorUserId）。\n
- **analysis_model_run**：模型运行与版本结果（runId、modelId、status、resultSnapshot）。\n
- **fusion_task / fusion_result**：档案融合任务与匹配结果。

