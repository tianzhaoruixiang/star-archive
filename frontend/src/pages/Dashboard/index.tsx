import { useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import { UserOutlined, TeamOutlined, FileTextOutlined, MessageOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchStatistics } from '@/store/slices/dashboardSlice';
import './index.css';

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const { statistics, loading } = useAppSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchStatistics());
  }, [dispatch]);

  if (loading || !statistics) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="监测人员总数"
              value={statistics.totalPersonCount}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="重点人员总数"
              value={statistics.keyPersonCount}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日新闻数量"
              value={statistics.todayNewsCount}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日社交动态"
              value={statistics.todaySocialDynamicCount}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="中国地图" style={{ minHeight: 500 }}>
            <div className="map-placeholder">
              地图占位：各省人员数量着色、可下探到省份详情；左上机构分布、右上活跃省份、左下签证类型、右下人员类别 — 待对接 map-stats 与 ECharts
            </div>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card title="机构分布" size="small">前五名机构及人员数量，可滚动/展开 — 待对接数据</Card>
        </Col>
        <Col span={6}>
          <Card title="活跃省份排名" size="small">全部/昨日新增/驻留 — 待对接民航铁路数据</Card>
        </Col>
        <Col span={6}>
          <Card title="出入境签证类型" size="small">公务/旅游/记者等 — 待对接签证字段</Card>
        </Col>
        <Col span={6}>
          <Card title="人员类别" size="small">业务标签统计排名 — 待对接 map-stats</Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
