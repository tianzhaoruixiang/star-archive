# 人员档案 - Kubernetes 部署说明

由 `docker-compose.yml` 转换的 K8s 清单，命名空间：`star-archive`。

**本机尚未安装 K8s？** 请先看 [INSTALL-K8S.md](./INSTALL-K8S.md)（Minikube / k3s 安装步骤）。

## 前置条件

1. 已构建并可供集群使用的镜像：
   - `star-archive-backend:latest`
   - `star-archive-frontend:latest`
2. 若使用私有仓库，请先 `docker push` 并配置 `imagePullSecrets`。

## 部署顺序

在 `docker` 目录下执行（或先 `cd docker`）：

```bash
# 1. 创建命名空间与 PVC
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/pvc.yaml

# 2. 创建 Doris 初始化 SQL 的 ConfigMap（必须，否则 Job 无法挂载）
kubectl create configmap init-db --from-file=./init-db -n star-archive

# 3. 基础设施：Doris FE/BE、SeaweedFS、OnlyOffice
kubectl apply -f k8s/doris-fe.yaml
kubectl apply -f k8s/doris-be.yaml
kubectl apply -f k8s/seaweedfs-master.yaml
kubectl apply -f k8s/seaweedfs-volume.yaml
kubectl apply -f k8s/seaweedfs-filer.yaml
kubectl apply -f k8s/onlyoffice.yaml

# 4. 等待 Doris FE/BE 就绪后执行初始化 Job
kubectl apply -f k8s/doris-init-job.yaml
kubectl wait --for=condition=complete job/doris-init -n star-archive --timeout=300s

# 5. 应用与入口
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml   # 按需修改 host / ingressClassName
```

一键应用（不包含 ConfigMap，需先执行上面第 2 步）：

```bash
kubectl apply -f k8s/namespace.yaml -f k8s/pvc.yaml
kubectl apply -f k8s/doris-fe.yaml -f k8s/doris-be.yaml
kubectl apply -f k8s/seaweedfs-master.yaml -f k8s/seaweedfs-volume.yaml -f k8s/seaweedfs-filer.yaml
kubectl apply -f k8s/onlyoffice.yaml -f k8s/backend.yaml -f k8s/frontend.yaml -f k8s/ingress.yaml
```

## 服务与端口

| 服务           | ClusterIP 端口 | 说明           |
|----------------|----------------|----------------|
| doris-fe       | 9030 (MySQL)   | 后端数据源     |
| seaweedfs-filer| 8888           | 文件存储       |
| backend        | 8000           | 后端 API       |
| frontend       | 80             | 前端 + 代理 API |
| onlyoffice     | 80             | 文档预览       |

## 访问方式

- **Ingress**：修改 `k8s/ingress.yaml` 中的 `host`（如 `star-archive.example.com`），然后通过 `https://<host>/littlesmall/` 访问。
- **NodePort**（无 Ingress 时）：可为 frontend/backend 的 Service 添加 `type: NodePort`，通过 `<NodeIP>:<NodePort>` 访问。

## 与 docker-compose 的差异

- 固定 IP（compose 的 `ipv4_address`）改为 K8s 服务名 DNS（如 `doris-fe`、`backend`）。
- 日志、数据卷由 PVC 提供，需集群配置 StorageClass 或默认 PV 供给。
- Doris 初始化由一次性 Job 执行，依赖 ConfigMap `init-db`（从 `./init-db` 目录创建）。
- OnlyOffice 的 `ONLYOFFICE_DOCUMENT_SERVER_URL` 在浏览器端使用，若通过 Ingress 访问，需改为 Ingress 的 onlyoffice 对外地址（如 `https://onlyoffice.example.com`），并在前端/配置中统一。
