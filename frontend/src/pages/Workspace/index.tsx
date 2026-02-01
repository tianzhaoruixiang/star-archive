import { Card } from 'antd';
import { Outlet } from 'react-router-dom';
import './index.css';

/**
 * 工作区布局：档案融合、标签管理、数据管理、模型管理均为独立页面，
 * 页面内无相互跳转入口，仅通过顶部导航「工作区」下拉进入各页面。
 */
const WorkspaceLayout = () => {
  return (
    <div className="page-wrapper workspace-page">
      <div className="workspace-card">
        <Outlet />
      </div>
    </div>
  );
};

export default WorkspaceLayout;
