import { useCallback, useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Tabs } from 'antd';
import {
  TeamOutlined,
  AlertOutlined,
  EnvironmentOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchStatistics } from '@/store/slices/dashboardSlice';
import './index.css';

/** 机构/地区/类型 排行项 */
interface RankItem {
  rank: number;
  name: string;
  value: number;
}

/** 机构分布 TOP15 模拟数据 */
const MOCK_ORGANIZATIONS: RankItem[] = [
  { rank: 1, name: '俄罗斯联邦消费者权益保护局', value: 562 },
  { rank: 2, name: '英国国家医疗服务体系', value: 549 },
  { rank: 3, name: '法国公共卫生局', value: 512 },
  { rank: 4, name: '德国罗伯特科赫研究所', value: 498 },
  { rank: 5, name: '日本厚生劳动省', value: 476 },
  { rank: 6, name: '韩国疾病管理厅', value: 445 },
  { rank: 7, name: '美国CDC', value: 432 },
  { rank: 8, name: '澳大利亚卫生部', value: 398 },
  { rank: 9, name: '加拿大公共卫生局', value: 365 },
  { rank: 10, name: '意大利卫生部', value: 342 },
  { rank: 11, name: '西班牙卫生部', value: 318 },
  { rank: 12, name: '印度医学研究理事会', value: 295 },
  { rank: 13, name: '巴西卫生部', value: 278 },
  { rank: 14, name: '南非国家传染病研究所', value: 256 },
  { rank: 15, name: '中国疾控中心', value: 240 },
];

/** 签证类型排名 模拟数据 */
const MOCK_VISA_TYPES: RankItem[] = [
  { rank: 1, name: '实习签证', value: 525 },
  { rank: 2, name: '访问签证', value: 505 },
  { rank: 3, name: '工作签证', value: 478 },
  { rank: 4, name: '留学签证', value: 432 },
  { rank: 5, name: '商务签证', value: 398 },
];

/** 各地排名 模拟数据 */
const MOCK_LOCATIONS: RankItem[] = [
  { rank: 1, name: '上海', value: 582 },
  { rank: 2, name: '北京', value: 563 },
  { rank: 3, name: '香港', value: 498 },
  { rank: 4, name: '广州', value: 445 },
  { rank: 5, name: '深圳', value: 412 },
  { rank: 6, name: '成都', value: 378 },
  { rank: 7, name: '杭州', value: 352 },
  { rank: 8, name: '武汉', value: 328 },
];

/** 群体类别 模拟数据 */
const MOCK_POPULATION_CATEGORIES: RankItem[] = [
  { rank: 1, name: '康复', value: 2037 },
  { rank: 2, name: '确诊', value: 2009 },
  { rank: 3, name: '疑似', value: 156 },
  { rank: 4, name: '正常', value: 3798 },
];

/** 疫情趋势 模拟数据（折线图） */
const MOCK_TREND_DATES = ['1/18', '1/19', '1/20', '1/21', '1/22', '1/23', '1/24', '1/25', '1/26'];
const MOCK_TREND_SUSPECTED = [12, 15, 18, 22, 25, 28, 30, 28, 26];
const MOCK_TREND_RECOVERED = [2, 3, 3, 4, 4, 5, 5, 6, 7];

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const { statistics, loading } = useAppSelector((state) => state.dashboard);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [locationTab, setLocationTab] = useState<string>('全部');

  useEffect(() => {
    dispatch(fetchStatistics());
  }, [dispatch]);

  const totalPerson = statistics?.totalPersonCount ?? 8000;
  const keyPerson = statistics?.keyPersonCount ?? 2009;
  const activeRegions = 147;
  const todayMovement = statistics?.todaySocialDynamicCount ?? 0;

  const trendOption = useCallback(() => {
    const isBar = chartType === 'bar';
    return {
      backgroundColor: 'transparent',
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['疑似', '康复'],
        bottom: 0,
        textStyle: { color: '#b0b0b0', fontSize: 12 },
        itemWidth: 14,
        itemHeight: 14,
      },
      xAxis: {
        type: 'category',
        data: MOCK_TREND_DATES,
        axisLine: { lineStyle: { color: '#2a3f5f' } },
        axisLabel: { color: '#8b9dc3' },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#1e3354', type: 'dashed' } },
        axisLabel: { color: '#8b9dc3' },
      },
      series: [
        {
          name: '疑似',
          type: isBar ? 'bar' : 'line',
          data: MOCK_TREND_SUSPECTED,
          smooth: true,
          itemStyle: { color: '#fa8c16' },
          lineStyle: { color: '#fa8c16', width: 2 },
          areaStyle: isBar ? undefined : { color: 'rgba(250, 140, 22, 0.15)' },
        },
        {
          name: '康复',
          type: isBar ? 'bar' : 'line',
          data: MOCK_TREND_RECOVERED,
          smooth: true,
          itemStyle: { color: '#52c41a' },
          lineStyle: { color: '#52c41a', width: 2 },
          areaStyle: isBar ? undefined : { color: 'rgba(82, 196, 26, 0.15)' },
        },
      ],
    };
  }, [chartType]);

  /** 全国监测分布图：无 china.json 时用散点网格模拟各省分布 */
  const mapOption = useCallback(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    grid: { left: 24, right: 24, top: 24, bottom: 24 },
    xAxis: {
      type: 'value',
      min: 80,
      max: 130,
      show: false,
    },
    yAxis: {
      type: 'value',
      min: 15,
      max: 55,
      show: false,
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (val: number[]) => Math.max(val[2] / 4, 12),
        data: [
          [116.4, 39.9, 120],
          [121.47, 31.23, 98],
          [113.26, 23.13, 85],
          [114.06, 22.55, 76],
          [104.06, 30.67, 65],
          [118.8, 32.06, 54],
          [108.93, 34.27, 48],
          [117.2, 31.82, 42],
          [106.58, 29.56, 38],
        ].map(([lng, lat, v]) => ({ value: [lng, lat, v], name: `区域${v}` })),
        itemStyle: {
          color: '#1890ff',
          borderColor: 'rgba(255,255,255,0.3)',
          borderWidth: 1,
        },
        emphasis: { scale: 1.2 },
      },
    ],
  }), []);

  if (loading && !statistics) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* 顶部 4 个指标卡 */}
      <Row gutter={[16, 16]} className="dashboard-cards">
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card dashboard-card-purple">
            <div className="dashboard-card-icon">
              <TeamOutlined />
            </div>
            <Statistic
              title="监测人员总数"
              value={totalPerson}
              valueStyle={{ color: '#fff', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card dashboard-card-green">
            <div className="dashboard-card-icon">
              <AlertOutlined />
            </div>
            <Statistic
              title="确诊病例"
              value={keyPerson}
              valueStyle={{ color: '#fff', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card dashboard-card-pink">
            <div className="dashboard-card-icon">
              <EnvironmentOutlined />
            </div>
            <Statistic
              title="活跃区域"
              value={activeRegions}
              valueStyle={{ color: '#fff', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card dashboard-card-blue">
            <div className="dashboard-card-icon">
              <BarChartOutlined />
            </div>
            <Statistic
              title="今日流动记录"
              value={todayMovement}
              valueStyle={{ color: '#fff', fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 三栏：左 中 右 */}
      <Row gutter={16} className="dashboard-main">
        {/* 左侧：机构分布 TOP15、签证类型排名 */}
        <Col xs={24} lg={6}>
          <Card className="dashboard-panel" title="机构分布TOP15" size="small">
            <div className="rank-list rank-list-scroll">
              {MOCK_ORGANIZATIONS.map((item) => (
                <div key={item.rank} className="rank-item">
                  <span className="rank-num">{item.rank}</span>
                  <span className="rank-name" title={item.name}>{item.name}</span>
                  <span className="rank-value">{item.value}</span>
                  <div className="rank-bar-wrap">
                    <div
                      className="rank-bar"
                      style={{ width: `${(item.value / 562) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="dashboard-panel" title="签证类型排名" size="small">
            <div className="rank-list">
              {MOCK_VISA_TYPES.map((item) => (
                <div key={item.rank} className="rank-item rank-item-simple">
                  <span className="rank-num">{item.rank}</span>
                  <span className="rank-name">{item.name}</span>
                  <span className="rank-value">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* 中间：全国监测分布图 + 疫情趋势分析 */}
        <Col xs={24} lg={12}>
          <Card className="dashboard-panel dashboard-panel-map" title="全国监测分布图" size="small">
            <div className="map-container">
              <div className="map-outline" />
              <ReactECharts
                option={mapOption()}
                style={{ height: 320, width: '100%', position: 'absolute', left: 0, top: 0 }}
                opts={{ renderer: 'canvas' }}
                notMerge
              />
            </div>
          </Card>
          <Card className="dashboard-panel" title="疫情趋势分析" size="small">
            <Tabs
              activeKey={chartType}
              onChange={(k) => setChartType(k as 'line' | 'bar')}
              size="small"
              className="dashboard-trend-tabs"
              items={[
                { key: 'line', label: '折线图' },
                { key: 'bar', label: '柱状图' },
              ]}
            />
            <ReactECharts
              option={trendOption()}
              style={{ height: 240, width: '100%' }}
              opts={{ renderer: 'canvas' }}
              notMerge
            />
          </Card>
        </Col>

        {/* 右侧：各地排名、群体类别 */}
        <Col xs={24} lg={6}>
          <Card className="dashboard-panel" title="各地排名" size="small">
            <Tabs
              activeKey={locationTab}
              onChange={setLocationTab}
              size="small"
              className="dashboard-trend-tabs"
              items={[
                { key: '全部', label: '全部' },
                { key: '昨日新增', label: '昨日新增' },
                { key: '驻留', label: '驻留' },
              ]}
            />
            <div className="rank-list">
              {MOCK_LOCATIONS.map((item) => (
                <div key={item.rank} className="rank-item rank-item-simple">
                  <span className="rank-num">{item.rank}</span>
                  <span className="rank-name">{item.name}</span>
                  <span className="rank-value">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="dashboard-panel" title="群体类别" size="small">
            <div className="rank-list">
              {MOCK_POPULATION_CATEGORIES.map((item) => (
                <div key={item.rank} className="rank-item rank-item-simple">
                  <span className="rank-num">{item.rank}</span>
                  <span className="rank-name">{item.name}</span>
                  <span className="rank-value">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 右侧悬浮按钮（可选） */}
      <div className="dashboard-float-btns">
        <div className="float-btn" title="应用菜单">▦</div>
        <div className="float-btn" title="刷新">K</div>
      </div>
    </div>
  );
};

export default Dashboard;
