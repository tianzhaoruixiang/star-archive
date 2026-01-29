# 系统部署验证清单

## 环境检查

### 必需软件
- [ ] Docker Desktop 已安装并运行
- [ ] JDK 21 已安装（运行 `java -version` 验证）
- [ ] Maven 3.8+ 已安装（运行 `mvn -version` 验证）
- [ ] Node.js 18+ 已安装（运行 `node -v` 验证）
- [ ] MySQL 客户端已安装（用于初始化数据库）

## Docker 服务检查

### 1. 启动 Docker 服务

```bash
cd docker
docker-compose up -d
```

### 2. 验证服务状态

```bash
docker-compose ps
```

期望输出：所有服务状态为 `Up`

### 3. 验证 Doris 连接

```bash
curl http://localhost:8030/api/bootstrap
```

期望输出：返回 JSON 数据

```bash
mysql -h 127.0.0.1 -P 9030 -u root -e "SHOW DATABASES;"
```

期望输出：显示数据库列表

### 4. 验证 SeaweedFS 连接

```bash
curl http://localhost:9333/dir/status
```

期望输出：返回 JSON 状态信息

## 数据库初始化检查

### 1. 执行初始化脚本

```bash
cd docker
mysql -h 127.0.0.1 -P 9030 -u root < init-db/01-init-schema.sql
mysql -h 127.0.0.1 -P 9030 -u root < init-db/02-init-data.sql
```

### 2. 验证表结构

```bash
mysql -h 127.0.0.1 -P 9030 -u root -e "USE archive; SHOW TABLES;"
```

期望输出：显示 16 张表

### 3. 验证初始数据

```bash
mysql -h 127.0.0.1 -P 9030 -u root -e "SELECT * FROM archive.user;"
```

期望输出：显示管理员用户

```bash
mysql -h 127.0.0.1 -P 9030 -u root -e "SELECT COUNT(*) FROM archive.tag;"
```

期望输出：显示标签数量（应该 > 50）

## 后端服务检查

### 1. 启动后端

```bash
cd backend
mvn spring-boot:run
```

### 2. 验证启动成功

查看控制台输出，应包含：
```
========================================
重点人员档案监测系统后端服务已启动
========================================
```

### 3. 验证 API 可访问

```bash
curl http://localhost:8081/api/v3/api-docs
```

期望输出：返回 OpenAPI 文档 JSON

### 4. 验证 Swagger UI

浏览器访问: http://localhost:8081/api/swagger-ui.html

期望：显示 Swagger API 文档页面

### 5. 测试登录接口

```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

期望输出：返回包含 token 的 JSON

## 前端服务检查

### 1. 安装依赖

```bash
cd frontend
npm install
```

期望：依赖安装成功，无错误

### 2. 启动前端

```bash
npm run dev
```

### 3. 验证启动成功

查看控制台输出，应包含：
```
VITE v5.x.x  ready in xxx ms
Local:   http://localhost:5173/
```

### 4. 访问前端

浏览器访问: http://localhost:5173

期望：显示登录页面

### 5. 测试登录功能

1. 输入用户名: `admin`
2. 输入密码: `admin123`
3. 点击登录

期望：成功登录并跳转到首页大屏

## 功能验证

### 1. 登录流程
- [ ] 访问登录页 http://localhost:5173/login
- [ ] 输入账号密码并登录
- [ ] 成功跳转到首页
- [ ] 导航栏显示用户名

### 2. 首页大屏
- [ ] 显示统计卡片（监测人员数、重点人员数等）
- [ ] 数据正常加载

### 3. 人员档案
- [ ] 点击导航栏"人员档案"
- [ ] 显示人员列表（可能为空）
- [ ] 分页组件正常工作

### 4. 其他模块
- [ ] 重点人员库页面可访问
- [ ] 态势感知页面可访问
- [ ] 工作区页面可访问

### 5. 登出功能
- [ ] 点击用户头像下拉菜单
- [ ] 点击"退出登录"
- [ ] 成功跳转到登录页

## 常见问题

### Docker 服务启动失败
- 检查 Docker Desktop 是否运行
- 检查端口是否被占用
- 查看日志: `docker-compose logs`

### 数据库连接失败
- 确认 Doris 已完全启动（需要约30秒）
- 检查 9030 端口是否开放
- 查看 Doris FE 日志

### 后端启动失败
- 检查 JDK 版本是否为 21
- 确认数据库已初始化
- 查看后端日志输出

### 前端启动失败
- 检查 Node.js 版本
- 删除 `node_modules` 重新安装
- 检查 5173 端口是否被占用

### 登录失败
- 确认数据库有初始用户数据
- 检查后端日志中的错误信息
- 验证 JWT 配置正确

## 下一步

全部检查通过后，系统已可正常使用。可以开始：
1. 添加测试数据
2. 开发剩余功能模块
3. 完善UI界面
4. 进行性能优化

## 技术支持

如遇到问题，请查看：
- [部署指南](./DEPLOYMENT.md)
- [项目总结](./PROJECT_SUMMARY.md)
- [Docker 文档](./docker/README.md)
- [后端文档](./backend/README.md)
- [前端文档](./frontend/README.md)
