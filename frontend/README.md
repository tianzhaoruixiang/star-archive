# 人员档案 - 前端

## 技术栈
- React 18
- TypeScript
- Vite
- Redux Toolkit
- React Router v6
- Ant Design 5
- Axios
- ECharts

## 项目结构
```
frontend/
├── src/
│   ├── components/        # 公共组件
│   │   └── Layout/       # 布局组件
│   ├── pages/            # 页面组件
│   │   ├── Login/        # 登录页
│   │   ├── Dashboard/    # 首页大屏
│   │   ├── PersonList/   # 人员列表
│   │   └── PersonDetail/ # 人员详情
│   ├── store/            # Redux状态管理
│   │   └── slices/       # 状态切片
│   ├── services/         # API服务
│   ├── App.tsx           # 根组件
│   └── main.tsx          # 入口文件
├── index.html
├── vite.config.ts        # Vite配置
├── tsconfig.json         # TypeScript配置
└── package.json
```

## 启动步骤
1. 安装依赖:
```bash
npm install
```

2. 启动开发服务器:
```bash
npm run dev
```

3. 访问: http://localhost:5173

## 环境配置
- 开发环境: vite.config.ts 中配置代理
- 生产环境: 通过环境变量配置API地址

## 构建部署
```bash
npm run build
```
构建产物在 `dist/` 目录

## 代码检查
```bash
npm run lint
```

## 主要功能页面
- `/login` - 登录页
- `/dashboard` - 首页统计大屏
- `/persons` - 人员档案列表
- `/persons/:id` - 人员详情页

## 状态管理
使用Redux Toolkit管理全局状态:
- authSlice - 认证状态
- dashboardSlice - 首页统计状态
- personSlice - 人员档案状态
