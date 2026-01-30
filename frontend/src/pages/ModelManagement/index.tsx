import { useState } from 'react';
import { Card, Row, Col, Button, Tag, message } from 'antd';
import {
  TagOutlined,
  BarChartOutlined,
  RobotOutlined,
  AppstoreOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import './index.css';

type ModelStatus = 'running' | 'paused';

interface ModelItem {
  id: string;
  name: string;
  status: ModelStatus;
  description: string;
  lockedCount: number;
  accuracy: string;
  updatedAt: string;
}

const MOCK_MODELS: ModelItem[] = [
  {
    id: '1',
    name: '高风险人群识别模型',
    status: 'running',
    description: '基于年龄、状态、到访记录等多维度特征识别高风险人群',
    lockedCount: 45,
    accuracy: '92.5%',
    updatedAt: '2024-01-15 10:30:00',
  },
  {
    id: '2',
    name: '密切接触者预测模型',
    status: 'paused',
    description: '通过航班、铁路记录预测密切接触者',
    lockedCount: 23,
    accuracy: '88.3%',
    updatedAt: '2024-01-14 15:20:00',
  },
];

const SUB_TABS = [
  { key: 'tag', icon: <TagOutlined />, label: '标签体系' },
  { key: 'data', icon: <BarChartOutlined />, label: '数据管理' },
  { key: 'model', icon: <RobotOutlined />, label: '模型管理' },
] as const;

const ModelManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'tag' | 'data' | 'model'>('model');
  const [models, setModels] = useState<ModelItem[]>(MOCK_MODELS);

  const handlePauseOrStart = (id: string, currentStatus: ModelStatus) => {
    setModels((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: currentStatus === 'running' ? 'paused' : 'running' } : m
      )
    );
    message.success(currentStatus === 'running' ? '已暂停' : '已启动');
  };

  const handleDelete = (id: string, name: string) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
    message.success(`已删除「${name}」`);
  };

  return (
    <div className="page-wrapper model-management-page">
      {/* 顶部子导航：标签体系 / 数据管理 / 模型管理 */}
      <div className="model-management-subnav">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`model-management-subnav-item ${activeSubTab === tab.key ? 'model-management-subnav-item-active' : ''}`}
            onClick={() => setActiveSubTab(tab.key)}
          >
            <span className="model-management-subnav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 标题与描述 */}
      <h1 className="page-title model-management-title">模型管理</h1>
      <p className="model-management-desc">
        通过建模的方式锁定关键人群，创建和管理预测模型
      </p>

      {/* 模型卡片列表 */}
      <Row gutter={[16, 16]} className="model-management-cards">
        {models.map((model) => (
          <Col xs={24} md={12} key={model.id}>
            <Card className="model-management-card">
              <div className="model-management-card-head">
                <span className="model-management-card-title">{model.name}</span>
                <Tag
                  className={`model-management-card-status model-management-card-status-${model.status}`}
                >
                  {model.status === 'running' ? '运行中' : '已暂停'}
                </Tag>
              </div>
              <p className="model-management-card-desc">{model.description}</p>
              <div className="model-management-card-metrics">
                <div className="model-management-card-metric">
                  <span className="model-management-card-metric-label">锁定人数:</span>
                  <span className="model-management-card-metric-value">{model.lockedCount}</span>
                </div>
                <div className="model-management-card-metric">
                  <span className="model-management-card-metric-label">准确率:</span>
                  <span className="model-management-card-metric-value">{model.accuracy}</span>
                </div>
                <div className="model-management-card-metric">
                  <span className="model-management-card-metric-label">更新时间:</span>
                  <span className="model-management-card-metric-value">{model.updatedAt}</span>
                </div>
              </div>
              <div className="model-management-card-actions">
                <Button type="default" size="small" className="model-management-card-btn">
                  查看规则
                </Button>
                <Button type="default" size="small" className="model-management-card-btn">
                  编辑规则
                </Button>
                <Button
                  type="default"
                  size="small"
                  className="model-management-card-btn"
                  onClick={() => handlePauseOrStart(model.id, model.status)}
                >
                  {model.status === 'running' ? '暂停' : '启动'}
                </Button>
                <Button
                  type="primary"
                  size="small"
                  danger
                  className="model-management-card-btn-delete"
                  onClick={() => handleDelete(model.id, model.name)}
                >
                  删除
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 创建新模型 */}
      <div className="model-management-create-wrap">
        <Button type="primary" size="large" className="model-management-create-btn">
          + 创建新模型
        </Button>
      </div>

      {/* 右侧悬浮图标 */}
      <div className="model-management-float-btns">
        <button type="button" className="model-management-float-btn" title="网格">
          <AppstoreOutlined />
        </button>
        <button type="button" className="model-management-float-btn" title="刷新">
          <SyncOutlined />
        </button>
      </div>
    </div>
  );
};

export default ModelManagement;
