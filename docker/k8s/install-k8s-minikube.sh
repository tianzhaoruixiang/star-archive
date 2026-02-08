#!/usr/bin/env bash
# 在本机安装 Kubernetes（Minikube + kubectl）
# 要求：Docker 已安装且当前用户在 docker 组，或使用 sudo
set -e

ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  MINIKUBE_ARCH=amd64 ;;
  aarch64|arm64) MINIKUBE_ARCH=arm64 ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

echo "=== 1. 安装 Minikube (linux/$MINIKUBE_ARCH) ==="
curl -sLo /tmp/minikube "https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-${MINIKUBE_ARCH}"
chmod +x /tmp/minikube
sudo install /tmp/minikube /usr/local/bin/minikube
rm -f /tmp/minikube
minikube version

echo ""
echo "=== 2. 安装 kubectl（若未安装）==="
if command -v kubectl &>/dev/null; then
  echo "kubectl 已安装: $(kubectl version --client -o short 2>/dev/null || kubectl version --client)"
else
  KUBECTL_ARCH=amd64
  [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]] && KUBECTL_ARCH=arm64
  KUBECTL_VER=$(curl -sL https://dl.k8s.io/release/stable.txt)
  curl -sLo /tmp/kubectl "https://dl.k8s.io/release/${KUBECTL_VER}/bin/linux/${KUBECTL_ARCH}/kubectl"
  chmod +x /tmp/kubectl
  sudo install /tmp/kubectl /usr/local/bin/kubectl
  rm -f /tmp/kubectl
  echo "kubectl 已安装: $KUBECTL_VER"
fi

echo ""
echo "=== 3. 启动 Minikube 集群（driver=docker）==="
if minikube status 2>/dev/null | grep -q "Running"; then
  echo "Minikube 已在运行，跳过 start。"
else
  minikube start --driver=docker
fi

echo ""
echo "=== 4. 启用 Ingress 插件（供 star-archive 使用）==="
minikube addons enable ingress

echo ""
echo "=== 完成 ==="
echo "验证: kubectl get nodes"
echo "进入 Minikube 节点 Docker: eval \$(minikube docker-env)  # 之后 docker build 的镜像在集群内可见"
echo "停止集群: minikube stop"
echo "删除集群: minikube delete"
