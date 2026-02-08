# 人员档案 - 后端

## 技术栈
- Spring Boot 3.3.0
- JDK 21
- Maven 3.8+
- Doris 4.0 (MySQL兼容)
- JPA + Hibernate

## 项目结构
```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/stararchive/personmonitor/
│   │   │   ├── common/           # 通用工具类
│   │   │   ├── config/           # 配置类
│   │   │   ├── controller/       # 控制器
│   │   │   ├── dto/              # 数据传输对象
│   │   │   ├── entity/           # 实体类
│   │   │   ├── repository/       # 数据访问层
│   │   │   ├── service/          # 业务逻辑层
│   │   │   └── Application.java  # 启动类
│   │   └── resources/
│   │       └── application.yml   # 配置文件
│   └── test/                     # 测试代码
├── pom.xml                       # Maven配置
└── README.md
```

## 启动步骤
1. 确保Doris数据库已启动并初始化
2. 配置 `application.yml` 中的数据库连接
3. 运行启动命令:
```bash
mvn clean install
mvn spring-boot:run
```

## API文档
启动后访问: http://localhost:8080/api

### 认证接口
- POST /api/auth/login - 用户登录
- POST /api/auth/logout - 用户登出
- GET /api/auth/current - 获取当前用户

### 首页接口
- GET /api/dashboard/statistics - 获取统计数据

### 人员接口
- GET /api/persons - 分页查询人员列表
- GET /api/persons/{id} - 获取人员详情
- GET /api/persons/tags - 获取标签树
- GET /api/persons/by-tag - 按标签查询人员

## 运行测试
```bash
mvn test
```

## 打包部署
```bash
mvn clean package -DskipTests
java -jar target/person-monitor-1.0.0.jar
```
