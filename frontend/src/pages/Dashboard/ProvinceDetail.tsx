import { FC, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Button, Row, Col, Statistic, Spin } from 'antd';
import { ArrowLeftOutlined, TeamOutlined, CarOutlined } from '@ant-design/icons';
import { dashboardAPI, type ProvinceStatsDTO } from '@/services/api';
import './index.css';

const ProvinceDetail: FC = () => {
  const { provinceName } = useParams<{ provinceName: string }>();
  const name = provinceName ? decodeURIComponent(provinceName) : '';
  const [stats, setStats] = useState<ProvinceStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);

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
        <>
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
            <Col xs={24} md={8}>
              <Card className="dashboard-panel" title="签证类型分布" size="small">
                {renderRankList(stats?.visaTypeRank ?? [], '暂无签证类型数据')}
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="dashboard-panel" title="机构分布" size="small">
                {renderRankList(stats?.organizationRank ?? [], '暂无机构数据')}
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="dashboard-panel" title="所属群体分布" size="small">
                {renderRankList(stats?.belongingGroupRank ?? [], '暂无群体数据')}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ProvinceDetail;
