import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Row, Col, Statistic, Spin, Tabs } from 'antd';
import {
  TeamOutlined,
  AlertOutlined,
  EnvironmentOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchStatistics } from '@/store/slices/dashboardSlice';
import { dashboardAPI, type OrganizationRankItem, type VisaTypeRankItem, type ProvinceRanksDTO, type TravelTrendDTO } from '@/services/api';
import './index.css';

const CHINA_GEO_JSON_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';

/** 机构/地区/类型 排行项 */
interface RankItem {
  rank: number;
  name: string;
  value: number;
}

const TREND_COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1'];

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { statistics, loading } = useAppSelector((state) => state.dashboard);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [locationTab, setLocationTab] = useState<string>('全部');
  const [organizationTop15, setOrganizationTop15] = useState<OrganizationRankItem[]>([]);
  const [visaTypeTop15, setVisaTypeTop15] = useState<VisaTypeRankItem[]>([]);
  const [provinceRanks, setProvinceRanks] = useState<ProvinceRanksDTO | null>(null);
  const [travelTrend, setTravelTrend] = useState<TravelTrendDTO | null>(null);
  const [groupCategoryStats, setGroupCategoryStats] = useState<OrganizationRankItem[]>([]);
  const [chinaGeoLoaded, setChinaGeoLoaded] = useState(false);

  useEffect(() => {
    dispatch(fetchStatistics());
  }, [dispatch]);

  useEffect(() => {
    dashboardAPI.getOrganizationTop15().then((res: { data?: OrganizationRankItem[] }) => {
      const list = res?.data ?? res;
      setOrganizationTop15(Array.isArray(list) ? list : []);
    }).catch(() => setOrganizationTop15([]));
  }, []);

  useEffect(() => {
    dashboardAPI.getVisaTypeTop15().then((res: { data?: VisaTypeRankItem[] }) => {
      const list = res?.data ?? res;
      setVisaTypeTop15(Array.isArray(list) ? list : []);
    }).catch(() => setVisaTypeTop15([]));
  }, []);

  useEffect(() => {
    dashboardAPI.getProvinceRanks().then((res: { data?: ProvinceRanksDTO }) => {
      const payload = res?.data ?? res;
      setProvinceRanks(payload && typeof payload === 'object' ? payload : null);
    }).catch(() => setProvinceRanks(null));
  }, []);

  useEffect(() => {
    dashboardAPI.getTravelTrend(14).then((res: { data?: TravelTrendDTO }) => {
      const payload = res?.data ?? res;
      setTravelTrend(payload && typeof payload === 'object' ? payload : null);
    }).catch(() => setTravelTrend(null));
  }, []);

  useEffect(() => {
    dashboardAPI.getGroupCategoryStats().then((res: { data?: OrganizationRankItem[] }) => {
      const list = res?.data ?? res;
      setGroupCategoryStats(Array.isArray(list) ? list : []);
    }).catch(() => setGroupCategoryStats([]));
  }, []);

  useEffect(() => {
    fetch(CHINA_GEO_JSON_URL)
      .then((res) => res.json())
      .then((geoJson: unknown) => {
        if (geoJson && typeof geoJson === 'object') {
          echarts.registerMap('china', geoJson as Parameters<typeof echarts.registerMap>[1]);
          setChinaGeoLoaded(true);
        }
      })
      .catch(() => setChinaGeoLoaded(false));
  }, []);

  const totalPerson = statistics?.totalPersonCount ?? 8000;
  const keyPerson = statistics?.keyPersonCount ?? 2009;
  const activeRegions = 147;
  const todayMovement = statistics?.todaySocialDynamicCount ?? 0;

  const trendOption = useCallback(() => {
    const isBar = chartType === 'bar';
    const dates = travelTrend?.dates ?? [];
    const series = travelTrend?.series ?? [];
    const xData = dates.map((d) => {
      const parts = d.split('-');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
    });
    return {
      backgroundColor: 'transparent',
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      tooltip: { trigger: 'axis' },
      legend: {
        data: series.map((s) => s.name),
        bottom: 0,
        textStyle: { color: '#b0b0b0', fontSize: 12 },
        itemWidth: 14,
        itemHeight: 14,
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: '#2a3f5f' } },
        axisLabel: { color: '#8b9dc3' },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#1e3354', type: 'dashed' } },
        axisLabel: { color: '#8b9dc3' },
      },
      series: series.map((s, i) => ({
        name: s.name,
        type: isBar ? 'bar' : 'line',
        data: s.data ?? [],
        smooth: true,
        itemStyle: { color: TREND_COLORS[i % TREND_COLORS.length] },
        lineStyle: { color: TREND_COLORS[i % TREND_COLORS.length], width: 2 },
        areaStyle: isBar ? undefined : { color: `rgba(24, 144, 255, 0.1)` },
      })),
    };
  }, [chartType, travelTrend]);

  /** 全国监测分布图：已注册中国 GeoJSON 时用地图+按省人数着色，否则散点占位 */
  const mapOption = useCallback(() => {
    const provinceList = provinceRanks?.all ?? [];
    const countMap = new Map(provinceList.map((p) => [p.name, p.value]));
    const values = provinceList.map((p) => p.value);
    const minVal = values.length ? Math.min(...values) : 0;
    let maxVal = values.length ? Math.max(...values) : 1;
    if (maxVal <= minVal) maxVal = minVal + 1;

    if (chinaGeoLoaded) {
      /* 16 级冷暖渐变：浅蓝（少）→ 深红（多），专业数据可视化 */
      const visualMapColors = [
        '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981',
        '#34d399', '#84cc16', '#eab308', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
      ];
      return {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: (params: { name: string }) => {
            const v = countMap.get(params.name) ?? 0;
            return `${params.name}: ${v}`;
          },
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          borderColor: 'rgba(102, 126, 234, 0.6)',
          borderWidth: 1,
          textStyle: { color: '#e2e8f0', fontSize: 12 },
          padding: [8, 12],
        },
        visualMap: {
          min: minVal,
          max: maxVal,
          text: ['高', '低'],
          realtime: false,
          calculable: true,
          inRange: { color: visualMapColors },
          right: 12,
          bottom: 0,
          textStyle: { color: '#8b9dc3' },
        },
        series: [
          {
            name: '人员数量',
            type: 'map',
            map: 'china',
            roam: true,
            layoutCenter: ['50%', '70%'],
            layoutSize: '130%',
            itemStyle: {
              borderColor: '#d1d5db',
              borderWidth: 1.5,
            },
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 600,
              color: '#1e293b',
              fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
              textBorderColor: 'rgba(255, 255, 255, 0.8)',
              textBorderWidth: 1,
              textShadowColor: 'rgba(0, 0, 0, 0.15)',
              textShadowBlur: 2,
            },
            emphasis: {
              label: {
                show: true,
                fontWeight: 700,
                color: '#0f172a',
                textBorderColor: 'rgba(255, 255, 255, 0.95)',
                textBorderWidth: 1.5,
              },
              itemStyle: {
                areaColor: '#818cf8',
                borderColor: 'rgba(102, 126, 234, 0.9)',
                borderWidth: 2.5,
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.3)',
              },
            },
            data: provinceList.map((p) => ({ name: p.name, value: p.value })),
          },
        ],
      };
    }

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      grid: { left: 24, right: 24, top: 24, bottom: 24 },
      xAxis: { type: 'value', min: 80, max: 130, show: false },
      yAxis: { type: 'value', min: 15, max: 55, show: false },
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
          itemStyle: { color: '#1890ff', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1 },
          emphasis: { scale: 1.2 },
        },
      ],
    };
  }, [chinaGeoLoaded, provinceRanks?.all]);

  if (loading && !statistics) {
    return (
      <div className="dashboard-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="page-wrapper dashboard">
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
              title="重点人员"
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

      {/* 三栏：左 中 右（左右卡片略窄，中间地图更宽） */}
      <Row gutter={16} className="dashboard-main">
        {/* 左侧：机构分布 TOP15、签证类型排名 */}
        <Col xs={24} lg={5}>
          <Card className="dashboard-panel dashboard-panel-rank-card" title="机构分布TOP15" size="small">
            <div className="rank-list rank-list-scroll">
              {organizationTop15.length === 0 ? (
                <div style={{ color: 'var(--text-placeholder)', padding: 16, textAlign: 'center' }}>暂无机构数据</div>
              ) : (
                organizationTop15.map((item, index) => {
                  const maxVal = Math.max(...organizationTop15.map((o) => o.value), 1);
                  return (
                    <div key={`${item.name}-${index}`} className="rank-item">
                      <span className="rank-num">{index + 1}</span>
                      <span className="rank-name" title={item.name}>{item.name}</span>
                      <span className="rank-value">{item.value}</span>
                      <div className="rank-bar-wrap">
                        <div
                          className="rank-bar"
                          style={{ width: `${(Number(item.value) / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
          <Card className="dashboard-panel dashboard-panel-rank-card" title="签证类型排名" size="small">
            <div className="rank-list rank-list-scroll">
              {visaTypeTop15.length === 0 ? (
                <div style={{ color: 'var(--text-placeholder)', padding: 16, textAlign: 'center' }}>暂无签证类型数据</div>
              ) : (
                visaTypeTop15.map((item, index) => {
                  const maxVal = Math.max(...visaTypeTop15.map((o) => o.value), 1);
                  return (
                    <div key={`${item.name}-${index}`} className="rank-item">
                      <span className="rank-num">{index + 1}</span>
                      <span className="rank-name" title={item.name}>{item.name}</span>
                      <span className="rank-value">{item.value}</span>
                      <div className="rank-bar-wrap">
                        <div
                          className="rank-bar"
                          style={{ width: `${(Number(item.value) / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </Col>

        {/* 中间：全国监测分布图 + 人物行程趋势分析 */}
        <Col xs={24} lg={14}>
          <Card className="dashboard-panel dashboard-panel-map" title="全国监测分布图" size="small">
            <div className="map-section map-container">
              <div className="map-outline" />
              <ReactECharts
                key={`china-map-${location.key}-${chinaGeoLoaded}`}
                option={mapOption()}
                style={{ height: 520, width: '100%', position: 'absolute', left: 0, top: 0 }}
                opts={{ renderer: 'canvas' }}
                notMerge
                onEvents={{
                  click: (params: { componentSubType?: string; name?: string }) => {
                    if (chinaGeoLoaded && params.componentSubType === 'map' && params.name) {
                      navigate(`/dashboard/province/${encodeURIComponent(params.name)}`);
                    }
                  },
                }}
              />
            </div>
          </Card>
          {/* <Card className="dashboard-panel" title="人物行程趋势分析" size="small">
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
          </Card> */}
        </Col>

        {/* 右侧：各地排名、群体类别 */}
        <Col xs={24} lg={5}>
          <Card className="dashboard-panel dashboard-panel-rank-card" title="各地排名" size="small">
            <Tabs
              activeKey={locationTab}
              onChange={setLocationTab}
              size="small"
              className="dashboard-trend-tabs"
              items={[
                { key: '全部', label: '全部' },
                { key: '昨日新增', label: '昨日新增' },
                { key: '昨日流出', label: '昨日流出' },
                { key: '驻留', label: '驻留' },
              ]}
            />
            <div className="rank-list rank-list-scroll">
              {(() => {
                const list = !provinceRanks
                  ? []
                  : locationTab === '全部'
                    ? provinceRanks.all
                    : locationTab === '昨日新增'
                      ? provinceRanks.yesterdayArrival
                      : locationTab === '昨日流出'
                        ? provinceRanks.yesterdayDeparture
                        : provinceRanks.stay;
                if (list.length === 0) {
                  return (
                    <div style={{ color: 'var(--text-placeholder)', padding: 16, textAlign: 'center' }}>
                      暂无数据
                    </div>
                  );
                }
                const maxVal = Math.max(...list.map((o) => o.value), 1);
                return list.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="rank-item">
                    <span className="rank-num">{index + 1}</span>
                    <span className="rank-name" title={item.name}>{item.name}</span>
                    <span className="rank-value">{item.value}</span>
                    <div className="rank-bar-wrap">
                      <div
                        className="rank-bar"
                        style={{ width: `${(Number(item.value) / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Card>
          <Card className="dashboard-panel dashboard-panel-rank-card" title="群体类别" size="small">
            <div className="rank-list rank-list-scroll">
              {groupCategoryStats.length === 0 ? (
                <div style={{ color: 'var(--text-placeholder)', padding: 16, textAlign: 'center' }}>暂无群体类别数据</div>
              ) : (
                groupCategoryStats.map((item, index) => {
                  const maxVal = Math.max(...groupCategoryStats.map((o) => o.value), 1);
                  return (
                    <div key={`${item.name}-${index}`} className="rank-item">
                      <span className="rank-num">{index + 1}</span>
                      <span className="rank-name" title={item.name}>{item.name}</span>
                      <span className="rank-value">{item.value}</span>
                      <div className="rank-bar-wrap">
                        <div
                          className="rank-bar"
                          style={{ width: `${(Number(item.value) / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
