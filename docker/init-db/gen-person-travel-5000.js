/**
 * 生成 5000 条人员行程测试数据 SQL（Doris 格式）
 * 依赖：person 表已有 test_person_001～test_person_500（03-test-person-500.sql）
 * 运行：node gen-person-travel-5000.js
 */
const path = require('path');
const fs = require('fs');

const pad3 = (i) => String(i).padStart(3, '0');
const pick = (arr, i) => arr[i % arr.length];

// 城市/省份：出发地、目的地（机场/车站）
const locations = [
  { city: '北京', province: '北京市', airport: '北京首都国际机场', station: '北京南站' },
  { city: '上海', province: '上海市', airport: '上海浦东国际机场', station: '上海虹桥站' },
  { city: '广州', province: '广东省', airport: '广州白云国际机场', station: '广州南站' },
  { city: '深圳', province: '广东省', airport: '深圳宝安国际机场', station: '深圳北站' },
  { city: '成都', province: '四川省', airport: '成都双流国际机场', station: '成都东站' },
  { city: '杭州', province: '浙江省', airport: '杭州萧山国际机场', station: '杭州东站' },
  { city: '武汉', province: '湖北省', airport: '武汉天河国际机场', station: '武汉站' },
  { city: '西安', province: '陕西省', airport: '西安咸阳国际机场', station: '西安北站' },
  { city: '南京', province: '江苏省', airport: '南京禄口国际机场', station: '南京南站' },
  { city: '重庆', province: '重庆市', airport: '重庆江北国际机场', station: '重庆北站' },
  { city: '青岛', province: '山东省', airport: '青岛胶东国际机场', station: '青岛北站' },
  { city: '长沙', province: '湖南省', airport: '长沙黄花国际机场', station: '长沙南站' },
  { city: '郑州', province: '河南省', airport: '郑州新郑国际机场', station: '郑州东站' },
  { city: '沈阳', province: '辽宁省', airport: '沈阳桃仙国际机场', station: '沈阳北站' },
  { city: '厦门', province: '福建省', airport: '厦门高崎国际机场', station: '厦门北站' },
  { city: '昆明', province: '云南省', airport: '昆明长水国际机场', station: '昆明南站' },
  { city: '大连', province: '辽宁省', airport: '大连周水子国际机场', station: '大连北站' },
  { city: '哈尔滨', province: '黑龙江省', airport: '哈尔滨太平国际机场', station: '哈尔滨西站' },
  { city: '济南', province: '山东省', airport: '济南遥墙国际机场', station: '济南西站' },
  { city: '苏州', province: '江苏省', airport: null, station: '苏州北站' },
];

const travelTypes = ['TRAIN', 'FLIGHT', 'CAR'];
const visaTypes = ['公务签证', '旅游签证', '其他', null, null]; // 更多 NULL 表示国内

function randomDate(startYear, endYear, i) {
  const y = startYear + (i % (endYear - startYear + 1));
  const m = String((Math.floor(i / 31) % 12) + 1).padStart(2, '0');
  const d = String((i % 28) + 1).padStart(2, '0');
  const h = String((i % 24)).padStart(2, '0');
  const min = String((i * 7 % 60)).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:00`;
}

function row(travelId, i) {
  const personIdx = (i % 500) + 1;
  const personId = `test_person_${pad3(personIdx)}`;
  const personName = `人员${pad3(personIdx)}`;
  const depIdx = i % locations.length;
  let destIdx = (i + 7) % locations.length;
  if (destIdx === depIdx) destIdx = (destIdx + 1) % locations.length;
  const dep = locations[depIdx];
  const dest = locations[destIdx];
  const travelType = pick(travelTypes, i);
  const isFlight = travelType === 'FLIGHT';
  const isTrain = travelType === 'TRAIN';
  const depPlace = isFlight ? (dep.airport || dep.station) : (isTrain ? dep.station : `${dep.city}市区`);
  const destPlace = isFlight ? (dest.airport || dest.station) : (isTrain ? dest.station : `${dest.city}某地`);
  const ticket = isFlight ? `CA${1000 + (i % 9000)}` : (isTrain ? `G${7000 + (i % 999)}` : null);
  const visa = pick(visaTypes, i);
  const eventTime = randomDate(2024, 2025, i);
  const ticketStr = ticket ? `'${ticket}'` : 'NULL';
  const visaStr = visa ? `'${visa}'` : 'NULL';
  return `(${travelId}, '${personId}', '${eventTime}', '${personName}', '${depPlace}', '${destPlace}', '${travelType}', ${ticketStr}, ${visaStr}, '${dest.province}', '${dep.province}', NOW(), NOW())`;
}

const TOTAL = 5000;
const BATCH_SIZE = 100;
const NUM_BATCHES = Math.ceil(TOTAL / BATCH_SIZE);
const startTravelId = 11; // 02-test-data.sql 已用 1-10

const outLines = [
  '-- 5000 条人员行程测试数据（由 gen-person-travel-5000.js 生成）',
  '-- 依赖 person 表已有 test_person_001～test_person_500',
  'USE person_monitor;',
  'SET NAMES \'utf8\';',
  '',
];

for (let b = 0; b < NUM_BATCHES; b++) {
  const startId = startTravelId + b * BATCH_SIZE;
  const count = Math.min(BATCH_SIZE, TOTAL - b * BATCH_SIZE);
  const rows = [];
  for (let j = 0; j < count; j++) {
    rows.push(row(startId + j, b * BATCH_SIZE + j));
  }
  outLines.push('INSERT INTO person_travel (');
  outLines.push('    travel_id, person_id, event_time, person_name, departure, destination,');
  outLines.push('    travel_type, ticket_number, visa_type, destination_province, departure_province,');
  outLines.push('    created_time, updated_time');
  outLines.push(') VALUES');
  outLines.push(rows.join(',\n') + ';');
  if (b < NUM_BATCHES - 1) outLines.push('');
}

const outPath = path.join(__dirname, '04-test-person-travel-5000.sql');
fs.writeFileSync(outPath, outLines.join('\n'), 'utf8');
console.log(`Generated ${outPath} with ${TOTAL} person_travel rows.`);
