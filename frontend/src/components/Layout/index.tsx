import { useEffect, useState, useMemo } from 'react';
import { Layout as AntLayout, Menu, Dropdown, Avatar, Spin } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  UserOutlined,
  LogoutOutlined,
  RadarChartOutlined,
  FolderOutlined,
  AppstoreOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, restoreSession } from '@/store/slices/authSlice';
import { systemConfigAPI, setApiUsername, type SystemConfigDTO } from '@/services/api';
import './index.css';

const { Header, Content } = AntLayout;

const DEFAULT_APP_NAME = '重点人员档案监测系统';

/** 一级菜单项（无子菜单） */
const TOP_MENU_ENTRIES: { key: string; icon: React.ReactNode; label: string; configKey: keyof SystemConfigDTO }[] = [
  { key: '/dashboard', icon: <HomeOutlined />, label: '首页', configKey: 'navDashboard' },
  { key: '/persons', icon: <UserOutlined />, label: '人员档案', configKey: 'navPersons' },
  { key: '/key-person-library', icon: <FolderOutlined />, label: '重点人员', configKey: 'navKeyPersonLibrary' },
  { key: '/situation', icon: <RadarChartOutlined />, label: '态势感知', configKey: 'navSituation' },
  { key: '/system-config', icon: <SettingOutlined />, label: '系统配置', configKey: 'navSystemConfig' },
];

/** 工作区二级导航 */
const WORKSPACE_CHILDREN: { key: string; label: string; configKey: keyof SystemConfigDTO }[] = [
  { key: '/workspace/fusion', label: '档案融合', configKey: 'navWorkspace' },
  { key: '/workspace/tags', label: '标签管理', configKey: 'navWorkspace' },
  { key: '/workspace/data', label: '数据管理', configKey: 'navWorkspace' },
  { key: '/workspace/models', label: '模型管理', configKey: 'navModelManagement' },
];

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth?.user);
  const restoring = useAppSelector((state) => state.auth?.restoring);
  const restoreAttempted = useAppSelector((state) => state.auth?.restoreAttempted);
  const [systemConfig, setSystemConfig] = useState<SystemConfigDTO | null>(null);

  useEffect(() => {
    setApiUsername(user?.username ?? null);
  }, [user?.username]);

  useEffect(() => {
    if (user == null && !restoring && !restoreAttempted) {
      dispatch(restoreSession());
    }
  }, [dispatch, user, restoring, restoreAttempted]);

  useEffect(() => {
    if (restoreAttempted && !restoring && user == null) {
      navigate('/login', { replace: true });
    }
  }, [restoreAttempted, restoring, user, navigate]);

  useEffect(() => {
    const load = () => {
      systemConfigAPI
        .getPublicConfig()
        .then((res: unknown) => {
          const raw = res as { data?: SystemConfigDTO } | SystemConfigDTO;
          const data = raw && typeof raw === 'object' && 'data' in raw ? (raw as { data?: SystemConfigDTO }).data : (raw as SystemConfigDTO);
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
    const list: MenuProps['items'] = [];
    TOP_MENU_ENTRIES.forEach((item) => {
      if (item.key === '/system-config' && user?.role !== 'admin') return;
      const value = systemConfig?.[item.configKey];
      if (value === false) return;
      list.push({ key: item.key, icon: item.icon, label: item.label });
    });
    if (systemConfig?.navWorkspace !== false) {
      const children = WORKSPACE_CHILDREN.filter((c) => systemConfig?.[c.configKey] !== false).map((c) => ({ key: c.key, label: c.label }));
      if (children.length > 0) {
        const insertAt = list.findIndex((m) => (m as { key?: string })?.key === '/key-person-library') + 1;
        list.splice(insertAt > 0 ? insertAt : list.length, 0, {
          key: 'workspace',
          icon: <AppstoreOutlined />,
          label: '工作区',
          children,
        });
      }
    }
    return list;
  }, [systemConfig, user?.role]);

  const selectedKeys = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/workspace')) return [path.startsWith('/workspace/fusion') ? '/workspace/fusion' : path.startsWith('/workspace/tags') ? '/workspace/tags' : path.startsWith('/workspace/data') ? '/workspace/data' : path.startsWith('/workspace/models') ? '/workspace/models' : '/workspace/fusion'];
    const exact = menuItems?.find((m) => m && 'key' in m && m.key === path);
    if (exact && typeof exact.key === 'string') return [exact.key];
    const parent = menuItems?.find((m) => m && 'key' in m && typeof m.key === 'string' && path === m.key || (path.startsWith((m as { key: string }).key + '/')));
    if (parent && 'key' in parent && typeof parent.key === 'string') return [parent.key];
    return [path];
  }, [location.pathname, menuItems]);

  const [menuOpenKeys, setMenuOpenKeys] = useState<string[]>([]);

  const appName = systemConfig?.systemName?.trim() || DEFAULT_APP_NAME;
  const logoUrl = systemConfig?.systemLogoUrl?.trim();

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const displayName = user?.username ?? '';
  const displayRole = user?.role ?? '';

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div className="header-user-dropdown-info">
          <div className="header-user-dropdown-name">{displayName || '—'}</div>
          <div className="header-user-dropdown-role">{displayRole || '—'}</div>
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
            <img src="/littlesmall/logo.svg" alt="" className="logo-img" />
          )}
          <span className="logo-text">{appName}</span>
        </div>
        <Menu
          theme="light"
          mode="horizontal"
          selectedKeys={selectedKeys}
          openKeys={menuOpenKeys}
          onOpenChange={setMenuOpenKeys}
          triggerSubMenuAction="click"
          items={menuItems}
          onClick={handleMenuClick}
          className="menu"
        />
        <div className="user-section">
          {restoring ? (
            <Spin size="small" />
          ) : (
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={['click']}
              placement="bottomRight"
              overlayStyle={{ minWidth: 120, width: 140 }}
              overlayClassName="header-user-dropdown"
            >
              <div className="user-trigger">
                <Avatar
                  size="small"
                  className="user-avatar"
                  icon={<UserOutlined />}
                />
                <span className="username">{displayName || '未登录'}</span>
              </div>
            </Dropdown>
          )}
        </div>
      </Header>
      <Content
        className={location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/') ? 'content content--dashboard' : 'content'}
      >
        <Outlet />
      </Content>
    </AntLayout>
  );
};

export default Layout;
