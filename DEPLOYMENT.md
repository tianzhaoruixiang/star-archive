# 人员档案 - 部署指南

## 系统架构
- 前端: React 18 + Vite + TypeScript
- 后端: Spring Boot 3.3 + JDK 21
- 数据库: Doris 4.0 (兼容MySQL协议)
- 存储: SeaweedFS

## 前置要求
- JDK 21+
- Maven 3.8+
- Node.js 18+
- Docker & Docker Compose

## 快速启动

### 1. 启动数据库 (Doris)
```bash
cd docker
docker-compose up -d
```

等待Doris启动完成后,连接数据库并执行初始化脚本:
```bash
mysql -h 127.0.0.1 -P 9030 -u root < init-db/01-init-schema.sql
```

### 2. 启动后端服务
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

后端服务将在 `http://localhost:8080/api` 启动

### 3. 启动前端服务
```bash
cd frontend
npm install
npm run dev
```

前端服务将在 `http://localhost:5173` 启动

## 访问系统
- 前端地址: http://localhost:5173
- 后端API: http://localhost:8080/api
- 默认账号: admin / admin123

## 测试运行
### 后端测试
```bash
cd backend
mvn test
```

### 前端测试
```bash
cd frontend
npm run lint
```

## 生产环境部署
### 后端打包
```bash
cd backend
mvn clean package -DskipTests
java -jar target/person-monitor-1.0.0.jar
```

### 前端打包
```bash
cd frontend
npm run build
```

打包后的文件位于 `frontend/dist` 目录,可部署到Nginx等Web服务器。

## 环境配置
### 后端配置文件
- 开发环境: `backend/src/main/resources/application.yml`
- 生产环境: 通过 `application-prod.yml` 覆盖

### 前端配置
- 代理配置: `frontend/vite.config.ts`
- API地址: 通过环境变量 `VITE_API_BASE_URL` 配置

## 常见问题
1. **Doris连接失败**: 确认Docker容器已启动,端口9030未被占用
2. **前端请求跨域**: 检查后端WebConfig跨域配置
3. **JPA初始化错误**: 确保Doris数据库已创建并执行初始化脚本

## 数据库访问
```bash
# 使用MySQL客户端连接Doris
mysql -h 127.0.0.1 -P 9030 -u root

# 查看数据库
SHOW DATABASES;
USE person_monitor;
SHOW TABLES;
```

## 日志查看
- 后端日志: 控制台输出
- 前端日志: 浏览器开发者工具Console
- Docker日志: `docker-compose logs -f`
