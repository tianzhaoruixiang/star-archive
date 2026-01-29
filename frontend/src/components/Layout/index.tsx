import { Layout as AntLayout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import './index.css';

const { Header, Content } = AntLayout;

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/persons',
      icon: <UserOutlined />,
      label: '人员档案',
    },
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
        <div className="logo">重点人员档案监测系统</div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="menu"
        />
        <div className="user-section">
          <span className="username">admin</span>
          <LogoutOutlined className="logout-icon" onClick={handleLogout} />
        </div>
      </Header>
      <Content className="content">
        <Outlet />
      </Content>
    </AntLayout>
  );
};

export default Layout;
