# Docker Compose 部署文件

本目录集中存放所有 Docker Compose 部署配置。

## 文件说明

| 文件 | 用途 |
|------|------|
| `docker-compose.yml` | Apache Doris（FE/BE）数据库 |
| `docker-compose-onlyoffice.yml` | OnlyOffice 文档服务（在线预览/编辑） |
| `docker-compose-seaweedfs.yml` | SeaweedFS 分布式文件存储 |

## 使用方式

在项目根目录 `d:\chaoyang` 下执行：

```powershell
# OnlyOffice
docker compose -f docker-compose/docker-compose-onlyoffice.yml up -d

# SeaweedFS
docker compose -f docker-compose/docker-compose-seaweedfs.yml up -d

# Doris
docker compose -f docker-compose/docker-compose.yml up -d
```

也可使用项目根目录下的启动脚本：`start_onlyoffice.ps1`、`start_seaweedfs.ps1`。
