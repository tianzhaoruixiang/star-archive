-- ==========================================
-- 测试数据插入脚本（全字段）
-- Doris 4.0
-- ==========================================
USE person_monitor;

-- 插入测试标签数据（含 calculation_rules, parent_tag_id）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id, created_time, updated_time) VALUES
(1, '基本属性', NULL, '年龄', '年龄段分类', NULL, NULL, NOW(), NOW()),
(101, '基本属性', '年龄', '50后', '1950-1959年出生', NULL, 1, NOW(), NOW()),
(102, '基本属性', '年龄', '60后', '1960-1969年出生', NULL, 1, NOW(), NOW()),
(103, '基本属性', '年龄', '70后', '1970-1979年出生', NULL, 1, NOW(), NOW()),
(104, '基本属性', '年龄', '80后', '1980-1989年出生', NULL, 1, NOW(), NOW()),
(105, '基本属性', '年龄', '90后', '1990-1999年出生', NULL, 1, NOW(), NOW()),
(2, '基本属性', NULL, '性别', '性别分类', NULL, NULL, NOW(), NOW()),
(201, '基本属性', '性别', '男', '男性', NULL, 2, NOW(), NOW()),
(202, '基本属性', '性别', '女', '女性', NULL, 2, NOW(), NOW()),
(3, '基本属性', NULL, '教育水平', '学历分类', NULL, NULL, NOW(), NOW()),
(301, '基本属性', '教育水平', '高中及以下', '高中及以下学历', NULL, 3, NOW(), NOW()),
(302, '基本属性', '教育水平', '本科', '本科学历', NULL, 3, NOW(), NOW()),
(303, '基本属性', '教育水平', '硕士及以上', '硕士及以上学历', NULL, 3, NOW(), NOW());

-- 插入测试人员数据（全字段）
INSERT INTO person (
    person_id, person_type, is_key_person, chinese_name, original_name, alias_names, avatar_files,
    gender, id_numbers, birth_date, nationality, nationality_code, household_address, highest_education,
    phone_numbers, emails, passport_numbers, id_card_number,
    twitter_accounts, linkedin_accounts, facebook_accounts,
    person_tags, work_experience, education_experience, remark, created_time, updated_time
) VALUES
(
    md5('张三1990-01-01男中国'),
    '重点人员',
    true,
    '张三',
    'Zhang San',
    ARRAY('阿三', '老三'),
    NULL,
    '男',
    ARRAY('110101199001011234'),
    '1990-01-01 00:00:00',
    '中国',
    'CHN',
    '北京市东城区某某街道1号',
    '本科',
    ARRAY('13800138000'),
    ARRAY('zhangsan@example.com'),
    NULL,
    '110101199001011234',
    ARRAY('@zhangsan_tw'),
    ARRAY('zhangsan-linkedin'),
    NULL,
    ARRAY('重点关注', '80后'),
    '[{"start_time":"2020-07","end_time":"2024-12","organization":"某科技公司","department":"研发部","job":"工程师"}]',
    '[{"start_time":"2008-09","end_time":"2012-06","school_name":"某某大学","department":"计算机系","major":"软件工程"}]',
    '测试重点人员档案',
    NOW(),
    NOW()
),
(
    md5('李四1985-05-15女中国'),
    '普通人员',
    false,
    '李四',
    'Li Si',
    NULL,
    NULL,
    '女',
    ARRAY('110101198505151234'),
    '1985-05-15 00:00:00',
    '中国',
    'CHN',
    '北京市西城区某某路2号',
    '硕士及以上',
    ARRAY('13900139000'),
    ARRAY('lisi@example.com'),
    NULL,
    '110101198505151234',
    NULL,
    ARRAY('lisi-professional'),
    NULL,
    ARRAY('80后'),
    '[{"start_time":"2018-03","end_time":"2024-01","organization":"某研究院","department":"数据分析","job":"研究员"}]',
    '[{"start_time":"2003-09","end_time":"2007-06","school_name":"某某大学","department":"数学系","major":"应用数学"},{"start_time":"2007-09","end_time":"2010-06","school_name":"某某大学","department":"统计系","major":"统计学"}]',
    NULL,
    NOW(),
    NOW()
),
(
    md5('王五1975-08-20男中国'),
    '重点人员',
    true,
    '王五',
    'Wang Wu',
    ARRAY('老王'),
    NULL,
    '男',
    ARRAY('110101197508201234'),
    '1975-08-20 00:00:00',
    '中国',
    'CHN',
    '上海市浦东新区某某大道3号',
    '本科',
    ARRAY('13700137000'),
    ARRAY('wangwu@example.com'),
    NULL,
    '110101197508201234',
    ARRAY('@wangwu_news'),
    NULL,
    NULL,
    ARRAY('70后', '重点关注'),
    '[{"start_time":"1998-07","end_time":"2024-12","organization":"某集团","department":"管理层","job":"总监"}]',
    '[{"start_time":"1993-09","end_time":"1997-06","school_name":"某某大学","department":"经管系","major":"工商管理"}]',
    '测试重点人员',
    NOW(),
    NOW()
);

-- 插入测试行程数据（全字段已覆盖）
INSERT INTO person_travel (
    travel_id, person_id, event_time, person_name, departure, destination,
    travel_type, ticket_number, created_time, updated_time
) VALUES
(
    1,
    md5('张三1990-01-01男中国'),
    '2025-01-15 10:30:00',
    '张三',
    '北京首都国际机场',
    '上海浦东国际机场',
    'FLIGHT',
    'CA1234',
    NOW(),
    NOW()
),
(
    2,
    md5('张三1990-01-01男中国'),
    '2025-01-20 14:20:00',
    '张三',
    '上海虹桥站',
    '杭州东站',
    'TRAIN',
    'G7123',
    NOW(),
    NOW()
),
(
    3,
    md5('王五1975-08-20男中国'),
    '2025-01-18 08:00:00',
    '王五',
    '上海市区',
    '苏州工业园区',
    'CAR',
    NULL,
    NOW(),
    NOW()
);

-- 插入测试社交动态数据（含 image_files, extended_fields）
INSERT INTO person_social_dynamic (
    dynamic_id, publish_time, social_account_type, social_account, title, content,
    image_files, publish_location, like_count, share_count, comment_count, view_count,
    related_person_ids, extended_fields, created_time, updated_time
) VALUES
(
    md5('测试动态1'),
    '2025-01-21 10:00:00',
    'TWITTER',
    '@zhangsan',
    '今日分享',
    '今天天气真不错,分享一下我的生活。',
    NULL,
    '北京',
    100,
    20,
    30,
    500,
    ARRAY(md5('张三1990-01-01男中国')),
    '{"topic_ids":[], "mentioned_users":["@friend1"], "hashtags":["生活","分享"]}',
    NOW(),
    NOW()
),
(
    md5('测试动态2'),
    '2025-01-22 14:00:00',
    'LINKEDIN',
    '王五',
    '行业观察',
    '近期行业趋势分析摘要。',
    NULL,
    '上海',
    50,
    10,
    5,
    200,
    ARRAY(md5('王五1975-08-20男中国')),
    '{"topic_ids":["tech"], "mentioned_users":[], "hashtags":["行业","趋势"]}',
    NOW(),
    NOW()
);

-- 插入测试新闻数据（含 authors, original_url）
INSERT INTO news (
    news_id, publish_time, media_name, title, content, authors, tags, original_url, category, created_time, updated_time
) VALUES
(
    md5('测试新闻1'),
    '2025-01-21 09:00:00',
    '人民日报',
    '科技创新推动经济发展',
    '近日,我国科技创新取得重大突破,为经济发展注入新动力。',
    ARRAY('记者A', '记者B'),
    ARRAY('科技', '创新', '经济'),
    'https://example.com/news/tech-20250121',
    'TECHNOLOGY',
    NOW(),
    NOW()
),
(
    md5('测试新闻2'),
    '2025-01-21 10:30:00',
    '新华社',
    '文化交流促进国际友谊',
    '国际文化交流活动在京举行,多国友人共聚一堂。',
    ARRAY('记者C'),
    ARRAY('文化', '国际', '交流'),
    'https://example.com/news/culture-20250121',
    'CULTURE',
    NOW(),
    NOW()
),
(
    md5('测试新闻3'),
    '2025-01-22 08:00:00',
    '经济日报',
    '一季度经济数据解读',
    '一季度主要经济指标公布,稳中有进。',
    ARRAY('分析师D'),
    ARRAY('经济', '数据'),
    'https://example.com/news/economy-20250122',
    'ECONOMY',
    NOW(),
    NOW()
);
