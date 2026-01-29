-- ==========================================
-- 重点人员档案监测系统 - 初始数据脚本
-- 标签体系初始化
-- ==========================================

-- 插入默认管理员用户 (密码: admin123，实际使用时应该加密)
INSERT INTO user (username, password, real_name, email, role, status) VALUES
('admin', '$2a$10$XPTYr5Z5Z5Z5Z5Z5Z5Z5Z5O', '系统管理员', 'admin@example.com', 'ADMIN', 'ACTIVE');

-- 插入标签数据（三级标签体系）

-- ===== 一级标签：基本属性 (tag_id: 1000-1999) =====
INSERT INTO tag (tag_id, first_level_name, tag_name, tag_description, parent_tag_id) VALUES
(1000, '基本属性', '基本属性', '人员基本信息属性', NULL);

-- 年龄（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(1100, '基本属性', '年龄', '年龄', '根据出生日期计算年龄段', 'YEAR(NOW()) - YEAR(birth_date)', 1000),
(1101, '基本属性', '年龄', '50后', '1950-1959年出生', 'YEAR(birth_date) BETWEEN 1950 AND 1959', 1100),
(1102, '基本属性', '年龄', '60后', '1960-1969年出生', 'YEAR(birth_date) BETWEEN 1960 AND 1969', 1100),
(1103, '基本属性', '年龄', '70后', '1970-1979年出生', 'YEAR(birth_date) BETWEEN 1970 AND 1979', 1100),
(1104, '基本属性', '年龄', '80后', '1980-1989年出生', 'YEAR(birth_date) BETWEEN 1980 AND 1989', 1100),
(1105, '基本属性', '年龄', '90后', '1990-1999年出生', 'YEAR(birth_date) BETWEEN 1990 AND 1999', 1100),
(1106, '基本属性', '年龄', '00后', '2000年以后出生', 'YEAR(birth_date) >= 2000', 1100);

-- 性别（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(1200, '基本属性', '性别', '性别', '人员性别', 'gender', 1000),
(1201, '基本属性', '性别', '男', '男性', 'gender = "男"', 1200),
(1202, '基本属性', '性别', '女', '女性', 'gender = "女"', 1200);

-- 教育水平（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(1300, '基本属性', '教育水平', '教育水平', '人员最高学历', 'highest_education', 1000),
(1301, '基本属性', '教育水平', '高中及以下', '高中及以下学历', 'highest_education IN ("高中", "初中", "小学")', 1300),
(1302, '基本属性', '教育水平', '本科', '本科学历', 'highest_education = "本科"', 1300),
(1303, '基本属性', '教育水平', '硕士及以上', '硕士及以上学历', 'highest_education IN ("硕士", "博士")', 1300);

-- 原籍地（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(1400, '基本属性', '原籍地', '原籍地', '人员户籍地', 'household_address', 1000),
(1401, '基本属性', '原籍地', '河南省', '河南省籍', 'household_address LIKE "%河南%"', 1400),
(1402, '基本属性', '原籍地', '河北省', '河北省籍', 'household_address LIKE "%河北%"', 1400),
(1403, '基本属性', '原籍地', '山东省', '山东省籍', 'household_address LIKE "%山东%"', 1400),
(1404, '基本属性', '原籍地', '江苏省', '江苏省籍', 'household_address LIKE "%江苏%"', 1400),
(1405, '基本属性', '原籍地', '浙江省', '浙江省籍', 'household_address LIKE "%浙江%"', 1400);

-- 拥有境外社交媒体（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(1500, '基本属性', '拥有境外社交媒体', '拥有境外社交媒体', '是否有境外社交账号', 'twitter_accounts OR facebook_accounts OR linkedin_accounts', 1000),
(1501, '基本属性', '拥有境外社交媒体', 'X(Twitter)', '拥有Twitter账号', 'ARRAY_LENGTH(twitter_accounts) > 0', 1500),
(1502, '基本属性', '拥有境外社交媒体', 'Facebook', '拥有Facebook账号', 'ARRAY_LENGTH(facebook_accounts) > 0', 1500),
(1503, '基本属性', '拥有境外社交媒体', 'LinkedIn', '拥有LinkedIn账号', 'ARRAY_LENGTH(linkedin_accounts) > 0', 1500);

-- 入境签证类型（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(1600, '基本属性', '入境签证类型', '入境签证类型', '签证类别', 'visa_type', 1000),
(1601, '基本属性', '入境签证类型', '公务签证', '公务签证', 'visa_type = "公务签证"', 1600),
(1602, '基本属性', '入境签证类型', '外交签证', '外交签证', 'visa_type = "外交签证"', 1600),
(1603, '基本属性', '入境签证类型', '记者签证', '记者签证', 'visa_type = "记者签证"', 1600),
(1604, '基本属性', '入境签证类型', '旅游签证', '旅游签证', 'visa_type = "旅游签证"', 1600),
(1605, '基本属性', '入境签证类型', '其他签证', '其他类型签证', 'visa_type = "其他"', 1600);

-- ===== 一级标签：身份属性 (tag_id: 2000-2999) =====
INSERT INTO tag (tag_id, first_level_name, tag_name, tag_description, parent_tag_id) VALUES
(2000, '身份属性', '身份属性', '人员身份相关属性', NULL);

-- 外国人（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(2100, '身份属性', '外国人', '外国人', '外籍人员', 'nationality != "中国"', 2000),
(2101, '身份属性', '外国人', '2015年后长期出国', '2015年后长期在国外', 'COUNT(TRAVEL WHERE YEAR >= 2015) > 10', 2100),
(2102, '身份属性', '外国人', '2020年后出国', '2020年后有出国记录', 'EXISTS(TRAVEL WHERE YEAR >= 2020)', 2100),
(2103, '身份属性', '外国人', '出入第三国', '往返第三国', 'DISTINCT(destination_country) > 2', 2100);

-- 留学生（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(2200, '身份属性', '留学生', '留学生', '留学经历人员', 'education_experience LIKE "%国外%"', 2000),
(2201, '身份属性', '留学生', '留学生', '当前留学生', 'education_experience.end_time IS NULL', 2200),
(2202, '身份属性', '留学生', '毕业后来华', '留学毕业后来华工作', 'education_experience.end_time IS NOT NULL AND work_location = "中国"', 2200);

-- ===== 一级标签：组织机构 (tag_id: 3000-3999) =====
INSERT INTO tag (tag_id, first_level_name, tag_name, tag_description, parent_tag_id) VALUES
(3000, '组织机构', '组织机构', '人员所属机构', NULL);

INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(3100, '组织机构', '机构', '机构', '所属组织机构', 'work_experience.organization', 3000),
(3101, '组织机构', '机构', '1机构', '1号机构', 'work_experience.organization = "1机构"', 3100),
(3102, '组织机构', '机构', '2机构', '2号机构', 'work_experience.organization = "2机构"', 3100),
(3103, '组织机构', '机构', '3机构', '3号机构', 'work_experience.organization = "3机构"', 3100),
(3104, '组织机构', '机构', '4机构', '4号机构', 'work_experience.organization = "4机构"', 3100),
(3105, '组织机构', '机构', '5机构', '5号机构', 'work_experience.organization = "5机构"', 3100),
(3106, '组织机构', '机构', '6机构', '6号机构', 'work_experience.organization = "6机构"', 3100);

-- ===== 一级标签：异常行为 (tag_id: 4000-4999) =====
INSERT INTO tag (tag_id, first_level_name, tag_name, tag_description, parent_tag_id) VALUES
(4000, '异常行为', '异常行为', '异常行为特征', NULL);

-- 特殊人群（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(4100, '异常行为', '特殊人群', '特殊人群', '特殊人群分类', 'special_group_type', 4000),
(4101, '异常行为', '特殊人群', '1类', '1类特殊人群', 'special_group_type = "1类"', 4100),
(4102, '异常行为', '特殊人群', '2类', '2类特殊人群', 'special_group_type = "2类"', 4100),
(4103, '异常行为', '特殊人群', '3类', '3类特殊人群', 'special_group_type = "3类"', 4100),
(4104, '异常行为', '特殊人群', '4类', '4类特殊人群', 'special_group_type = "4类"', 4100),
(4105, '异常行为', '特殊人群', '5类', '5类特殊人群', 'special_group_type = "5类"', 4100);

-- 高消费群体（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(4200, '异常行为', '高消费群体', '高消费群体', '高消费行为', 'high_consumption', 4000),
(4201, '异常行为', '高消费群体', '曾住高档酒店', '入住过高档酒店', 'EXISTS(hotel WHERE level = "五星级")', 4200),
(4202, '异常行为', '高消费群体', '铁路一等/商务座', '乘坐一等座或商务座', 'EXISTS(train WHERE seat_type IN ("一等座", "商务座"))', 4200);

-- 小众APP（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(4300, '异常行为', '小众APP', '小众APP', '使用小众应用', 'app_usage', 4000),
(4301, '异常行为', '小众APP', '境外社交', '使用境外社交软件', 'app_type = "境外社交"', 4300),
(4302, '异常行为', '小众APP', '金融借贷', '使用金融借贷软件', 'app_type = "金融借贷"', 4300),
(4303, '异常行为', '小众APP', '涉黄赌毒', '使用涉黄赌毒软件', 'app_type = "涉黄赌毒"', 4300),
(4304, '异常行为', '小众APP', '音视频', '使用音视频软件', 'app_type = "音视频"', 4300);

-- 其他异常行为（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(4400, '异常行为', '其他', '其他异常', '其他异常行为', 'other_abnormal', 4000);

-- ===== 一级标签：关系属性 (tag_id: 5000-5999) =====
INSERT INTO tag (tag_id, first_level_name, tag_name, tag_description, parent_tag_id) VALUES
(5000, '关系属性', '关系属性', '人员关系网络', NULL);

INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(5100, '关系属性', '关系', '关系', '人际关系', 'relationships', 5000),
(5101, '关系属性', '关系', '同行人员', '有同行记录', 'EXISTS(companion_travel)', 5100),
(5102, '关系属性', '关系', '个人关系', '有个人关系', 'EXISTS(personal_relationship)', 5100),
(5103, '关系属性', '关系', '通讯录好友', '通讯录中的联系人', 'EXISTS(contact_relationship)', 5100);

-- ===== 一级标签：行为规律 (tag_id: 6000-6999) =====
INSERT INTO tag (tag_id, first_level_name, tag_name, tag_description, parent_tag_id) VALUES
(6000, '行为规律', '行为规律', '人员行为模式', NULL);

-- 历史出国频次（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(6100, '行为规律', '历史出国频次', '历史出国频次', '历史出国次数', 'COUNT(abroad_travel)', 6000),
(6101, '行为规律', '历史出国频次', '高(>=10)', '出国10次以上', 'COUNT(abroad_travel) >= 10', 6100),
(6102, '行为规律', '历史出国频次', '中(5-10)', '出国5-10次', 'COUNT(abroad_travel) BETWEEN 5 AND 10', 6100),
(6103, '行为规律', '历史出国频次', '低(<5)', '出国少于5次', 'COUNT(abroad_travel) < 5', 6100);

-- 常活动城市（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(6200, '行为规律', '常活动城市', '常活动城市', '经常活动的城市', 'frequent_cities', 6000),
(6201, '行为规律', '常活动城市', '北京', '在北京活动', 'destination LIKE "%北京%"', 6200),
(6202, '行为规律', '常活动城市', '沈阳', '在沈阳活动', 'destination LIKE "%沈阳%"', 6200),
(6203, '行为规律', '常活动城市', '丹东', '在丹东活动', 'destination LIKE "%丹东%"', 6200),
(6204, '行为规律', '常活动城市', '上海', '在上海活动', 'destination LIKE "%上海%"', 6200),
(6205, '行为规律', '常活动城市', '深圳', '在深圳活动', 'destination LIKE "%深圳%"', 6200);

-- 近三年出国频次（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(6300, '行为规律', '近三年出国频次', '近三年出国频次', '近三年出国次数', 'COUNT(abroad_travel WHERE YEAR >= YEAR(NOW())-3)', 6000),
(6301, '行为规律', '近三年出国频次', '2次及以下', '近三年出国≤2次', 'COUNT <= 2', 6300),
(6302, '行为规律', '近三年出国频次', '2-5次', '近三年出国2-5次', 'COUNT BETWEEN 2 AND 5', 6300),
(6303, '行为规律', '近三年出国频次', '5-10次', '近三年出国5-10次', 'COUNT BETWEEN 5 AND 10', 6300),
(6304, '行为规律', '近三年出国频次', '10次以上', '近三年出国>10次', 'COUNT > 10', 6300);

-- 出行行为（二级）
INSERT INTO tag (tag_id, first_level_name, second_level_name, tag_name, tag_description, calculation_rules, parent_tag_id) VALUES
(6400, '行为规律', '出行行为', '出行行为', '出行特征', 'travel_behavior', 6000),
(6401, '行为规律', '出行行为', '国内大范围出行', '到访城市>5', 'COUNT(DISTINCT destination_city) > 5', 6400),
(6402, '行为规律', '出行行为', '往返第三国', '多次往返第三国', 'third_country_travel_count > 3', 6400),
(6403, '行为规律', '出行行为', '出国未归', '出国后未返回', 'last_travel_type = "出境" AND no_return', 6400),
(6404, '行为规律', '出行行为', '多次快进快出', '短时间多次出入境', 'rapid_entry_exit_count > 5', 6400);

-- 初始化默认重点人员库
INSERT INTO key_person_library (library_name, description, owner_user_id) VALUES
('默认重点人员库', '系统默认的重点人员库', 1),
('高风险人员库', '标记为高风险的重点人员', 1);

-- 初始化公共目录和个人目录根节点
INSERT INTO directory (directory_id, parent_directory_id, directory_name, directory_type, creator_user_id, creator_username) VALUES
(1, NULL, '公共区', 'PUBLIC', 1, 'admin'),
(2, NULL, '个人区', 'PRIVATE', 1, 'admin');
