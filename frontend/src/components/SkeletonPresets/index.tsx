import { type FC } from 'react';
import { Skeleton, Row, Col, Card } from 'antd';
import './index.css';

/** 通用：标题行 + 网格卡片骨架（人员列表、重点人员、模型管理卡片区） */
export const PageCardGridSkeleton: FC<{ title?: boolean; count?: number }> = ({
  title = true,
  count = 8,
}) => (
  <div className="skeleton-preset page-card-grid-skeleton">
    {title && (
      <div className="skeleton-title-row">
        <Skeleton.Input active size="large" className="skeleton-title" />
      </div>
    )}
    <Row gutter={[16, 16]}>
      {Array.from({ length: count }).map((_, i) => (
        <Col xs={24} sm={12} md={8} lg={6} key={i}>
          <Card className="skeleton-card">
            <div className="skeleton-card-inner">
              <Skeleton.Avatar active size={48} shape="circle" />
              <div className="skeleton-card-body">
                <Skeleton.Input active size="small" block className="skeleton-line-name" />
                <Skeleton.Input active size="small" block className="skeleton-line" />
                <Skeleton.Input active size="small" block className="skeleton-line short" />
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  </div>
);

/** 首页 Dashboard：顶部 4 指标卡 + 三栏面板 */
export const DashboardSkeleton: FC = () => (
  <div className="page-wrapper dashboard skeleton-preset dashboard-skeleton">
    <Row gutter={[16, 16]} className="dashboard-cards">
      {[1, 2, 3, 4].map((i) => (
        <Col xs={24} sm={12} lg={6} key={i}>
          <Card className="dashboard-card">
            <div className="dashboard-card-inner">
              <Skeleton.Avatar active size={40} shape="square" />
              <div>
                <Skeleton.Input active size="small" className="skeleton-stat-title" />
                <Skeleton.Input active size="small" className="skeleton-stat-value" />
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
    <div className="dashboard-main">
      <Row gutter={[16, 16]} style={{ flex: 1 }}>
        <Col xs={24} md={8}>
          <Card className="dashboard-panel">
            <Skeleton title paragraph={{ rows: 6 }} active />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="dashboard-panel">
            <Skeleton title paragraph={{ rows: 4 }} active />
            <Skeleton.Image active className="skeleton-map" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="dashboard-panel">
            <Skeleton title paragraph={{ rows: 6 }} active />
          </Card>
        </Col>
      </Row>
    </div>
  </div>
);

/** 详情页：头部 + 双栏（头像/左侧 + 信息块） */
export const PageDetailSkeleton: FC = () => (
  <div className="skeleton-preset page-detail-skeleton">
    <div className="skeleton-detail-header">
      <Skeleton.Button active size="small" />
      <Skeleton.Input active size="large" className="skeleton-detail-title" />
    </div>
    <Card className="skeleton-detail-card">
      <div className="skeleton-detail-body">
        <div className="skeleton-detail-left">
          <Skeleton.Avatar active size={120} shape="square" />
          <Skeleton paragraph={{ rows: 3 }} active />
        </div>
        <div className="skeleton-detail-right">
          <Skeleton paragraph={{ rows: 8 }} active />
        </div>
      </div>
    </Card>
  </div>
);

/** 列表页（新闻/简单列表）：标题 + 列表项骨架 */
export const PageListSkeleton: FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="skeleton-preset page-list-skeleton">
    <div className="skeleton-list-header">
      <Skeleton.Input active size="large" className="skeleton-title" />
      <Skeleton.Input active size="small" className="skeleton-desc" />
    </div>
    <div className="skeleton-list-search">
      <Skeleton.Input active block className="skeleton-search" />
    </div>
    <div className="skeleton-list-items">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <Skeleton.Input active size="small" className="skeleton-item-title" />
          <Skeleton.Input active size="small" block className="skeleton-item-desc" />
          <Skeleton.Input active size="small" className="skeleton-item-meta" />
        </div>
      ))}
    </div>
  </div>
);

/** 表单/配置页：卡片内表单骨架 */
export const FormCardSkeleton: FC = () => (
  <div className="skeleton-preset form-card-skeleton">
    <Card>
      <Skeleton title paragraph={{ rows: 2 }} active />
      <Skeleton.Input active block className="skeleton-field" />
      <Skeleton.Input active block className="skeleton-field" />
      <Skeleton.Input active block className="skeleton-field" />
      <Skeleton.Button active className="skeleton-btn" />
    </Card>
  </div>
);

/** 筛选区 + 卡片网格（人员档案列表整页） */
export const FilterAndGridSkeleton: FC = () => (
  <div className="skeleton-preset filter-and-grid-skeleton">
    <div className="skeleton-filter-row">
      <Skeleton.Input active size="small" className="skeleton-title" />
    </div>
    <div className="skeleton-filter-blocks">
      <Skeleton active paragraph={{ rows: 2 }} />
    </div>
    <div className="skeleton-divider" />
    <PageCardGridSkeleton title={false} count={8} />
  </div>
);

/** 侧栏 + 主内容网格（重点人员库） */
export const SidebarAndGridSkeleton: FC = () => (
  <div className="skeleton-preset sidebar-and-grid-skeleton">
    <div className="skeleton-sidebar">
      <Skeleton title paragraph={{ rows: 2 }} active />
      <Skeleton paragraph={{ rows: 8 }} active />
    </div>
    <div className="skeleton-main">
      <Skeleton.Input active size="default" className="skeleton-main-title" />
      <PageCardGridSkeleton title={false} count={6} />
    </div>
  </div>
);

/** 表格区域骨架 */
export const TableSkeleton: FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="skeleton-preset table-skeleton">
    <Skeleton title paragraph={{ rows: 0 }} active />
    <table className="skeleton-table">
      <thead>
        <tr>
          {[1, 2, 3, 4].map((i) => (
            <th key={i}><Skeleton.Input active size="small" /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i}>
            {[1, 2, 3, 4].map((j) => (
              <td key={j}><Skeleton.Input active size="small" /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/** 文章/详情骨架（新闻详情） */
export const ArticleSkeleton: FC = () => (
  <div className="skeleton-preset article-skeleton">
    <Skeleton title paragraph={{ rows: 1 }} active />
    <Skeleton paragraph={{ rows: 2 }} active />
    <Skeleton paragraph={{ rows: 10 }} active />
  </div>
);

/** 文档预览/OnlyOffice 区域骨架 */
export const ViewerSkeleton: FC = () => (
  <div className="skeleton-preset viewer-skeleton">
    <Skeleton.Node active className="skeleton-viewer-block">
      <span>文档加载中</span>
    </Skeleton.Node>
  </div>
);

/** 小型内联骨架（标签加载、侧栏加载等） */
export const InlineSkeleton: FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="skeleton-preset inline-skeleton">
    <Skeleton active paragraph={{ rows: lines }} />
  </div>
);

/** 工作区导入详情：双列（左侧文档/表格 + 右侧提取结果卡片列表） */
export const ImportDetailSkeleton: FC = () => (
  <div className="skeleton-preset import-detail-skeleton">
    <div className="import-detail-skeleton-toolbar">
      <Skeleton.Button active size="small" />
      <Skeleton.Input active size="small" className="import-detail-skeleton-title" />
    </div>
    <Row gutter={16} className="import-detail-skeleton-content">
      <Col xs={24} lg={12}>
        <Card size="small" className="import-detail-skeleton-card">
          <Skeleton title paragraph={{ rows: 0 }} active />
          <TableSkeleton rows={6} />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card size="small" className="import-detail-skeleton-card">
          <Skeleton title paragraph={{ rows: 0 }} active />
          <div className="import-detail-skeleton-results">
            {[1, 2, 3].map((i) => (
              <div key={i} className="import-detail-skeleton-result-card">
                <Skeleton.Avatar active size={40} shape="circle" />
                <div className="import-detail-skeleton-result-body">
                  <Skeleton.Input active size="small" block />
                  <Skeleton.Input active size="small" block className="short" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Col>
    </Row>
  </div>
);

/** 省份详情：返回按钮 + 统计卡片 + 排名列表 + 地图区 */
export const ProvinceDetailSkeleton: FC = () => (
  <div className="skeleton-preset province-detail-skeleton">
    <div className="province-detail-skeleton-header">
      <Skeleton.Button active size="small" />
    </div>
    <Row gutter={16} className="province-detail-skeleton-body">
      <Col xs={24} lg={14}>
        <Card className="province-detail-skeleton-card">
          <Skeleton title paragraph={{ rows: 0 }} active />
          <Row gutter={16}>
            <Col span={12}><Skeleton.Input active size="small" /></Col>
            <Col span={12}><Skeleton.Input active size="small" /></Col>
          </Row>
        </Card>
        <Row gutter={16} className="province-detail-skeleton-ranks">
          {[1, 2, 3, 4].map((i) => (
            <Col xs={24} md={12} key={i}>
              <Card size="small" className="province-detail-skeleton-rank-card">
                <Skeleton title paragraph={{ rows: 4 }} active />
              </Card>
            </Col>
          ))}
        </Row>
      </Col>
      <Col xs={24} lg={10}>
        <Card size="small" className="province-detail-skeleton-map-card">
          <Skeleton title paragraph={{ rows: 0 }} active />
          <Skeleton.Node active className="province-detail-skeleton-map">
            <span>地图加载中</span>
          </Skeleton.Node>
        </Card>
      </Col>
    </Row>
  </div>
);

/** 头部用户区加载骨架（会话恢复时） */
export const HeaderUserSkeleton: FC = () => (
  <div className="skeleton-preset header-user-skeleton">
    <Skeleton.Avatar active size="small" shape="circle" />
    <Skeleton.Input active size="small" className="header-user-skeleton-name" />
  </div>
);
