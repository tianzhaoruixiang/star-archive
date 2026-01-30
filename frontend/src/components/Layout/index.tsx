import { Layout as AntLayout, Menu, Dropdown, Avatar, Divider } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  UserOutlined,
  LogoutOutlined,
  RadarChartOutlined,
  FolderOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import './index.css';

const { Header, Content } = AntLayout;

const APP_NAME = '流感监测系统';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth?.user);

  const menuItems = [
    { key: '/dashboard', icon: <HomeOutlined />, label: '首页' },
    { key: '/persons', icon: <UserOutlined />, label: '人员档案' },
    { key: '/key-person-library', icon: <FolderOutlined />, label: '重点人员' },
    { key: '/workspace', icon: <AppstoreOutlined />, label: '工作区' },
    { key: '/model-management', icon: <RobotOutlined />, label: '模型管理' },
    { key: '/situation', icon: <RadarChartOutlined />, label: '态势感知' },
  ];

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const displayName = user?.username ?? 'KEY ADMIN-2024-001';
  const displayRole = user?.role ?? '系统管理员';

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div className="header-user-dropdown-info">
          <div className="header-user-dropdown-name">{displayName}</div>
          <div className="header-user-dropdown-role">{displayRole}</div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <AntLayout className="layout">
      <Header className="header">
        <div className="logo" onClick={() => navigate('/dashboard')}>
          <span className="logo-icon">
            <SafetyCertificateOutlined />
          </span>
          <span className="logo-text">{APP_NAME}</span>
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
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
            <div className="user-trigger">
              <Avatar
                size="small"
                className="user-avatar"
                icon={<UserOutlined />}
              />
              <span className="username">{displayName}</span>
            </div>
          </Dropdown>
          <span className="logout-btn" onClick={handleLogout}>
            登出
          </span>
        </div>
      </Header>
      <Content className="content">
        <Outlet />
      </Content>
    </AntLayout>
  );
};

export default Layout;
