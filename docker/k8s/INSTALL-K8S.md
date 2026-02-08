# 在本机安装 Kubernetes

当前机器为 **Linux (aarch64)**，已安装 Docker。任选其一即可。

---

## 方式一：Minikube（推荐，与现有 Docker 共用）

### 一键脚本（需能访问 GitHub / 外网）

```bash
cd /home/administrator/code/star-archive/docker/k8s
./install-k8s-minikube.sh
```

脚本会：安装 Minikube、安装 kubectl（若未安装）、启动集群、启用 Ingress。

### 手动安装（网络较慢时可分步执行）

```bash
# 1. 下载 Minikube（按架构二选一）
ARCH=$(uname -m)
# x86_64:
curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
# aarch64/arm64:
curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-arm64
sudo install minikube-linux-arm64 /usr/local/bin/minikube

# 2. 安装 kubectl（若未安装）
# https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')/kubectl"
chmod +x kubectl
sudo install kubectl /usr/local/bin/kubectl

# 3. 启动集群（使用本机 Docker）
minikube start --driver=docker

# 4. 启用 Ingress（star-archive 的 k8s 清单会用到）
minikube addons enable ingress
```

### 验证

```bash
kubectl get nodes
minikube status
```

### 在 Minikube 中使用本机构建的镜像

Minikube 自带独立 Docker 环境，要让 `star-archive-backend:latest` 等被集群看到，有两种做法：

**A. 在 Minikube 的 Docker 里构建（推荐）**

```bash
eval $(minikube docker-env)
cd /home/administrator/code/star-archive/docker
docker build -t star-archive-backend:latest ../backend
docker build -t star-archive-frontend:latest ../frontend
# 然后 kubectl apply -f k8s/...
```

**B. 把本机镜像导入 Minikube**

```bash
minikube image load star-archive-backend:latest
minikube image load star-archive-frontend:latest
```

---

## 方式二：k3s（单二进制，适合资源紧张或快速体验）

k3s 自带 containerd 和 kubectl，无需单独装 Docker 跑 K8s（本机 Docker 仍可照常使用）。

```bash
# 安装 k3s（默认会安装 kubectl 到 /usr/local/bin）
curl -sfL https://get.k3s.io | sh -

# 使用 kubectl 需配置 kubeconfig
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
# 或复制到默认位置
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

kubectl get nodes
```

**Ingress：** k3s 默认带 Traefik。若 star-archive 的 Ingress 用的是 `ingressClassName: nginx`，可改为 `ingressClassName: traefik`，或为 k3s 安装 nginx-ingress。

---

## 部署 star-archive 到本机 K8s

1. 按上面任一种方式安装并启动集群，保证 `kubectl get nodes` 正常。
2. 若用 Minikube，先 `eval $(minikube docker-env)` 再在 `docker` 目录下构建 backend/frontend 镜像，或使用 `minikube image load`。
3. 按 [README.md](./README.md) 中的顺序执行：创建 ConfigMap、apply k8s 清单等。
4. Minikube 下访问：可先 `minikube service frontend -n star-archive --url` 获取前端 URL；或配置 Ingress 后 `minikube addons enable ingress` 已启用时，在 `/etc/hosts` 把 Ingress host 指到 `minikube ip`。

---

## 常用命令

| 操作       | Minikube                    | k3s        |
|------------|-----------------------------|------------|
| 停止       | `minikube stop`             | `sudo systemctl stop k3s` |
| 启动       | `minikube start`            | `sudo systemctl start k3s` |
| 集群 IP    | `minikube ip`               | `hostname -I \| awk '{print $1}'` |
| 使用本机镜像 | `eval $(minikube docker-env)` 后 build | 需推送到集群可见的 registry 或 import |
