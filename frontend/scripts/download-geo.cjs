/**
 * 下载常用省份的 GeoJSON 文件到 public/geo/ 目录
 * 运行: node scripts/download-geo.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const PROVINCES = {
  '110000': '北京市',
  '120000': '天津市',
  '130000': '河北省',
  '140000': '山西省',
  '150000': '内蒙古自治区',
  '210000': '辽宁省',
  '220000': '吉林省',
  '230000': '黑龙江省',
  '310000': '上海市',
  '320000': '江苏省',
  '330000': '浙江省',
  '340000': '安徽省',
  '350000': '福建省',
  '360000': '江西省',
  '370000': '山东省',
  '410000': '河南省',
  '420000': '湖北省',
  '430000': '湖南省',
  '440000': '广东省',
  '450000': '广西壮族自治区',
  '460000': '海南省',
  '500000': '重庆市',
  '510000': '四川省',
  '520000': '贵州省',
  '530000': '云南省',
  '540000': '西藏自治区',
  '610000': '陕西省',
  '620000': '甘肃省',
  '630000': '青海省',
  '640000': '宁夏回族自治区',
  '650000': '新疆维吾尔自治区',
};

const CDN_BASE = 'https://geo.datav.aliyun.com/areas_v3/bound';
const OUTPUT_DIR = path.join(__dirname, '../public/geo');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function downloadFile(adcode, name) {
  return new Promise((resolve, reject) => {
    const url = `${CDN_BASE}/${adcode}_full.json`;
    const outputPath = path.join(OUTPUT_DIR, `${adcode}.json`);

    // 如果文件已存在，跳过
    if (fs.existsSync(outputPath)) {
      console.log(`✓ ${name} (${adcode}) - 已存在，跳过`);
      resolve();
      return;
    }

    console.log(`⬇ 下载 ${name} (${adcode})...`);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败: ${url} - ${res.statusCode}`));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString();
        fs.writeFileSync(outputPath, data);
        console.log(`✓ ${name} (${adcode}) - 下载完成`);
        resolve();
      });
    }).on('error', reject);
  });
}

async function downloadAll() {
  console.log('开始下载省份 GeoJSON 文件...\n');
  const entries = Object.entries(PROVINCES);
  
  for (let i = 0; i < entries.length; i++) {
    const [adcode, name] = entries[i];
    try {
      await downloadFile(adcode, name);
      // 延迟 100ms 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`✗ ${name} (${adcode}) - 失败:`, error.message);
    }
  }
  
  console.log('\n下载完成！');
}

downloadAll().catch(console.error);
