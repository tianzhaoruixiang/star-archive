import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Row, Col, Statistic, Tabs, Tooltip, Modal, Pagination, Empty } from 'antd';
import {
  TeamOutlined,
  StarOutlined,
  GlobalOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchStatistics } from '@/store/slices/dashboardSlice';
import { dashboardAPI, personAPI, type OrganizationRankItem, type VisaTypeRankItem, type ProvinceRanksDTO, type ProvinceFlowItemDTO, type TravelTrendDTO, type PersonListFilter } from '@/services/api';
import PersonCard from '@/components/PersonCard';
import type { PersonCardData } from '@/components/PersonCard';
import { getProvinceCenter } from '@/utils/provinceGeo';
import { DashboardSkeleton, PageCardGridSkeleton } from '@/components/SkeletonPresets';
import './index.css';

const PERSON_LIST_PAGE_SIZE = 12;

const CHINA_GEO_JSON_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';

/** 机构/地区/类型 排行项 */
interface RankItem {
  rank: number;
  name: string;
  value: number;
}

/* 深色主题：疑似=橙、康复=绿、青蓝/紫强调 */
const TREND_COLORS = ['#f59e0b', '#22c55e', '#06b6d4', '#a855f7'];

function Dashboard() {
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
  const [provinceFlow, setProvinceFlow] = useState<ProvinceFlowItemDTO[]>([]);
  const [chinaGeoLoaded, setChinaGeoLoaded] = useState(false);

  /** 人物列表弹框 */
  const [personListModalOpen, setPersonListModalOpen] = useState(false);
  const [personListModalTitle, setPersonListModalTitle] = useState('');
  const [personListFilter, setPersonListFilter] = useState<PersonListFilter | undefined>(undefined);
  const [personListPage, setPersonListPage] = useState(0);
  const [personListData, setPersonListData] = useState<{ content: PersonCardData[]; totalElements: number }>({ content: [], totalElements: 0 });
  const [personListLoading, setPersonListLoading] = useState(false);

  const openPersonListModal = useCallback((title: string, filter?: PersonListFilter) => {
    setPersonListModalTitle(title);
    setPersonListFilter(filter);
    setPersonListPage(0);
    setPersonListData({ content: [], totalElements: 0 });
    setPersonListModalOpen(true);
  }, []);

  useEffect(() => {
    if (!personListModalOpen) return;
    const controller = new AbortController();
    setPersonListLoading(true);
    console.log('[Dashboard] 查询人员列表:', { page: personListPage, filter: personListFilter });
    personAPI
      .getPersonList(personListPage, PERSON_LIST_PAGE_SIZE, personListFilter, { signal: controller.signal })
      .then((res: unknown) => {
        const data = res && typeof res === 'object' && 'data' in res ? (res as { data?: { content?: PersonCardData[]; totalElements?: number } }).data : res as { content?: PersonCardData[]; totalElements?: number };
        console.log('[Dashboard] 人员列表查询结果:', data);
        setPersonListData({
          content: Array.isArray(data?.content) ? data.content : [],
          totalElements: typeof data?.totalElements === 'number' ? data.totalElements : 0,
        });
      })
      .catch((err: unknown) => {
        const isCancel = err != null && typeof err === 'object' &&
          (('name' in err && (err as { name: string }).name === 'Canceled') ||
           ('code' in err && (err as { code: string }).code === 'ERR_CANCELED'));
        if (!isCancel) setPersonListData({ content: [], totalElements: 0 });
      })
      .finally(() => setPersonListLoading(false));
    return () => controller.abort();
  }, [personListModalOpen, personListPage, personListFilter]);

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
      // @ts-ignore
      setProvinceRanks(payload && typeof payload === 'object' ? payload : null);
    }).catch(() => setProvinceRanks(null));
  }, []);

  useEffect(() => {
    dashboardAPI.getTravelTrend(14).then((res: { data?: TravelTrendDTO }) => {
      const payload = res?.data ?? res;
      // @ts-ignore
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

  useEffect(() => {
    dashboardAPI.getProvinceFlow().then((res: unknown) => {
      const raw = res && typeof res === 'object' && 'data' in res ? (res as { data?: unknown }).data : res;
      const list = Array.isArray(raw) ? raw : [];
      setProvinceFlow(list as ProvinceFlowItemDTO[]);
    }).catch(() => setProvinceFlow([]));
  }, []);

  const totalPerson = statistics?.totalPersonCount ?? 0;
  const keyPerson = statistics?.keyPersonCount ?? 0;
  const activeRegions = 0;
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
        textStyle: { color: '#94a3b8', fontSize: 12 },
        itemWidth: 14,
        itemHeight: 14,
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: 'rgba(6, 182, 212, 0.2)' } },
        axisLabel: { color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(6, 182, 212, 0.1)', type: 'dashed' } },
        axisLabel: { color: '#94a3b8' },
      },
      series: series.map((s, i) => ({
        name: s.name,
        type: isBar ? 'bar' : 'line',
        data: s.data ?? [],
        smooth: true,
        itemStyle: { color: TREND_COLORS[i % TREND_COLORS.length] },
        lineStyle: { color: TREND_COLORS[i % TREND_COLORS.length], width: 2 },
        areaStyle: isBar ? undefined : { color: 'rgba(6, 182, 212, 0.12)' },
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
      /* 深色主题：蓝绿黄橙红渐变（少→多），科技感热力 */
      const visualMapColors = [
        '#1e293b', '#334155', '#475569', '#0f766e', '#0d9488', '#14b8a6', '#22d3ee', '#06b6d4',
        '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#7f1d1d',
      ];
      /* 流动线数据：仅保留两端都有坐标的线路 */
      const lineData = provinceFlow
        .map((f) => {
          const fromCoord = getProvinceCenter(f.fromProvince);
          const toCoord = getProvinceCenter(f.toProvince);
          if (!fromCoord || !toCoord) return null;
          return {
            coords: [fromCoord, toCoord] as [number, number][],
            value: f.personCount,
            fromProvince: f.fromProvince,
            toProvince: f.toProvince,
          };
        })
        .filter((d): d is NonNullable<typeof d> => d != null);

      const series: Record<string, unknown>[] = [
        {
          name: '人员数量',
          type: 'map',
          map: 'china',
          geoIndex: 0,
          itemStyle: {
            borderColor: 'rgba(6, 182, 212, 0.35)',
            borderWidth: 1.2,
            shadowBlur: 6,
            shadowColor: 'rgba(6, 182, 212, 0.15)',
          },
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 600,
            color: '#e2e8f0',
            fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
            textBorderColor: 'rgba(15, 13, 26, 0.9)',
            textBorderWidth: 1.5,
            textShadowColor: 'rgba(6, 182, 212, 0.2)',
            textShadowBlur: 3,
            padding: [1, 3],
          },
          emphasis: {
            label: {
              show: true,
              fontWeight: 700,
              color: '#f1f5f9',
              fontSize: 14,
              textBorderColor: 'rgba(6, 182, 212, 0.5)',
              textBorderWidth: 2,
              textShadowColor: 'rgba(6, 182, 212, 0.4)',
              textShadowBlur: 4,
            },
            itemStyle: {
              areaColor: 'rgba(6, 182, 212, 0.25)',
              borderColor: 'rgba(6, 182, 212, 0.8)',
              borderWidth: 2.5,
              shadowBlur: 12,
              shadowColor: 'rgba(6, 182, 212, 0.4)',
            },
          },
          data: provinceList.map((p) => ({ name: p.name, value: p.value })),
        },
      ];
      if (lineData.length > 0) {
        series.push({
          name: '人员流动',
          type: 'lines',
          coordinateSystem: 'geo',
          geoIndex: 0,
          data: lineData,
          lineStyle: {
            color: 'rgba(6, 182, 212, 0.55)',
            width: 1.2,
            curveness: 0.15,
          },
          effect: {
            show: true,
            period: 2.5,
            trailLength: 0.35,
            color: 'rgba(6, 182, 212, 0.75)',
            symbolSize: 2.5,
          },
          emphasis: {
            lineStyle: { width: 2.2, color: 'rgba(6, 182, 212, 0.9)' },
            label: { show: false },
          },
        });
      }

      return {
        backgroundColor: 'transparent',
        geo: {
          map: 'china',
          roam: true,
          layoutCenter: ['50%', '60%'],
          layoutSize: '110%',
          silent: false,
          itemStyle: {
            borderColor: 'rgba(6, 182, 212, 0.35)',
            borderWidth: 1.2,
          },
          label: { show: false },
        },
        tooltip: {
          trigger: 'item',
          formatter: (params: { seriesType?: string; name?: string; data?: { fromProvince?: string; toProvince?: string; value?: number } }) => {
            if (params.seriesType === 'lines' && params.data) {
              const d = params.data as { fromProvince?: string; toProvince?: string; value?: number };
              return `从 ${d.fromProvince ?? ''} → ${d.toProvince ?? ''}: ${d.value ?? 0} 人<br/>点击查看人员`;
            }
            const v = countMap.get(params.name ?? '') ?? 0;
            return `${params.name}: ${v}`;
          },
          backgroundColor: 'rgba(22, 20, 42, 0.95)',
          borderColor: 'rgba(6, 182, 212, 0.3)',
          borderWidth: 1,
          borderRadius: 8,
          textStyle: { color: '#f1f5f9', fontSize: 13, fontWeight: 500 },
          padding: [10, 14],
        },
        visualMap: {
          min: minVal,
          max: maxVal,
          text: ['高', '低'],
          realtime: false,
          calculable: true,
          inRange: { color: visualMapColors },
          right: 14,
          bottom: 8,
          textStyle: { color: '#94a3b8', fontSize: 11, fontWeight: 500 },
        },
        series,
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
          itemStyle: { color: 'rgba(6, 182, 212, 0.5)', borderColor: 'rgba(6, 182, 212, 0.4)', borderWidth: 1 },
          emphasis: { scale: 1.2 },
        },
      ],
    };
  }, [chinaGeoLoaded, provinceRanks?.all, provinceFlow]);

  if (loading && !statistics) {
    return <DashboardSkeleton />;
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
              valueStyle={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 600 }}
              valueRender={(node) => (
                <span
                  className="dashboard-stat-value-clickable"
                  onClick={() => openPersonListModal('监测人员总数')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && openPersonListModal('监测人员总数')}
                >
                  {node}
                </span>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card dashboard-card-green">
            <div className="dashboard-card-icon">
              <StarOutlined />
            </div>
            <Statistic
              title="重点人员"
              value={keyPerson}
              valueStyle={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 600 }}
              valueRender={(node) => (
                <span
                  className="dashboard-stat-value-clickable"
                  onClick={() => openPersonListModal('重点人员', { isKeyPerson: true })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && openPersonListModal('重点人员', { isKeyPerson: true })}
                >
                  {node}
                </span>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card dashboard-card-pink">
            <div className="dashboard-card-icon">
              <GlobalOutlined />
            </div>
            <Statistic
              title="活跃区域"
              value={activeRegions}
              valueStyle={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-card dashboard-card-blue">
            <div className="dashboard-card-icon">
              <RiseOutlined />
            </div>
            <Statistic
              title="今日流动记录"
              value={todayMovement}
              valueStyle={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 600 }}
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
                      <span
                        className="rank-value dashboard-rank-value-clickable"
                        onClick={() => openPersonListModal(`机构：${item.name}`, { organization: item.name })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && openPersonListModal(`机构：${item.name}`, { organization: item.name })}
                      >
                        {item.value}
                      </span>
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
                      <span
                        className="rank-value dashboard-rank-value-clickable"
                        onClick={() => openPersonListModal(`签证类型：${item.name}`, { visaType: item.name })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && openPersonListModal(`签证类型：${item.name}`, { visaType: item.name })}
                      >
                        {item.value}
                      </span>
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
                style={{ height: '100%', width: '100%', position: 'absolute', left: 0, top: 0 }}
                opts={{ renderer: 'canvas' }}
                notMerge
                onEvents={{
                  click: (params: { componentSubType?: string; name?: string; data?: { fromProvince?: string; toProvince?: string } }) => {
                    if (!chinaGeoLoaded) return;
                    if (params.componentSubType === 'lines' && params.data) {
                      const d = params.data as { fromProvince?: string; toProvince?: string };
                      console.log('[Dashboard] 点击流动线:', d);
                      if (d.fromProvince && d.toProvince) {
                        console.log('[Dashboard] 打开人员列表弹窗:', {
                          departureProvince: d.fromProvince,
                          destinationProvince: d.toProvince,
                        });
                        openPersonListModal(`${d.fromProvince} → ${d.toProvince} 流动人员`, {
                          departureProvince: d.fromProvince,
                          destinationProvince: d.toProvince,
                        });
                      }
                      return;
                    }
                    if (params.componentSubType === 'map' && params.name) {
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
                  <Tooltip
                    key={`${item.name}-${index}`}
                    title={`${item.name}: ${item.value}`}
                    placement="left"
                    overlayInnerStyle={{
                      backgroundColor: 'rgba(22, 20, 42, 0.95)',
                      border: '1px solid rgba(6, 182, 212, 0.25)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#f1f5f9',
                    }}
                  >
                    <div className="rank-item">
                      <span className="rank-num">{index + 1}</span>
                      <span className="rank-name" title={item.name}>{item.name}</span>
                      <span
                        className="rank-value dashboard-rank-value-clickable"
                        onClick={() => openPersonListModal(`${item.name} 涉及人员`, { destinationProvince: item.name })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && openPersonListModal(`${item.name} 涉及人员`, { destinationProvince: item.name })}
                      >
                        {item.value}
                      </span>
                      <div className="rank-bar-wrap">
                        <div
                          className="rank-bar"
                          style={{ width: `${(Number(item.value) / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </Tooltip>
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
                      <span
                        className="rank-value dashboard-rank-value-clickable"
                        onClick={() => openPersonListModal(`群体：${item.name}`, { belongingGroup: item.name })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && openPersonListModal(`群体：${item.name}`, { belongingGroup: item.name })}
                      >
                        {item.value}
                      </span>
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

      <Modal
        title={personListModalTitle}
        open={personListModalOpen}
        onCancel={() => setPersonListModalOpen(false)}
        footer={null}
        width="85%"
        destroyOnClose
        className="dashboard-person-list-modal"
      >
        {personListLoading ? (
          <div className="dashboard-person-list-loading">
            <PageCardGridSkeleton title={false} count={6} />
          </div>
        ) : personListData.content.length === 0 ? (
          <Empty description="暂无人员" />
        ) : (
          <>
            <Row gutter={[12, 12]} className="dashboard-person-list-grid">
              {personListData.content.map((person) => (
                <Col xs={24} sm={12} md={8} key={person.personId}>
                  <PersonCard person={person} showActionLink />
                </Col>
              ))}
            </Row>
            {personListData.totalElements > PERSON_LIST_PAGE_SIZE && (
              <div className="dashboard-person-list-pagination">
                <Pagination
                  current={personListPage + 1}
                  total={personListData.totalElements}
                  pageSize={PERSON_LIST_PAGE_SIZE}
                  showSizeChanger={false}
                  showTotal={(total) => `共 ${total} 人`}
                  onChange={(page) => setPersonListPage(page - 1)}
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

export default Dashboard;
