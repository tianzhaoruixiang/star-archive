/**
 * 生成 500 条人物测试数据 SQL（Doris 格式）
 * 运行：node gen-person-500.js > 03-test-person-500.sql
 */
const fs = require('fs');

const surnames = ['张','李','王','刘','陈','杨','黄','赵','周','吴','徐','孙','马','朱','胡','郭','何','林','高','罗'];
const givenMales = ['伟','强','磊','洋','勇','军','杰','涛','明','超','秀英','华','建国','建华'];
const givenFemales = ['芳','敏','静','丽','娟','艳','娜','秀英','玲','霞'];
const orgs = ['某科技公司','某研究院','某集团','某大学','某政府机关','某金融机构','某医疗机构','某教育机构'];
const groups = ['正常','康复','确诊','疑似'];
const educations = ['高中及以下','本科','硕士及以上'];
const tagsPool = ['80后','90后','70后','重点关注','普通人员','留学生'];
const visaTypes = ['公务签证', '旅游签证', '外交签证', '记者签证', '其他', null, null]; // 部分无签证

function pad3(i) { return String(i).padStart(3, '0'); }
function pick(arr, i) { return arr[i % arr.length]; }
function row(i) {
  const isKey = i % 5 === 0;
  const gender = i % 2 === 0 ? '男' : '女';
  const year = 1970 + (i % 26);
  const month = String((i % 12) + 1).padStart(2, '0');
  const day = String((i % 28) + 1).padStart(2, '0');
  const birth = `${year}-${month}-${day}`;
  const surname = pick(surnames, i);
  const given = gender === '男' ? pick(givenMales, i) : pick(givenFemales, i);
  const chineseName = surname + given + (i > 20 ? i % 100 : '');
  const personType = isKey ? '重点人员' : '普通人员';
  const tags = isKey ? `ARRAY('${pick(tagsPool, i)}', '重点关注')` : `ARRAY('${pick(tagsPool, i)}')`;
  const visaType = pick(visaTypes, i);
  const visaTypeStr = visaType ? `'${visaType}'` : 'NULL';
  const visaNumber = visaType ? `'V${pad3(i)}${String(i).padStart(4, '0')}'` : 'NULL';
  return `('test_person_${pad3(i)}', '${personType}', ${isKey}, '${chineseName}', 'Test User ${pad3(i)}', NULL, '${pick(orgs, i)}', '${pick(groups, i)}', NULL, '${gender}', NULL, '${birth}', '中国', 'CHN', '北京市测试区${(i % 30) + 1}号', '${pick(educations, i)}', ARRAY('138${pad3(i)}${pad3(i % 1000)}'), ARRAY('user${pad3(i)}@example.com'), NULL, NULL, ${visaTypeStr}, ${visaNumber}, NULL, NULL, NULL, ${tags}, '[]', '[]', NULL, NOW(), NOW())`;
}

const lines = [
  '-- 500 条人物测试数据（由 gen-person-500.js 生成）',
  'USE person_monitor;',
  'SET NAMES \'utf8\';',
  '',
  'INSERT INTO person (',
  '    person_id, person_type, is_key_person, chinese_name, original_name, alias_names, organization, belonging_group, avatar_files,',
  '    gender, id_numbers, birth_date, nationality, nationality_code, household_address, highest_education,',
  '    phone_numbers, emails, passport_numbers, id_card_number, visa_type, visa_number,',
  '    twitter_accounts, linkedin_accounts, facebook_accounts,',
  '    person_tags, work_experience, education_experience, remark, created_time, updated_time',
  ') VALUES',
];

for (let batch = 0; batch < 10; batch++) {
  const start = batch * 50 + 1;
  const end = Math.min((batch + 1) * 50, 500);
  const rows = [];
  for (let i = start; i <= end; i++) rows.push(row(i));
  lines.push(rows.join(',\n') + (batch < 9 ? ';' : ';'));
  if (batch < 9) {
    lines.push('');
    lines.push('INSERT INTO person (');
    lines.push('    person_id, person_type, is_key_person, chinese_name, original_name, alias_names, organization, belonging_group, avatar_files,');
    lines.push('    gender, id_numbers, birth_date, nationality, nationality_code, household_address, highest_education,');
    lines.push('    phone_numbers, emails, passport_numbers, id_card_number, visa_type, visa_number,');
    lines.push('    twitter_accounts, linkedin_accounts, facebook_accounts,');
    lines.push('    person_tags, work_experience, education_experience, remark, created_time, updated_time');
    lines.push(') VALUES');
  }
}

fs.writeFileSync(require('path').join(__dirname, '03-test-person-500.sql'), lines.join('\n'), 'utf8');
console.log('Generated 03-test-person-500.sql with 500 person rows.');
