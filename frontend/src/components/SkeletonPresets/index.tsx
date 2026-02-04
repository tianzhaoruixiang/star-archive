import { type FC } from 'react';
import './index.css';

/** 轻量加载占位：仅文字，无动画，低 GPU 占用 */
const LoadingPlaceholder: FC<{ text?: string; className?: string; minHeight?: number }> = ({
  text = '加载中...',
  className = '',
  minHeight = 120,
}) => (
  <div className={`loading-placeholder ${className}`.trim()} style={{ minHeight }}>
    <span className="loading-placeholder-text">{text}</span>
  </div>
);

/** 通用：标题行 + 网格卡片加载（人员列表、重点人员、模型管理卡片区） */
export const PageCardGridSkeleton: FC<{ title?: boolean; count?: number }> = () => (
  <LoadingPlaceholder minHeight={200} />
);

/** 首页 Dashboard：整页加载 */
export const DashboardSkeleton: FC = () => (
  <div className="page-wrapper dashboard">
    <LoadingPlaceholder minHeight={360} />
  </div>
);

/** 详情页：整页加载 */
export const PageDetailSkeleton: FC = () => <LoadingPlaceholder minHeight={320} />;

/** 列表页（新闻/简单列表） */
export const PageListSkeleton: FC<{ rows?: number }> = () => <LoadingPlaceholder minHeight={240} />;

/** 表单/配置页加载 */
export const FormCardSkeleton: FC = () => <LoadingPlaceholder minHeight={200} />;

/** 筛选区 + 卡片网格 */
export const FilterAndGridSkeleton: FC = () => <LoadingPlaceholder minHeight={280} />;

/** 侧栏 + 主内容网格 */
export const SidebarAndGridSkeleton: FC = () => <LoadingPlaceholder minHeight={280} />;

/** 表格区域加载 */
export const TableSkeleton: FC<{ rows?: number }> = () => <LoadingPlaceholder minHeight={180} />;

/** 文章/详情加载 */
export const ArticleSkeleton: FC = () => <LoadingPlaceholder minHeight={200} />;

/** 文档预览区域加载 */
export const ViewerSkeleton: FC = () => (
  <LoadingPlaceholder text="文档加载中" className="loading-placeholder-viewer" minHeight={400} />
);

/** 小型内联加载（标签、侧栏等） */
export const InlineSkeleton: FC<{ lines?: number }> = () => (
  <LoadingPlaceholder minHeight={60} />
);

/** 工作区导入详情加载 */
export const ImportDetailSkeleton: FC = () => <LoadingPlaceholder minHeight={320} />;

/** 省份详情加载 */
export const ProvinceDetailSkeleton: FC = () => <LoadingPlaceholder minHeight={320} />;

/** 头部用户区加载 */
export const HeaderUserSkeleton: FC = () => (
  <LoadingPlaceholder text="加载中" className="loading-placeholder-inline" minHeight={32} />
);
