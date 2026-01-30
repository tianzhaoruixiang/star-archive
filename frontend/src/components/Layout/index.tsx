import { useEffect, useState, useMemo } from 'react';
import { Layout as AntLayout, Menu, Dropdown, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  UserOutlined,
  LogoutOutlined,
  RadarChartOutlined,
  FolderOutlined,
  AppstoreOutlined,
  LineChartOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { systemConfigAPI, type SystemConfigDTO } from '@/services/api';
import './index.css';

const { Header, Content } = AntLayout;

const DEFAULT_APP_NAME = '重点人员档案监测系统';

const ALL_MENU_ENTRIES: { key: string; icon: React.ReactNode; label: string; configKey: keyof SystemConfigDTO }[] = [
  { key: '/dashboard', icon: <HomeOutlined />, label: '首页', configKey: 'navDashboard' },
  { key: '/persons', icon: <UserOutlined />, label: '人员档案', configKey: 'navPersons' },
  { key: '/key-person-library', icon: <FolderOutlined />, label: '重点人员', configKey: 'navKeyPersonLibrary' },
  { key: '/workspace', icon: <AppstoreOutlined />, label: '工作区', configKey: 'navWorkspace' },
  { key: '/model-management', icon: <RobotOutlined />, label: '模型管理', configKey: 'navModelManagement' },
  { key: '/situation', icon: <RadarChartOutlined />, label: '态势感知', configKey: 'navSituation' },
  { key: '/system-config', icon: <SettingOutlined />, label: '系统配置', configKey: 'navSystemConfig' },
];

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth?.user);
  const [systemConfig, setSystemConfig] = useState<SystemConfigDTO | null>(null);

  useEffect(() => {
    const load = () => {
      systemConfigAPI
        .getPublicConfig()
        .then((res: { data?: SystemConfigDTO }) => {
          const data = res?.data ?? res;
          setSystemConfig(data && typeof data === 'object' ? data : null);
        })
        .catch(() => setSystemConfig(null));
    };
    load();
    const handler = () => load();
    window.addEventListener('system-config-updated', handler);
    return () => window.removeEventListener('system-config-updated', handler);
  }, []);

  const menuItems = useMemo(() => {
    return ALL_MENU_ENTRIES.filter((item) => {
      const value = systemConfig?.[item.configKey];
      return value !== false;
    }).map(({ key, icon, label }) => ({ key, icon, label }));
  }, [systemConfig]);

  const appName = systemConfig?.systemName?.trim() || DEFAULT_APP_NAME;
  const logoUrl = systemConfig?.systemLogoUrl?.trim();

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
          {logoUrl ? (
            <img src={logoUrl} alt="" className="logo-img" />
          ) : (
            <span className="logo-icon">
              <LineChartOutlined />
            </span>
          )}
          <span className="logo-text">{appName}</span>
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
