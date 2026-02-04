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
import { dashboardAPI, personAPI, type OrganizationRankItem, type VisaTypeRankItem, type ProvinceRanksDTO, type PersonListFilter } from '@/services/api';
import PersonCard from '@/components/PersonCard';
import type { PersonCardData } from '@/components/PersonCard';
import { DashboardSkeleton, PageCardGridSkeleton } from '@/components/SkeletonPresets';
import './index.css';

const PERSON_LIST_PAGE_SIZE = 12;

/** 中国全图 GeoJSON：仅从本地加载，支持离线展示 */
const CHINA_GEO_JSON_PATH = '/littlesmall/geo/100000_full.json';

/** 机构/地区/类型 排行项 */
interface RankItem {
  rank: number;
  name: string;
  value: number;
}

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { statistics, loading } = useAppSelector((state) => state.dashboard);
  const [locationTab, setLocationTab] = useState<string>('全部');
  const [organizationTop15, setOrganizationTop15] = useState<OrganizationRankItem[]>([]);
  const [visaTypeTop15, setVisaTypeTop15] = useState<VisaTypeRankItem[]>([]);
  const [provinceRanks, setProvinceRanks] = useState<ProvinceRanksDTO | null>(null);
  const [groupCategoryStats, setGroupCategoryStats] = useState<OrganizationRankItem[]>([]);
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
    personAPI
      .getPersonList(personListPage, PERSON_LIST_PAGE_SIZE, personListFilter, { signal: controller.signal })
      .then((res: unknown) => {
        const data = res && typeof res === 'object' && 'data' in res ? (res as { data?: { content?: PersonCardData[]; totalElements?: number } }).data : res as { content?: PersonCardData[]; totalElements?: number };
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
    dashboardAPI.getGroupCategoryStats().then((res: { data?: OrganizationRankItem[] }) => {
      const list = res?.data ?? res;
      setGroupCategoryStats(Array.isArray(list) ? list : []);
    }).catch(() => setGroupCategoryStats([]));
  }, []);

  useEffect(() => {
    fetch(CHINA_GEO_JSON_PATH)
      .then((res) => {
        if (!res.ok) throw new Error('china geo not found');
        return res.json();
      })
      .then((geoJson: unknown) => {
        if (geoJson && typeof geoJson === 'object') {
          echarts.registerMap('china', geoJson as Parameters<typeof echarts.registerMap>[1]);
          setChinaGeoLoaded(true);
        }
      })
      .catch(() => setChinaGeoLoaded(false));
  }, []);

  const totalPerson = statistics?.totalPersonCount ?? 0;
  const keyPerson = statistics?.keyPersonCount ?? 0;
  const activeRegions = 0;
  const todayMovement = statistics?.todaySocialDynamicCount ?? 0;

  /** 全国监测分布图 */
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
        '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985',
        '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#ef4444', '#dc2626', '#b91c1c',
      ];

      const series: Record<string, unknown>[] = [
        {
          name: '人员数量',
          type: 'map',
          map: 'china',
          geoIndex: 0,
          itemStyle: {
            borderColor: '#d1d5db',
            borderWidth: 1.5,
            areaColor: '#e0f2fe',
          },
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 500,
            color: '#334155',
            fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
            padding: [1, 3],
          },
          emphasis: {
            label: {
              show: true,
              fontWeight: 700,
              color: '#1e293b',
              fontSize: 14,
            },
            itemStyle: {
              areaColor: '#a5b4fc',
              borderColor: '#818cf8',
              borderWidth: 2.5,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
          data: provinceList.map((p) => ({ name: p.name, value: p.value })),
        },
      ];

      return {
        backgroundColor: 'transparent',
        geo: {
          map: 'china',
          roam: true,
          layoutCenter: ['50%', '70%'],
          layoutSize: '145%',
          silent: false,
          itemStyle: {
            borderColor: '#d1d5db',
            borderWidth: 1.5,
            areaColor: '#e0f2fe',
          },
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 500,
            color: '#334155',
            fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
          },
          emphasis: {
            itemStyle: {
              areaColor: '#a5b4fc',
              borderColor: '#818cf8',
              borderWidth: 2.5,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        },
        tooltip: {
          trigger: 'item',
          formatter: (params: { name?: string }) => {
            const v = countMap.get(params.name ?? '') ?? 0;
            return `${params.name}: ${v}`;
          },
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          borderColor: 'rgba(102, 126, 234, 0.5)',
          borderWidth: 1,
          borderRadius: 8,
          textStyle: { color: '#e2e8f0', fontSize: 13, fontWeight: 500 },
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
          textStyle: { color: 'rgba(148, 163, 184, 0.9)', fontSize: 11, fontWeight: 500 },
        },
        series,
      };
    }

    /* 地图未加载时返回空配置，避免显示 fallback 导致抖动 */
    return { backgroundColor: 'transparent', series: [] };
  }, [chinaGeoLoaded, provinceRanks?.all]);

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
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
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
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
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
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
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
              valueStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 三栏：左 中 右（超宽屏下中间地图占比更大，适配 2560×1080） */}
      <Row gutter={16} className="dashboard-main">
        {/* 左侧：机构分布 TOP15、签证类型排名 */}
        <Col xs={24} lg={5} xxl={4}>
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

        {/* 中间：全国监测分布图 */}
        <Col xs={24} lg={14} xxl={16}>
          <Card className="dashboard-panel dashboard-panel-map" title="全国监测分布图" size="small">
            <div className="map-section map-container">
              <ReactECharts
                key={`china-map-${location.key}-${chinaGeoLoaded}`}
                option={mapOption()}
                style={{ height: '100%', width: '100%', position: 'absolute', left: 0, top: 0 }}
                opts={{ renderer: 'canvas' }}
                notMerge
                onEvents={{
                  click: (params: { componentSubType?: string; name?: string }) => {
                    if (!chinaGeoLoaded) return;
                    if (params.componentSubType === 'map' && params.name) {
                      navigate(`/dashboard/province/${encodeURIComponent(params.name)}`);
                    }
                  },
                }}
              />
            </div>
          </Card>
        </Col>

        {/* 右侧：各地排名、群体类别 */}
        <Col xs={24} lg={5} xxl={4}>
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
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#1e293b',
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
            <div className="dashboard-person-list-grid">
              {personListData.content.map((person) => (
                <PersonCard
                  key={person.personId}
                  person={person}
                  minWidth={180}
                  maxWidth={280}
                />
              ))}
            </div>
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
