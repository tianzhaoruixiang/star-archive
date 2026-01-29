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
          <Card title="中国地图(待实现)" style={{ minHeight: 600 }}>
            <div className="map-placeholder">
              地图组件占位 - 后续集成ECharts地图
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
