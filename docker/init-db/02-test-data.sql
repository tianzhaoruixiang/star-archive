-- ==========================================
-- 测试数据插入脚本（全字段）
-- Doris 4.0
-- ==========================================
USE person_monitor;

-- 会话字符集设为 UTF-8，避免中文乱码（Doris 使用 utf8）
SET NAMES 'utf8';

-- ==========================================
-- 标签体系数据（README 2.2 六类三级标签）
-- 一级：基本属性、身份属性、组织结构、异常行为、关系属性、行为规律
-- ==========================================
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id, created_time, updated_time) VALUES
-- 2.2.1 基本属性 - 年龄（通过出生日期计算）
(1, '基本属性', '年龄', '50后', '1950-1959年出生', 'birth_date 年份 1950-1959', NULL, NOW(), NOW()),
(2, '基本属性', '年龄', '60后', '1960-1969年出生', 'birth_date 年份 1960-1969', NULL, NOW(), NOW()),
(3, '基本属性', '年龄', '70后', '1970-1979年出生', 'birth_date 年份 1970-1979', NULL, NOW(), NOW()),
(4, '基本属性', '年龄', '80后', '1980-1989年出生', 'birth_date 年份 1980-1989', NULL, NOW(), NOW()),
(5, '基本属性', '年龄', '90后', '1990-1999年出生', 'birth_date 年份 1990-1999', NULL, NOW(), NOW()),
-- 基本属性 - 性别
(10, '基本属性', '性别', '男', '男性', 'gender=男', NULL, NOW(), NOW()),
(11, '基本属性', '性别', '女', '女性', 'gender=女', NULL, NOW(), NOW()),
-- 基本属性 - 教育水平
(20, '基本属性', '教育水平', '高中及以下', '高中及以下学历', 'highest_education 匹配高中及以下', NULL, NOW(), NOW()),
(21, '基本属性', '教育水平', '本科', '本科学历', 'highest_education 匹配本科', NULL, NOW(), NOW()),
(22, '基本属性', '教育水平', '硕士及以上', '硕士及以上学历', 'highest_education 匹配硕士及以上', NULL, NOW(), NOW()),
-- 基本属性 - 原籍地
(30, '基本属性', '原籍地', '北京市', '户籍/籍贯北京市', NULL, NULL, NOW(), NOW()),
(31, '基本属性', '原籍地', '上海市', '户籍/籍贯上海市', NULL, NULL, NOW(), NOW()),
(32, '基本属性', '原籍地', '天津市', '户籍/籍贯天津市', NULL, NULL, NOW(), NOW()),
(33, '基本属性', '原籍地', '重庆市', '户籍/籍贯重庆市', NULL, NULL, NOW(), NOW()),
(34, '基本属性', '原籍地', '河北省', '户籍/籍贯河北省', NULL, NULL, NOW(), NOW()),
(35, '基本属性', '原籍地', '山西省', '户籍/籍贯山西省', NULL, NULL, NOW(), NOW()),
(36, '基本属性', '原籍地', '辽宁省', '户籍/籍贯辽宁省', NULL, NULL, NOW(), NOW()),
(37, '基本属性', '原籍地', '吉林省', '户籍/籍贯吉林省', NULL, NULL, NOW(), NOW()),
(38, '基本属性', '原籍地', '黑龙江省', '户籍/籍贯黑龙江省', NULL, NULL, NOW(), NOW()),
(39, '基本属性', '原籍地', '江苏省', '户籍/籍贯江苏省', NULL, NULL, NOW(), NOW()),
(40, '基本属性', '原籍地', '浙江省', '户籍/籍贯浙江省', NULL, NULL, NOW(), NOW()),
(41, '基本属性', '原籍地', '安徽省', '户籍/籍贯安徽省', NULL, NULL, NOW(), NOW()),
(42, '基本属性', '原籍地', '福建省', '户籍/籍贯福建省', NULL, NULL, NOW(), NOW()),
(43, '基本属性', '原籍地', '江西省', '户籍/籍贯江西省', NULL, NULL, NOW(), NOW()),
(44, '基本属性', '原籍地', '山东省', '户籍/籍贯山东省', NULL, NULL, NOW(), NOW()),
(45, '基本属性', '原籍地', '河南省', '户籍/籍贯河南省', NULL, NULL, NOW(), NOW()),
(46, '基本属性', '原籍地', '湖北省', '户籍/籍贯湖北省', NULL, NULL, NOW(), NOW()),
(47, '基本属性', '原籍地', '湖南省', '户籍/籍贯湖南省', NULL, NULL, NOW(), NOW()),
(48, '基本属性', '原籍地', '广东省', '户籍/籍贯广东省', NULL, NULL, NOW(), NOW()),
(49, '基本属性', '原籍地', '海南省', '户籍/籍贯海南省', NULL, NULL, NOW(), NOW()),
(50, '基本属性', '原籍地', '四川省', '户籍/籍贯四川省', NULL, NULL, NOW(), NOW()),
(51, '基本属性', '原籍地', '贵州省', '户籍/籍贯贵州省', NULL, NULL, NOW(), NOW()),
(52, '基本属性', '原籍地', '云南省', '户籍/籍贯云南省', NULL, NULL, NOW(), NOW()),
(53, '基本属性', '原籍地', '陕西省', '户籍/籍贯陕西省', NULL, NULL, NOW(), NOW()),
(54, '基本属性', '原籍地', '甘肃省', '户籍/籍贯甘肃省', NULL, NULL, NOW(), NOW()),
(55, '基本属性', '原籍地', '青海省', '户籍/籍贯青海省', NULL, NULL, NOW(), NOW()),
(56, '基本属性', '原籍地', '台湾省', '户籍/籍贯台湾省', NULL, NULL, NOW(), NOW()),
(57, '基本属性', '原籍地', '内蒙古自治区', '户籍/籍贯内蒙古', NULL, NULL, NOW(), NOW()),
(58, '基本属性', '原籍地', '广西壮族自治区', '户籍/籍贯广西', NULL, NULL, NOW(), NOW()),
(59, '基本属性', '原籍地', '西藏自治区', '户籍/籍贯西藏', NULL, NULL, NOW(), NOW()),
(60, '基本属性', '原籍地', '宁夏回族自治区', '户籍/籍贯宁夏', NULL, NULL, NOW(), NOW()),
(61, '基本属性', '原籍地', '新疆维吾尔自治区', '户籍/籍贯新疆', NULL, NULL, NOW(), NOW()),
(62, '基本属性', '原籍地', '香港特别行政区', '户籍/籍贯香港', NULL, NULL, NOW(), NOW()),
(63, '基本属性', '原籍地', '澳门特别行政区', '户籍/籍贯澳门', NULL, NULL, NOW(), NOW()),
-- 基本属性 - 拥有境外社交媒体
(70, '基本属性', '拥有境外社交媒体', 'X', '拥有 Twitter/X 账号', NULL, NULL, NOW(), NOW()),
(71, '基本属性', '拥有境外社交媒体', 'FB', '拥有 Facebook 账号', NULL, NULL, NOW(), NOW()),
-- 基本属性 - 入境签证类型
(80, '基本属性', '入境签证类型', '公务签证', '公务签证', NULL, NULL, NOW(), NOW()),
(81, '基本属性', '入境签证类型', '外交签证', '外交签证', NULL, NULL, NOW(), NOW()),
(82, '基本属性', '入境签证类型', '记者签证', '记者签证', NULL, NULL, NOW(), NOW()),
(83, '基本属性', '入境签证类型', '旅游签证', '旅游签证', NULL, NULL, NOW(), NOW()),
(84, '基本属性', '入境签证类型', '其他', '其他签证类型', NULL, NULL, NOW(), NOW()),
-- 2.2.2 身份属性
(100, '身份属性', '外国', '2015年后长期出国', '2015年后长期出国', NULL, NULL, NOW(), NOW()),
(101, '身份属性', '外国', '2020年后出国', '2020年后出国', NULL, NULL, NOW(), NOW()),
(102, '身份属性', '外国', '出入第三国', '出入第三国', NULL, NULL, NOW(), NOW()),
(110, '身份属性', '留学生', '留学生', '留学生', NULL, NULL, NOW(), NOW()),
(111, '身份属性', '留学生', '毕业后来华', '毕业后来华', NULL, NULL, NOW(), NOW()),
-- 2.2.3 组织结构
(120, '组织结构', '机构', '1机构', '1机构', NULL, NULL, NOW(), NOW()),
(121, '组织结构', '机构', '2机构', '2机构', NULL, NULL, NOW(), NOW()),
(122, '组织结构', '机构', '3机构', '3机构', NULL, NULL, NOW(), NOW()),
(123, '组织结构', '机构', '4机构', '4机构', NULL, NULL, NOW(), NOW()),
(124, '组织结构', '机构', '5机构', '5机构', NULL, NULL, NOW(), NOW()),
(125, '组织结构', '机构', '6机构', '6机构', NULL, NULL, NOW(), NOW()),
-- 2.2.4 异常行为
(130, '异常行为', '特殊人群', '1类', '特殊人群1类', NULL, NULL, NOW(), NOW()),
(131, '异常行为', '特殊人群', '2类', '特殊人群2类', NULL, NULL, NOW(), NOW()),
(132, '异常行为', '特殊人群', '3类', '特殊人群3类', NULL, NULL, NOW(), NOW()),
(133, '异常行为', '特殊人群', '4类', '特殊人群4类', NULL, NULL, NOW(), NOW()),
(134, '异常行为', '特殊人群', '5类', '特殊人群5类', NULL, NULL, NOW(), NOW()),
(140, '异常行为', '高消费群体', '曾住高档酒店', '曾住高档酒店', NULL, NULL, NOW(), NOW()),
(141, '异常行为', '高消费群体', '铁路一等/商务座', '铁路一等/商务座', NULL, NULL, NOW(), NOW()),
(150, '异常行为', '小众APP', '境外社交', '境外社交', NULL, NULL, NOW(), NOW()),
(151, '异常行为', '小众APP', '金融借贷', '金融借贷', NULL, NULL, NOW(), NOW()),
(152, '异常行为', '小众APP', '涉黄赌毒', '涉黄赌毒', NULL, NULL, NOW(), NOW()),
(153, '异常行为', '小众APP', '音视频', '音视频', NULL, NULL, NOW(), NOW()),
(160, '异常行为', '其他', '其他', '异常行为其他', NULL, NULL, NOW(), NOW()),
-- 2.2.5 关系属性
(170, '关系属性', NULL, '同行人员', '同行人员', NULL, NULL, NOW(), NOW()),
(171, '关系属性', NULL, '个人关系', '个人关系', NULL, NULL, NOW(), NOW()),
(172, '关系属性', NULL, '通讯录好友', '通讯录好友', NULL, NULL, NOW(), NOW()),
-- 2.2.6 行为规律
(180, '行为规律', '历史出国频次', '高>=10', '历史出国频次高(>=10次)', NULL, NULL, NOW(), NOW()),
(181, '行为规律', '历史出国频次', '中5-10', '历史出国频次中(5-10次)', NULL, NULL, NOW(), NOW()),
(182, '行为规律', '历史出国频次', '低<5', '历史出国频次低(<5次)', NULL, NULL, NOW(), NOW()),
(190, '行为规律', '常活动城市', '北京', '常活动城市北京', NULL, NULL, NOW(), NOW()),
(191, '行为规律', '常活动城市', '沈阳', '常活动城市沈阳', NULL, NULL, NOW(), NOW()),
(192, '行为规律', '常活动城市', '丹东', '常活动城市丹东', NULL, NULL, NOW(), NOW()),
(193, '行为规律', '常活动城市', '上海', '常活动城市上海', NULL, NULL, NOW(), NOW()),
(194, '行为规律', '常活动城市', '广州', '常活动城市广州', NULL, NULL, NOW(), NOW()),
(195, '行为规律', '常活动城市', '深圳', '常活动城市深圳', NULL, NULL, NOW(), NOW()),
(196, '行为规律', '常活动城市', '成都', '常活动城市成都', NULL, NULL, NOW(), NOW()),
(197, '行为规律', '常活动城市', '武汉', '常活动城市武汉', NULL, NULL, NOW(), NOW()),
(198, '行为规律', '常活动城市', '杭州', '常活动城市杭州', NULL, NULL, NOW(), NOW()),
(200, '行为规律', '近三年出国频次', '2次及以下', '近三年出国2次及以下', NULL, NULL, NOW(), NOW()),
(201, '行为规律', '近三年出国频次', '2-5次', '近三年出国2-5次', NULL, NULL, NOW(), NOW()),
(202, '行为规律', '近三年出国频次', '5-10次', '近三年出国5-10次', NULL, NULL, NOW(), NOW()),
(203, '行为规律', '近三年出国频次', '10次以上', '近三年出国10次以上', NULL, NULL, NOW(), NOW()),
(210, '行为规律', NULL, '国内到访城市>5', '国内大范围出行(到访城市>5)', NULL, NULL, NOW(), NOW()),
(211, '行为规律', NULL, '往返第三国', '往返第三国', NULL, NULL, NOW(), NOW()),
(212, '行为规律', NULL, '出国未归', '出国未归', NULL, NULL, NOW(), NOW()),
(213, '行为规律', NULL, '多次快进快出', '多次快进快出', NULL, NULL, NOW(), NOW());

-- 插入测试人员数据（全字段，含机构、所属群体）
INSERT INTO person (
    person_id, person_type, is_key_person, chinese_name, original_name, alias_names, organization, belonging_group, avatar_files,
    gender, id_numbers, birth_date, nationality, nationality_code, household_address, highest_education,
    phone_numbers, emails, passport_numbers, id_card_number, visa_type, visa_number,
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
    '某科技公司',
    '康复',
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
    '公务签证',
    'V2025001',
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
    '某研究院',
    '确诊',
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
    '旅游签证',
    NULL,
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
    '某集团',
    '疑似',
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
    '公务签证',
    'V2025003',
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

-- 插入测试行程数据（含 visa_type、destination_province、departure_province）
INSERT INTO person_travel (
    travel_id, person_id, event_time, person_name, departure, destination,
    travel_type, ticket_number, visa_type, destination_province, departure_province,
    created_time, updated_time
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
    '公务签证',
    '上海市',
    '北京市',
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
    NULL,
    '浙江省',
    '上海市',
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
    NULL,
    '江苏省',
    '上海市',
    NOW(),
    NOW()
),
(
    4,
    md5('李四1985-05-15女中国'),
    '2025-01-22 07:45:00',
    '李四',
    '广州白云国际机场',
    '北京首都国际机场',
    'FLIGHT',
    'CZ3001',
    '旅游签证',
    '北京市',
    '广东省',
    NOW(),
    NOW()
),
(
    5,
    md5('李四1985-05-15女中国'),
    '2025-01-25 09:00:00',
    '李四',
    '深圳北站',
    '广州南站',
    'TRAIN',
    'G6012',
    NULL,
    '广东省',
    '广东省',
    NOW(),
    NOW()
),
(
    6,
    md5('张三1990-01-01男中国'),
    '2025-01-28 16:30:00',
    '张三',
    '杭州萧山国际机场',
    '成都双流国际机场',
    'FLIGHT',
    'CA4512',
    '公务签证',
    '四川省',
    '浙江省',
    NOW(),
    NOW()
),
(
    7,
    md5('王五1975-08-20男中国'),
    '2025-02-01 08:15:00',
    '王五',
    '南京南站',
    '武汉站',
    'TRAIN',
    'D3022',
    NULL,
    '湖北省',
    '江苏省',
    NOW(),
    NOW()
),
(
    8,
    md5('李四1985-05-15女中国'),
    '2025-02-03 11:20:00',
    '李四',
    '北京首都国际机场',
    '上海浦东国际机场',
    'FLIGHT',
    'MU5102',
    '旅游签证',
    '上海市',
    '北京市',
    NOW(),
    NOW()
),
(
    9,
    md5('张三1990-01-01男中国'),
    '2025-02-05 14:00:00',
    '张三',
    '成都东站',
    '重庆北站',
    'TRAIN',
    'G8513',
    NULL,
    '重庆市',
    '四川省',
    NOW(),
    NOW()
),
(
    10,
    md5('王五1975-08-20男中国'),
    '2025-02-08 06:40:00',
    '王五',
    '上海虹桥国际机场',
    '深圳宝安国际机场',
    'FLIGHT',
    'ZH9508',
    '公务签证',
    '广东省',
    '上海市',
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

-- 插入重点人员库目录（用于「重点人员库」页面左侧列表）
INSERT INTO directory (directory_id, parent_directory_id, directory_name, creator_username, creator_user_id, created_time, updated_time) VALUES
(1, NULL, '重点关注名单', 'admin', 1, NOW(), NOW()),
(2, NULL, '出入境重点', 'admin', 1, NOW(), NOW()),
(3, NULL, '舆情关联人员', 'admin', 1, NOW(), NOW());

-- 插入重点人员库-人员关联（目录1含张三、王五；目录2含张三；目录3含王五）
INSERT INTO person_directory (directory_id, person_id, created_time) VALUES
(1, md5('张三1990-01-01男中国'), NOW()),
(1, md5('王五1975-08-20男中国'), NOW()),
(2, md5('张三1990-01-01男中国'), NOW()),
(3, md5('王五1975-08-20男中国'), NOW());

-- 系统配置默认值（系统名称、Logo、前端 base URL、各导航显示隐藏）
INSERT INTO system_config (config_key, config_value, updated_time) VALUES
('system_name', '重点人员档案监测系统', NOW()),
('system_logo_url', '', NOW()),
('frontend_base_url', '/', NOW()),
('nav_dashboard', 'true', NOW()),
('nav_persons', 'true', NOW()),
('nav_key_person_library', 'true', NOW()),
('nav_workspace', 'true', NOW()),
('nav_model_management', 'true', NOW()),
('nav_situation', 'true', NOW()),
('nav_system_config', 'true', NOW());

-- 预测模型测试数据（智能化模型管理，语义规则为自然语言）
INSERT INTO prediction_model (model_id, name, description, status, rule_config, locked_count, accuracy, created_time, updated_time) VALUES
('m001_high_risk', '高风险人群识别模型', '基于年龄、状态、到访记录等多维度特征识别高风险人群', 'RUNNING', '满足年龄大于20岁，并且具有高消费标签的所有人群', 45, '92.5%', NOW(), NOW()),
('m002_close_contact', '密切接触者预测模型', '通过航班、铁路记录预测密切接触者', 'PAUSED', '满足近期有跨省行程且所属群体为重点关注的所有人员', 23, '88.3%', NOW(), NOW());
