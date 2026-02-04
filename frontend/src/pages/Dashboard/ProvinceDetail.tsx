import { type FC, useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Button, Row, Col, Statistic, Spin, Modal, Pagination, Empty } from 'antd';
import { ArrowLeftOutlined, TeamOutlined, CarOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { dashboardAPI, personAPI, type ProvinceStatsDTO, type PersonListFilter } from '@/services/api';
import PersonCard from '@/components/PersonCard';
import type { PersonCardData } from '@/components/PersonCard';
import { getProvinceAdcode, fetchProvinceGeoJson } from '@/utils/provinceGeo';
import './index.css';

const PERSON_LIST_PAGE_SIZE = 12;

/** 为 map 数据匹配 GeoJSON 中的城市名（杭州/杭州市） */
function normalizeCityNameForMap(
  cityName: string,
  geoFeatures: { properties?: { name?: string } }[]
): string {
  const t = cityName.trim();
  if (!t) return t;
  const names = new Set(geoFeatures.map((f) => (f.properties?.name as string) ?? '').filter(Boolean));
  if (names.has(t)) return t;
  if (names.has(`${t}市`)) return `${t}市`;
  if (t.endsWith('市') && names.has(t.slice(0, -1))) return t.slice(0, -1);
  return t;
}

const ProvinceDetail: FC = () => {
  const { provinceName } = useParams<{ provinceName: string }>();
  const name = provinceName ? decodeURIComponent(provinceName) : '';
  const [stats, setStats] = useState<ProvinceStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [provinceGeoLoaded, setProvinceGeoLoaded] = useState(false);
  const [provinceMapKey, setProvinceMapKey] = useState<string>('');
  const [geoJson, setGeoJson] = useState<Record<string, unknown> | null>(null);

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
    const filter = personListFilter;
    personAPI
      .getPersonList(personListPage, PERSON_LIST_PAGE_SIZE, filter, { signal: controller.signal })
      .then((res: unknown) => {
        const raw = res && typeof res === 'object' && 'data' in res ? (res as { data?: unknown }).data : res;
        const data = raw && typeof raw === 'object' && raw !== null ? (raw as { content?: unknown; totalElements?: number }) : null;
        const content = Array.isArray(data?.content) ? data.content : [];
        const totalElements = typeof data?.totalElements === 'number' ? data.totalElements : 0;
        setPersonListData({ content: content as PersonCardData[], totalElements });
      })
      .catch((err: unknown) => {
        const isCancel = err != null && typeof err === 'object' &&
          (( 'name' in err && (err as { name: string }).name === 'Canceled') ||
           ('code' in err && (err as { code: string }).code === 'ERR_CANCELED'));
        if (isCancel) return;
        setPersonListData({ content: [], totalElements: 0 });
      })
      .finally(() => setPersonListLoading(false));
    return () => controller.abort();
  }, [personListModalOpen, personListPage, personListFilter]);

  useEffect(() => {
    if (!name) {
      setLoading(false);
      return;
    }
    setLoading(true);
    dashboardAPI
      .getProvinceStats(name)
      .then((res: unknown) => {
        const payload = res && typeof res === 'object' && 'data' in res
          ? (res as { data?: ProvinceStatsDTO }).data
          : (res as ProvinceStatsDTO);
        setStats(payload ?? null);
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [name]);

  const adcode = getProvinceAdcode(name);
  useEffect(() => {
    if (!adcode) {
      setProvinceGeoLoaded(false);
      setProvinceMapKey('');
      setGeoJson(null);
      return;
    }
    const mapKey = `province_${adcode}`;
    fetchProvinceGeoJson(adcode)
      .then((raw: unknown) => {
        if (raw && typeof raw === 'object') {
          const gj = raw as Record<string, unknown>;
          echarts.registerMap(mapKey, gj as unknown as Parameters<typeof echarts.registerMap>[1]);
          setProvinceMapKey(mapKey);
          setGeoJson(gj);
          setProvinceGeoLoaded(true);
        } else {
          setProvinceGeoLoaded(false);
          setProvinceMapKey('');
          setGeoJson(null);
        }
      })
      .catch(() => {
        setProvinceGeoLoaded(false);
        setProvinceMapKey('');
        setGeoJson(null);
      });
  }, [adcode]);

  /** 省份地图：区域着色 + 城市散点分布 */
  const provinceMapOption = useCallback(() => {
    if (!provinceGeoLoaded || !provinceMapKey) return { backgroundColor: 'transparent' };
    const cityList = stats?.cityRank ?? [];
    const features = (Array.isArray((geoJson as { features?: unknown[] })?.features)
      ? (geoJson as { features: { properties?: { name?: string } }[] }).features
      : []) as { properties?: { name?: string } }[];

    const countMap = new Map(cityList.map((c) => [c.name, c.value]));
    /** 从 API 城市名到归一化后的 GeoJSON 名称，用于按区域匹配数量 */
    const normalizedToValue = new Map(
      cityList.map((c) => [normalizeCityNameForMap(c.name, features), c.value])
    );
    /** 按 GeoJSON 所有区域构建 mapData，确保每块区域都有 value，visualMap 才能按数量着色 */
    const mapData = features
      .map((f) => {
        const featName = (f.properties?.name as string) ?? '';
        const value = normalizedToValue.get(featName) ?? 0;
        return { name: featName, value };
      })
      .filter((d) => d.name !== '');

    const values = mapData.map((d) => d.value);
    const minVal = values.length ? Math.min(...values) : 0;
    let maxVal = values.length ? Math.max(...values) : 1;
    if (maxVal <= minVal) maxVal = minVal + 1;

    /* 16 级冷暖渐变：与首页地图一致 */
    const visualMapColors = [
      '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985',
      '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#ef4444', '#dc2626', '#b91c1c',
    ];

    const mapSeries: Record<string, unknown> = {
      name: '人员数量',
      type: 'map',
      map: provinceMapKey,
      roam: true,
      layoutCenter: ['50%', '50%'],
      layoutSize: '120%',
      itemStyle: {
        borderColor: '#d1d5db',
        borderWidth: 1.5,
        areaColor: '#e0f2fe',
        shadowBlur: 4,
        shadowColor: 'rgba(0, 0, 0, 0.15)',
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
        label: { show: true, fontWeight: 700, color: '#1e293b', fontSize: 14 },
        itemStyle: {
          areaColor: '#a5b4fc',
          borderColor: '#818cf8',
          borderWidth: 2.5,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
      },
      data: mapData,
    };

    /** 与中国地图一致：悬浮显示「名称: 数量」，仅由 tooltip 展示 */
    const tooltipFormatter = (params: { name?: string; value?: unknown }) => {
      const n = params.name ?? '';
      const rawValue = params.value;
      const v = typeof rawValue === 'number' ? rawValue : countMap.get(n) ?? 0;
      return n ? `${n}: ${v}` : `${v}`;
    };

    const baseOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: tooltipFormatter,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderColor: 'rgba(102, 126, 234, 0.5)',
        borderWidth: 1,
        borderRadius: 8,
        textStyle: { color: '#e2e8f0', fontSize: 13, fontWeight: 500 },
        padding: [10, 14],
      },
      series: [mapSeries],
    };

    if (mapData.length > 0) {
      return {
        ...baseOption,
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
          seriesIndex: 0,
        },
      };
    }

    mapSeries.data = [];
    (mapSeries.itemStyle as Record<string, unknown>).areaColor = '#e0f2fe';
    return { ...baseOption, series: [mapSeries] };
  }, [provinceGeoLoaded, provinceMapKey, stats?.cityRank, geoJson]);

  const renderRankList = (
    list: ProvinceStatsDTO['visaTypeRank'],
    emptyText: string,
    getClickFilter?: (item: { name: string; value: number }) => { title: string; filter: PersonListFilter } | undefined
  ) => {
    if (!list || list.length === 0) {
      return (
        <div className="dashboard-province-detail-empty">
          {emptyText}
        </div>
      );
    }
    const maxVal = Math.max(...list.map((o) => o.value), 1);
    return (
      <div className="rank-list rank-list-scroll">
        {list.map((item, index) => {
          const clickOpts = name && getClickFilter?.(item);
          const handleOpenModal = clickOpts
            ? () => openPersonListModal(clickOpts.title, clickOpts.filter)
            : undefined;
          return (
            <div
              key={`${item.name}-${index}`}
              className={`rank-item ${clickOpts ? 'rank-item-clickable' : ''}`}
              onClick={handleOpenModal}
              onKeyDown={handleOpenModal ? (e) => e.key === 'Enter' && handleOpenModal() : undefined}
              role={clickOpts ? 'button' : undefined}
              tabIndex={clickOpts ? 0 : undefined}
            >
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
        })}
      </div>
    );
  };

  if (!name) {
    return (
      <div className="page-wrapper dashboard-province-detail">
        <div className="dashboard-province-detail-header">
          <Link to="/dashboard">
            <Button type="text" icon={<ArrowLeftOutlined />}>
              返回全国地图
            </Button>
          </Link>
        </div>
        <Card title="省份详情" className="dashboard-panel">
          <p className="dashboard-province-detail-desc">未指定省份。</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-wrapper dashboard-province-detail">
      <div className="dashboard-province-detail-header">
        <Link to="/dashboard">
          <Button type="text" icon={<ArrowLeftOutlined />}>
            返回全国地图
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="dashboard-province-detail-loading">
          <Spin size="large" tip="加载中..." />
        </div>
      ) : (
        <Row gutter={16} className="dashboard-province-detail-body">
          <Col xs={24} lg={14}>
            <Card title={`${name} 监测概况`} className="dashboard-panel dashboard-province-detail-title-card">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Statistic
                    title="涉及人员数"
                    value={stats?.totalPersonCount ?? 0}
                    prefix={<TeamOutlined />}
                    valueStyle={{ color: 'var(--primary)' }}
                    valueRender={(node) => (
                      <span
                        className="dashboard-stat-value-clickable"
                        onClick={() => name && openPersonListModal(`${name} 涉及人员`, { destinationProvince: name })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && name && openPersonListModal(`${name} 涉及人员`, { destinationProvince: name })}
                      >
                        {node}
                      </span>
                    )}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Statistic
                    title="行程记录数"
                    value={stats?.travelRecordCount ?? 0}
                    prefix={<CarOutlined />}
                    valueStyle={{ color: 'var(--primary)' }}
                    valueRender={(node) => (
                      <span
                        className="dashboard-stat-value-clickable"
                        onClick={() => name && openPersonListModal(`${name} 涉及人员`, { destinationProvince: name })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && name && openPersonListModal(`${name} 涉及人员`, { destinationProvince: name })}
                      >
                        {node}
                      </span>
                    )}
                  />
                </Col>
              </Row>
            </Card>

            <Row gutter={16} className="dashboard-province-detail-cards">
              <Col xs={24} md={12}>
                <Card className="dashboard-panel" title="城市分布" size="small">
                  {renderRankList(
                    stats?.cityRank ?? [],
                    '暂无城市分布数据',
                    (item) => ({ title: `${name} - ${item.name}`, filter: { destinationProvince: name, destinationCity: item.name } })
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card className="dashboard-panel" title="签证类型分布" size="small">
                  {renderRankList(
                    stats?.visaTypeRank ?? [],
                    '暂无签证类型数据',
                    (item) => ({ title: `${name} - 签证类型 ${item.name}`, filter: { destinationProvince: name, visaType: item.name } })
                  )}
                </Card>
              </Col>
            </Row>
            <Row gutter={16} className="dashboard-province-detail-cards">
              <Col xs={24} md={12}>
                <Card className="dashboard-panel" title="机构分布" size="small">
                  {renderRankList(
                    stats?.organizationRank ?? [],
                    '暂无机构数据',
                    (item) => ({ title: `${name} - 机构 ${item.name}`, filter: { destinationProvince: name, organization: item.name } })
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card className="dashboard-panel" title="所属群体分布" size="small">
                  {renderRankList(
                    stats?.belongingGroupRank ?? [],
                    '暂无群体数据',
                    (item) => ({ title: `${name} - 群体 ${item.name}`, filter: { destinationProvince: name, belongingGroup: item.name } })
                  )}
                </Card>
              </Col>
            </Row>
          </Col>
          <Col xs={24} lg={10}>
            <Card className="dashboard-panel dashboard-province-detail-map-card" title={`${name} 地图`} size="small">
              <div className="dashboard-province-detail-map-wrap map-section map-container">
                {provinceGeoLoaded ? (
                  <ReactECharts
                    option={provinceMapOption()}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                    notMerge
                  />
                ) : adcode ? (
                  <div className="dashboard-province-detail-map-loading">
                    <Spin tip="地图加载中..." />
                  </div>
                ) : (
                  <div className="dashboard-province-detail-map-empty">暂无可用的省份地图数据</div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      )}

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
            <Spin tip="加载中..." />
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
                  showActionLink
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
};

export default ProvinceDetail;
