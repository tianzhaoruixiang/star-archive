/**
 * 省份名称 -> 行政区划 adcode（六位），用于加载省份 GeoJSON 地图
 * 优先从 /geo/{adcode}.json 离线加载，失败则从 DataV CDN 加载
 */
export const PROVINCE_ADCODE: Record<string, string> = {
  北京市: '110000',
  北京: '110000',
  天津市: '120000',
  天津: '120000',
  河北省: '130000',
  河北: '130000',
  山西省: '140000',
  山西: '140000',
  内蒙古自治区: '150000',
  内蒙古: '150000',
  辽宁省: '210000',
  辽宁: '210000',
  吉林省: '220000',
  吉林: '220000',
  黑龙江省: '230000',
  黑龙江: '230000',
  上海市: '310000',
  上海: '310000',
  江苏省: '320000',
  江苏: '320000',
  浙江省: '330000',
  浙江: '330000',
  安徽省: '340000',
  安徽: '340000',
  福建省: '350000',
  福建: '350000',
  江西省: '360000',
  江西: '360000',
  山东省: '370000',
  山东: '370000',
  河南省: '410000',
  河南: '410000',
  湖北省: '420000',
  湖北: '420000',
  湖南省: '430000',
  湖南: '430000',
  广东省: '440000',
  广东: '440000',
  广西壮族自治区: '450000',
  广西: '450000',
  海南省: '460000',
  海南: '460000',
  重庆市: '500000',
  重庆: '500000',
  四川省: '510000',
  四川: '510000',
  贵州省: '520000',
  贵州: '520000',
  云南省: '530000',
  云南: '530000',
  西藏自治区: '540000',
  西藏: '540000',
  陕西省: '610000',
  陕西: '610000',
  甘肃省: '620000',
  甘肃: '620000',
  青海省: '630000',
  青海: '630000',
  宁夏回族自治区: '640000',
  宁夏: '640000',
  新疆维吾尔自治区: '650000',
  新疆: '650000',
  台湾省: '710000',
  台湾: '710000',
  香港特别行政区: '810000',
  香港: '810000',
  澳门特别行政区: '820000',
  澳门: '820000',
};

const DATAV_CDN = 'https://geo.datav.aliyun.com/areas_v3/bound';

/**
 * 获取省份 adcode，未找到返回空字符串
 */
export function getProvinceAdcode(provinceName: string): string {
  const trimmed = provinceName?.trim() ?? '';
  return PROVINCE_ADCODE[trimmed] ?? '';
}

/**
 * 优先从本地 /geo/{adcode}.json 加载（离线），失败则从 DataV CDN 加载
 */
export function fetchProvinceGeoJson(adcode: string): Promise<unknown> {
  const offlineUrl = `/geo/${adcode}.json`;
  const cdnUrl = `${DATAV_CDN}/${adcode}_full.json`;
  return fetch(offlineUrl)
    .then((res) => {
      if (res.ok) return res.json();
      throw new Error('offline not found');
    })
    .catch(() => fetch(cdnUrl).then((res) => res.json()));
}
