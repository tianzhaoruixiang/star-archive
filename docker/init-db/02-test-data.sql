-- ==========================================
-- 测试数据插入脚本
-- ==========================================
USE person_monitor;

-- 插入测试标签数据
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, created_time, updated_time) VALUES
(1, '基本属性', NULL, '年龄', '年龄段分类', NOW(), NOW()),
(101, '基本属性', '年龄', '50后', '1950-1959年出生', NOW(), NOW()),
(102, '基本属性', '年龄', '60后', '1960-1969年出生', NOW(), NOW()),
(103, '基本属性', '年龄', '70后', '1970-1979年出生', NOW(), NOW()),
(104, '基本属性', '年龄', '80后', '1980-1989年出生', NOW(), NOW()),
(105, '基本属性', '年龄', '90后', '1990-1999年出生', NOW(), NOW()),

(2, '基本属性', NULL, '性别', '性别分类', NOW(), NOW()),
(201, '基本属性', '性别', '男', '男性', NOW(), NOW()),
(202, '基本属性', '性别', '女', '女性', NOW(), NOW()),

(3, '基本属性', NULL, '教育水平', '学历分类', NOW(), NOW()),
(301, '基本属性', '教育水平', '高中及以下', '高中及以下学历', NOW(), NOW()),
(302, '基本属性', '教育水平', '本科', '本科学历', NOW(), NOW()),
(303, '基本属性', '教育水平', '硕士及以上', '硕士及以上学历', NOW(), NOW());

-- 插入测试人员数据（Doris ARRAY 使用 ARRAY() 函数）
INSERT INTO person (
    person_id, chinese_name, original_name, gender, birth_date,
    nationality, nationality_code, highest_education,
    id_card_number, phone_numbers, emails,
    person_tags, is_key_person, created_time, updated_time
) VALUES
(
    md5('张三1990-01-01男中国'),
    '张三',
    'Zhang San',
    '男',
    '1990-01-01 00:00:00',
    '中国',
    'CHN',
    '本科',
    '110101199001011234',
    ARRAY('13800138000'),
    ARRAY('zhangsan@example.com'),
    ARRAY('重点关注', '80后'),
    true,
    NOW(),
    NOW()
),
(
    md5('李四1985-05-15女中国'),
    '李四',
    'Li Si',
    '女',
    '1985-05-15 00:00:00',
    '中国',
    'CHN',
    '硕士及以上',
    '110101198505151234',
    ARRAY('13900139000'),
    ARRAY('lisi@example.com'),
    ARRAY('80后'),
    false,
    NOW(),
    NOW()
),
(
    md5('王五1975-08-20男中国'),
    '王五',
    'Wang Wu',
    '男',
    '1975-08-20 00:00:00',
    '中国',
    'CHN',
    '本科',
    '110101197508201234',
    ARRAY('13700137000'),
    ARRAY('wangwu@example.com'),
    ARRAY('70后'),
    true,
    NOW(),
    NOW()
);

-- 插入测试行程数据（需提供 travel_id）
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
);

-- 插入测试社交动态数据（Doris ARRAY 使用 ARRAY()）
INSERT INTO person_social_dynamic (
    dynamic_id, social_account_type, social_account,
    title, content, publish_time, publish_location,
    like_count, share_count, comment_count, view_count,
    related_person_ids, created_time, updated_time
) VALUES
(
    md5('测试动态1'),
    'TWITTER',
    '@zhangsan',
    '今日分享',
    '今天天气真不错,分享一下我的生活。',
    '2025-01-21 10:00:00',
    '北京',
    100, 20, 30, 500,
    ARRAY(md5('张三1990-01-01男中国')),
    NOW(),
    NOW()
);

-- 插入测试新闻数据（Doris ARRAY 使用 ARRAY()）
INSERT INTO news (
    news_id, media_name, title, content,
    publish_time, category, tags, created_time, updated_time
) VALUES
(
    md5('测试新闻1'),
    '人民日报',
    '科技创新推动经济发展',
    '近日,我国科技创新取得重大突破,为经济发展注入新动力。',
    '2025-01-21 09:00:00',
    'TECHNOLOGY',
    ARRAY('科技', '创新', '经济'),
    NOW(),
    NOW()
),
(
    md5('测试新闻2'),
    '新华社',
    '文化交流促进国际友谊',
    '国际文化交流活动在京举行,多国友人共聚一堂。',
    '2025-01-21 10:30:00',
    'CULTURE',
    ARRAY('文化', '国际', '交流'),
    NOW(),
    NOW()
);
