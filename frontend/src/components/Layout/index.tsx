import { Layout as AntLayout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  UserOutlined,
  LogoutOutlined,
  RadarChartOutlined,
  FolderOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import './index.css';

const { Header, Content } = AntLayout;

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/dashboard', icon: <HomeOutlined />, label: '首页' },
    { key: '/persons', icon: <UserOutlined />, label: '人员档案' },
    { key: '/key-person-library', icon: <FolderOutlined />, label: '重点人员' },
    { key: '/workspace', icon: <AppstoreOutlined />, label: '工作区' },
    { key: '/situation', icon: <RadarChartOutlined />, label: '态势感知' },
  ];

  const handleMenuClick = (e: any) => {
    navigate(e.key);
  };

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <AntLayout className="layout">
      <Header className="header">
        <div className="logo">
          <span className="logo-icon">◆</span>
          <span>流感监测系统</span>
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[
            menuItems.find(
              (item) =>
                location.pathname === item.key || location.pathname.startsWith(`${item.key}/`)
            )?.key ?? location.pathname,
          ].filter(Boolean)}
          items={menuItems}
          onClick={handleMenuClick}
          className="menu"
        />
        <div className="user-section">
          <span className="username">KEY ADMIN-2024-001</span>
          <span className="logout-btn" onClick={handleLogout}>登出</span>
        </div>
      </Header>
      <Content className="content">
        <Outlet />
      </Content>
    </AntLayout>
  );
};

export default Layout;
