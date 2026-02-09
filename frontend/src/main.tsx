import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store } from './store';
import App from './App';
import './index.css';

/** 深色简约主题 - 科技感 · 严肃化 */
const darkToken = {
  colorPrimary: '#22d3ee',
  colorPrimaryHover: '#06b6d4',
  colorPrimaryActive: '#0891b2',
  borderRadius: 8,
  colorBgContainer: '#151a21',
  colorBgElevated: '#1a1f28',
  colorBgLayout: '#0f1318',
  colorBorder: 'rgba(255, 255, 255, 0.06)',
  colorBorderSecondary: 'rgba(255, 255, 255, 0.04)',
  colorText: '#f1f5f9',
  colorTextSecondary: '#94a3b8',
  colorTextTertiary: '#64748b',
  colorTextPlaceholder: '#475569',
  colorFillTertiary: 'rgba(255, 255, 255, 0.04)',
  colorFillQuaternary: 'rgba(255, 255, 255, 0.02)',
  controlItemBgHover: 'rgba(34, 211, 238, 0.12)',
  controlItemBgActive: 'rgba(34, 211, 238, 0.18)',
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename="/littlesmall">
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: darkToken,
            components: {
              Card: {
                colorBgContainer: '#151a21',
                colorBorderSecondary: 'rgba(255, 255, 255, 0.04)',
              },
              Input: {
                colorBgContainer: '#1a1f28',
                colorBorder: 'rgba(255, 255, 255, 0.08)',
                activeBorderColor: '#22d3ee',
                hoverBorderColor: 'rgba(255, 255, 255, 0.12)',
              },
              Select: {
                colorBgContainer: '#1a1f28',
                colorBgElevated: '#1a1f28',
              },
              Table: {
                colorBgContainer: '#151a21',
                colorBorderSecondary: 'rgba(255, 255, 255, 0.04)',
              },
              Menu: {
                darkItemBg: 'transparent',
                darkItemSelectedBg: 'rgba(34, 211, 238, 0.12)',
                darkItemSelectedColor: '#22d3ee',
              },
              Button: {
                primaryColor: '#0b0e14',
              },
            },
          }}
        >
          <App />
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
