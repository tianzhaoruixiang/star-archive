# 重点人员档案监测系统 - 部署与启动指南

## 系统架构

- **前端**: React 18 + Vite + Ant Design + Redux Toolkit
- **后端**: Spring Boot 3.3 + JDK 21 + Spring Security + JWT
- **数据库**: Apache Doris 4.0
- **文件存储**: SeaweedFS
- **部署方式**: Docker Compose

## 环境要求

### 开发环境
- Node.js 18+
- JDK 21+
- Maven 3.8+
- Docker & Docker Compose

## 快速启动

### 1. 启动基础服务（Docker）

```bash
cd docker
docker-compose up -d
```

等待服务启动完成（约1-2分钟），可以通过以下命令查看状态：

```bash
docker-compose ps
```

### 2. 初始化数据库

连接到 Doris 并执行初始化脚本：

```bash
# 方式1：使用 MySQL 客户端
mysql -h 127.0.0.1 -P 9030 -u root -p < init-db/01-init-schema.sql
mysql -h 127.0.0.1 -P 9030 -u root -p < init-db/02-init-data.sql

# 方式2：进入容器执行
docker exec -it archive-doris-fe bash
mysql -h localhost -P 9030 -u root
source /docker-entrypoint-initdb.d/01-init-schema.sql
source /docker-entrypoint-initdb.d/02-init-data.sql
```

### 3. 启动后端服务

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

后端服务将在 `http://localhost:8081/api` 启动

访问 Swagger 文档: `http://localhost:8081/api/swagger-ui.html`

### 4. 启动前端服务

```bash
cd frontend
npm install
npm run dev
```

前端服务将在 `http://localhost:5173` 启动

## 默认账号

- 用户名: `admin`
- 密码: `admin123`

## 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Doris FE HTTP | 8030 | Doris 前端 Web UI |
| Doris FE MySQL | 9030 | Doris MySQL 协议端口 |
| Doris BE | 8040 | Doris 后端服务 |
| SeaweedFS Master | 9333 | SeaweedFS 主节点 |
| SeaweedFS Volume | 8080 | SeaweedFS 存储节点 |
| SeaweedFS Filer | 8888 | SeaweedFS 文件接口 |
| 后端 API | 8081 | Spring Boot 后端服务 |
| 前端 Web | 5173 | React 前端应用 |

## 开发调试

### 后端开发

1. 使用 IntelliJ IDEA 打开 `backend` 目录
2. 等待 Maven 依赖下载完成
3. 运行 `ArchiveApplication.java`

### 前端开发

1. 使用 VS Code 打开 `frontend` 目录
2. 安装推荐的扩展插件
3. 运行 `npm run dev`

### 热重载

- **后端**: Spring Boot DevTools 已配置，修改代码后自动重启
- **前端**: Vite HMR 已配置，修改代码后自动热更新

## 生产部署

### 1. 构建前端

```bash
cd frontend
npm run build
```

构建产物在 `frontend/dist` 目录

### 2. 构建后端

```bash
cd backend
mvn clean package -DskipTests
```

构建产物在 `backend/target/person-archive-backend-1.0.0.jar`

### 3. 生产环境配置

创建 `application-prod.yml` 配置生产环境参数：
- 数据库连接信息
- JWT 密钥
- SeaweedFS 地址
- 日志级别等

### 4. 启动生产服务

```bash
# 后端
java -jar -Dspring.profiles.active=prod backend/target/person-archive-backend-1.0.0.jar

# 前端（使用 Nginx）
# 将 frontend/dist 目录部署到 Nginx
```

## 故障排查

### 1. Doris 连接失败

检查 Doris 服务状态：
```bash
docker-compose logs doris-fe
curl http://localhost:8030/api/bootstrap
```

### 2. 前端跨域问题

确保后端 CORS 配置正确，已在 `CorsConfig.java` 中配置

### 3. 数据库表不存在

重新执行数据库初始化脚本

### 4. JWT Token 错误

检查 `application.yml` 中的 JWT 密钥配置

## 数据备份

### 备份 Doris 数据

```bash
# 导出数据
mysqldump -h 127.0.0.1 -P 9030 -u root archive > backup.sql

# 恢复数据
mysql -h 127.0.0.1 -P 9030 -u root archive < backup.sql
```

### 备份 SeaweedFS 文件

```bash
# 备份数据目录
tar -czf seaweedfs-backup.tar.gz docker/data/seaweedfs/
```

## 监控与日志

### 应用日志

- **后端日志**: `backend/logs/archive-backend.log`
- **前端日志**: 浏览器控制台

### Docker 日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f doris-fe
docker-compose logs -f seaweedfs-master
```

## 性能优化建议

1. **数据库索引**: 已在初始化脚本中创建，根据实际查询需求调整
2. **缓存策略**: 可以引入 Redis 缓存热点数据
3. **前端优化**: 已配置代码分割和懒加载
4. **后端优化**: 已配置 HikariCP 连接池

## 扩展开发

### 添加新的 Entity

1. 在 `backend/src/main/java/com/archive/entity/` 创建实体类
2. 在 `backend/src/main/java/com/archive/repository/` 创建 Repository
3. 在 `backend/src/main/java/com/archive/service/` 创建 Service
4. 在 `backend/src/main/java/com/archive/controller/` 创建 Controller

### 添加新的前端页面

1. 在 `frontend/src/pages/` 创建页面组件
2. 在 `frontend/src/router/index.tsx` 添加路由
3. 在 `frontend/src/services/` 创建 API 服务
4. 在 `frontend/src/store/slices/` 创建 Redux Slice

## 技术支持

如有问题，请查看：
- [项目 README](./README.md)
- [Docker 文档](./docker/README.md)
- [API 文档](http://localhost:8081/api/swagger-ui.html)
