import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store } from './store';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename="/littlesmall">
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: {
              colorPrimary: '#007aff',
              borderRadius: 10,
              colorBgContainer: '#ffffff',
              colorBorder: 'rgba(0, 0, 0, 0.08)',
              colorText: '#1d1d1f',
              colorTextPlaceholder: '#86868b',
            },
          }}
        >
          <App />
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
