# 人员档案 - 实施指南

## 项目概述
本项目是一个全栈的人员档案,包含首页统计大屏、人员档案管理、态势感知等功能模块。

## 已完成功能(阶段一)

### 后端 (Spring Boot 3.3 + JDK 21)
1. **基础架构**
   - ✅ Maven项目配置 (pom.xml)
   - ✅ 应用配置 (application.yml)
   - ✅ 全局异常处理 (GlobalExceptionHandler)
   - ✅ 统一响应封装 (ApiResponse, PageResponse)
   - ✅ 跨域配置 (WebConfig)

2. **数据层**
   - ✅ Person (人物表)
   - ✅ PersonTravel (行程表)
   - ✅ PersonSocialDynamic (社交动态表)
   - ✅ News (新闻表)
   - ✅ Tag (标签表)
   - ✅ 对应的Repository接口

3. **服务层**
   - ✅ AuthService (认证服务 - 简化版)
   - ✅ DashboardService (首页统计服务)
   - ✅ PersonService (人员档案服务)

4. **控制层**
   - ✅ AuthController (登录/登出)
   - ✅ DashboardController (首页统计)
   - ✅ PersonController (人员档案查询)

5. **测试**
   - ✅ Service层单元测试
   - ✅ Controller层单元测试

### 前端 (React 18 + Vite + TypeScript)
1. **基础架构**
   - ✅ Vite项目配置
   - ✅ TypeScript配置
   - ✅ Redux Toolkit状态管理
   - ✅ React Router路由
   - ✅ Axios API封装

2. **核心组件**
   - ✅ Layout (导航栏布局)
   - ✅ Login (登录页面)
   - ✅ Dashboard (首页大屏)
   - ✅ PersonList (人员列表)
   - ✅ PersonDetail (人员详情)

3. **状态管理**
   - ✅ authSlice (认证状态)
   - ✅ dashboardSlice (首页统计状态)
   - ✅ personSlice (人员档案状态)

4. **API服务**
   - ✅ authAPI (认证接口)
   - ✅ dashboardAPI (统计接口)
   - ✅ personAPI (人员档案接口)

## API接口清单

### 认证模块
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/current` - 获取当前用户信息

### 首页大屏
- `GET /api/dashboard/statistics` - 获取首页统计数据

### 人员档案
- `GET /api/persons` - 分页查询人员列表
- `GET /api/persons/by-tag` - 根据标签查询人员
- `GET /api/persons/{personId}` - 获取人员详情
- `GET /api/persons/tags` - 获取标签树

## 数据库表结构
- `person` - 人物表
- `person_travel` - 人物行程表
- `person_social_dynamic` - 人物社交动态表
- `news` - 新闻表
- `tag` - 标签表
- `directory` - 目录表
- `uploaded_document` - 上传文档表
- `document_chunk` - 文档分块表
- `qa_history` - 问答历史表

## 待实现功能(后续阶段)

### 阶段二:完善首页大屏
- [ ] 集成ECharts中国地图
- [ ] 省份热度展示
- [ ] 省份下钻功能
- [ ] 机构分布统计卡片
- [ ] 活跃省份排名卡片
- [ ] 签证类型统计卡片
- [ ] 人员类别统计卡片

### 阶段三:完善人员档案
- [ ] 三级标签树实现
- [ ] 标签筛选功能
- [ ] 标签人数统计
- [ ] 多标签组合查询
- [ ] 教育经历与工作经历展示优化

### 阶段四:重点人员库
- [ ] 重点人员库目录管理
- [ ] 库内人员管理
- [ ] 批量导入/导出

### 阶段五:态势感知
- [ ] 新闻动态列表与搜索
- [ ] 社交动态列表与搜索
- [ ] 热点排行榜
- [ ] 词云生成
- [ ] 类别统计图表

### 阶段六:工作区
- [ ] 文件上传下载
- [ ] 目录管理
- [ ] 权限控制(公共区/个人区)
- [ ] 模型管理
- [ ] 档案融合(AI提取)

## 开发规范
- 后端遵循SOLID原则,分层架构
- 前端采用函数式组件+Hooks
- 使用TypeScript强类型约束
- 统一错误处理与日志记录
- 单元测试覆盖率 ≥ 80%

## 性能优化建议
1. 数据库查询优化(Doris索引)
2. 前端列表虚拟滚动
3. 图片懒加载
4. API响应缓存
5. 分页加载
