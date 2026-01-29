# Docker 环境使用说明

## 服务组成

- **Doris FE (Frontend)**: 端口 8030 (HTTP), 9030 (MySQL)
- **Doris BE (Backend)**: 端口 8040 (HTTP)
- **SeaweedFS Master**: 端口 9333 (HTTP), 19333 (gRPC)
- **SeaweedFS Volume**: 端口 8080 (HTTP)
- **SeaweedFS Filer**: 端口 8888 (HTTP), 18888 (gRPC)

## 启动服务

```bash
cd docker
docker-compose up -d
```

## 停止服务

```bash
docker-compose down
```

## 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f doris-fe
docker-compose logs -f doris-be
docker-compose logs -f seaweedfs-master
```

## 连接 Doris

### MySQL 客户端连接

```bash
mysql -h 127.0.0.1 -P 9030 -u root -p
```

默认密码为空，首次连接后建议修改密码。

### Doris Web UI

访问: http://localhost:8030

## 访问 SeaweedFS

### Filer Web UI

访问: http://localhost:8888

### Master Web UI

访问: http://localhost:9333

## 数据持久化

数据存储在以下目录：

- `./data/doris/fe/` - Doris FE 数据
- `./data/doris/be/` - Doris BE 数据
- `./data/seaweedfs/` - SeaweedFS 数据

## 数据库初始化

数据库初始化脚本位于 `./init-db/` 目录：

- `01-init-schema.sql` - 创建所有表和索引
- `02-init-data.sql` - 插入初始数据（标签体系、默认用户等）

首次启动后，需要手动执行初始化脚本：

```bash
# 连接到 Doris
mysql -h 127.0.0.1 -P 9030 -u root -p

# 执行初始化脚本
source /docker-entrypoint-initdb.d/01-init-schema.sql
source /docker-entrypoint-initdb.d/02-init-data.sql
```

或使用命令行直接执行：

```bash
mysql -h 127.0.0.1 -P 9030 -u root -p < init-db/01-init-schema.sql
mysql -h 127.0.0.1 -P 9030 -u root -p < init-db/02-init-data.sql
```

## 故障排查

### Doris BE 无法连接到 FE

检查 FE 是否已经完全启动：

```bash
docker-compose logs doris-fe
curl http://localhost:8030/api/bootstrap
```

### 数据目录权限问题

如果遇到权限问题，执行：

```bash
sudo chown -R 1000:1000 ./data
```

## 清理数据

如果需要完全清理并重新开始：

```bash
docker-compose down -v
rm -rf ./data
docker-compose up -d
```
