import { FC, useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Button, Row, Col, Statistic, Spin } from 'antd';
import { ArrowLeftOutlined, TeamOutlined, CarOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { dashboardAPI, type ProvinceStatsDTO } from '@/services/api';
import { getProvinceAdcode, fetchProvinceGeoJson } from '@/utils/provinceGeo';
import './index.css';

const ProvinceDetail: FC = () => {
  const { provinceName } = useParams<{ provinceName: string }>();
  const name = provinceName ? decodeURIComponent(provinceName) : '';
  const [stats, setStats] = useState<ProvinceStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [provinceGeoLoaded, setProvinceGeoLoaded] = useState(false);
  const [provinceMapKey, setProvinceMapKey] = useState<string>('');

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
      return;
    }
    const mapKey = `province_${adcode}`;
    fetchProvinceGeoJson(adcode)
      .then((geoJson: unknown) => {
        if (geoJson && typeof geoJson === 'object') {
          echarts.registerMap(mapKey, geoJson as Parameters<typeof echarts.registerMap>[1]);
          setProvinceMapKey(mapKey);
          setProvinceGeoLoaded(true);
        } else {
          setProvinceGeoLoaded(false);
          setProvinceMapKey('');
        }
      })
      .catch(() => {
        setProvinceGeoLoaded(false);
        setProvinceMapKey('');
      });
  }, [adcode]);

  /** 省份地图：与中国地图样式一致，按城市人数渐变着色 */
  const provinceMapOption = useCallback(() => {
    if (!provinceGeoLoaded || !provinceMapKey) return { backgroundColor: 'transparent' };
    const cityList = stats?.cityRank ?? [];
    const countMap = new Map(cityList.map((c) => [c.name, c.value]));
    const values = cityList.map((c) => c.value);
    const minVal = values.length ? Math.min(...values) : 0;
    let maxVal = values.length ? Math.max(...values) : 1;
    if (maxVal <= minVal) maxVal = minVal + 1;

    /* 与中国地图一致的 16 级冷暖渐变：浅蓝（少）→ 深红（多） */
    const visualMapColors = [
      '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981',
      '#34d399', '#84cc16', '#eab308', '#f97316', '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
    ];

    const baseOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: { name: string }) => {
          const v = countMap.get(params.name) ?? 0;
          return `${params.name}: ${v}`;
        },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(102, 126, 234, 0.5)',
        borderWidth: 1,
        borderRadius: 8,
        textStyle: { color: '#e2e8f0', fontSize: 13, fontWeight: 500 },
        padding: [10, 14],
      },
      series: [
        {
          name: '人员数量',
          type: 'map',
          map: provinceMapKey,
          roam: true,
          layoutCenter: ['50%', '50%'],
          layoutSize: '120%',
          itemStyle: {
            borderColor: 'rgba(148, 163, 184, 0.6)',
            borderWidth: 1.2,
            shadowBlur: 4,
            shadowColor: 'rgba(0, 0, 0, 0.12)',
          },
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 600,
            color: '#0f172a',
            fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
            textBorderColor: 'rgba(255, 255, 255, 0.95)',
            textBorderWidth: 1.5,
            textShadowColor: 'rgba(0, 0, 0, 0.2)',
            textShadowBlur: 3,
            padding: [1, 3],
          },
          emphasis: {
            label: {
              show: true,
              fontWeight: 700,
              color: '#020617',
              fontSize: 14,
              textBorderColor: '#fff',
              textBorderWidth: 2,
              textShadowColor: 'rgba(0, 0, 0, 0.25)',
              textShadowBlur: 4,
            },
            itemStyle: {
              areaColor: '#818cf8',
              borderColor: 'rgba(102, 126, 234, 0.9)',
              borderWidth: 2.5,
              shadowBlur: 12,
              shadowColor: 'rgba(59, 130, 246, 0.35)',
            },
          },
          data: cityList.map((c) => ({ name: c.name, value: c.value })),
        },
      ],
    };

    if (cityList.length > 0) {
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
          textStyle: { color: '#94a3b8', fontSize: 11, fontWeight: 500 },
        },
      };
    }

    /* 无城市数据时：单色底图，样式仍与中国地图一致 */
    const seriesBase = baseOption.series[0] as Record<string, unknown>;
    return {
      ...baseOption,
      series: [
        {
          ...seriesBase,
          itemStyle: {
            borderColor: 'rgba(148, 163, 184, 0.6)',
            borderWidth: 1.2,
            areaColor: 'rgba(30, 64, 175, 0.4)',
            shadowBlur: 4,
            shadowColor: 'rgba(0, 0, 0, 0.12)',
          },
        },
      ],
    };
  }, [provinceGeoLoaded, provinceMapKey, stats?.cityRank]);

  const renderRankList = (list: ProvinceStatsDTO['visaTypeRank'], emptyText: string) => {
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
        {list.map((item, index) => (
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
        ))}
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
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Statistic
                    title="行程记录数"
                    value={stats?.travelRecordCount ?? 0}
                    prefix={<CarOutlined />}
                    valueStyle={{ color: 'var(--primary)' }}
                  />
                </Col>
              </Row>
            </Card>

            <Row gutter={16} className="dashboard-province-detail-cards">
              <Col xs={24} md={12}>
                <Card className="dashboard-panel" title="城市分布" size="small">
                  {renderRankList(stats?.cityRank ?? [], '暂无城市分布数据')}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card className="dashboard-panel" title="签证类型分布" size="small">
                  {renderRankList(stats?.visaTypeRank ?? [], '暂无签证类型数据')}
                </Card>
              </Col>
            </Row>
            <Row gutter={16} className="dashboard-province-detail-cards">
              <Col xs={24} md={12}>
                <Card className="dashboard-panel" title="机构分布" size="small">
                  {renderRankList(stats?.organizationRank ?? [], '暂无机构数据')}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card className="dashboard-panel" title="所属群体分布" size="small">
                  {renderRankList(stats?.belongingGroupRank ?? [], '暂无群体数据')}
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
    </div>
  );
};

export default ProvinceDetail;
