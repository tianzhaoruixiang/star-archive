# 快速启动指南

## 1. 环境准备
确保已安装以下工具:
- JDK 21
- Maven 3.8+
- Node.js 18+
- Docker & Docker Compose
- MySQL客户端(用于连接Doris)

## 2. 启动步骤

### Step 1: 启动数据库
```bash
# 进入docker目录
cd docker

# 启动Doris
docker-compose up -d

# 等待约30秒让Doris完全启动
# 查看启动日志
docker-compose logs -f doris-fe
```

### Step 2: 初始化数据库
```bash
# 连接Doris并执行初始化脚本
mysql -h 127.0.0.1 -P 9030 -u root < init-db/01-init-schema.sql

# 验证数据库是否创建成功
mysql -h 127.0.0.1 -P 9030 -u root -e "USE person_monitor; SHOW TABLES;"
```

### Step 3: 启动后端
```bash
# 打开新终端,进入backend目录
cd backend

# 安装依赖并启动
mvn clean install
mvn spring-boot:run

# 看到 "Started Application" 表示启动成功
```

### Step 4: 启动前端
```bash
# 打开新终端,进入frontend目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 看到 "Local: http://localhost:5173" 表示启动成功
```

### Step 5: 访问系统
打开浏览器访问: http://localhost:5173

默认登录账号:
- 用户名: admin
- 密码: admin123

## 3. 验证功能
1. 登录系统
2. 查看首页统计(如果数据库为空,统计值为0)
3. 进入人员档案页面(如果数据库为空,显示"暂无数据")

## 4. 插入测试数据(可选)
```sql
-- 连接数据库
mysql -h 127.0.0.1 -P 9030 -u root

USE person_monitor;

-- 插入测试人员数据
INSERT INTO person (
    person_id, chinese_name, original_name, gender, 
    birth_date, nationality, is_key_person, 
    created_time, updated_time
) VALUES (
    'test-person-001', 
    '张三', 
    'Zhang San', 
    '男',
    '1990-01-01 00:00:00',
    '中国',
    true,
    NOW(),
    NOW()
);

-- 插入测试标签数据
INSERT INTO tag (tag_id, first_level_name, tag_name) 
VALUES (1, '基本属性', '重点关注');
```

## 5. 常见问题

### 数据库连接失败
- 确认Docker容器正在运行: `docker ps`
- 确认端口9030未被占用: `netstat -an | grep 9030`
- 等待更长时间让Doris完全启动

### 后端启动失败
- 检查JDK版本: `java -version` (必须是21+)
- 检查8080端口是否被占用
- 查看错误日志

### 前端启动失败
- 检查Node版本: `node -v` (建议18+)
- 删除node_modules后重新安装: `rm -rf node_modules && npm install`
- 检查5173端口是否被占用

### 页面显示"暂无数据"
- 正常现象,需要插入测试数据或导入真实数据

## 6. 停止服务

### 停止前端
在前端终端按 `Ctrl+C`

### 停止后端
在后端终端按 `Ctrl+C`

### 停止数据库
```bash
cd docker
docker-compose down
```

## 7. 重新启动
直接执行Step 1, Step 3, Step 4即可,不需要重复Step 2初始化数据库。
