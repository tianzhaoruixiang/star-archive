#!/usr/bin/env bash
# 构建 ARM64 + AMD64 多架构镜像（backend + frontend）
# 使用方式：
#   ./build-multiarch.sh              # 仅构建，产出 manifest 到本地（需 buildx）
#   ./build-multiarch.sh push         # 构建并推送到 registry（需设置 IMAGE_REGISTRY）
# 要求：Docker Buildx（Docker Desktop 已内置；其他环境见安装说明）
#   安装：https://docs.docker.com/build/install-buildx/
#   手动安装二进制：https://github.com/docker/buildx#manual-download
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
PLATFORMS="linux/amd64,linux/arm64"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-}"   # 例如 docker.io/myuser 或 ghcr.io/myorg

ensure_buildx() {
  if ! docker buildx version &>/dev/null; then
    echo "未检测到 Docker Buildx。请先安装："
    echo "  https://docs.docker.com/build/install-buildx/"
    exit 1
  fi
  local default_builder
  default_builder=$(docker buildx inspect default 2>/dev/null || true)
  if ! docker buildx inspect default 2>/dev/null | grep -q "linux/arm64\|Platforms:"; then
    echo "创建并使用支持多架构的 buildx builder..."
    docker buildx create --name multiarch --use --driver docker-container 2>/dev/null || true
    docker buildx use multiarch 2>/dev/null || true
  fi
}

build_backend() {
  echo "=== 构建 backend (${PLATFORMS}) ==="
  if [[ -n "$PUSH" && -n "$IMAGE_REGISTRY" ]]; then
    docker buildx build --push \
      --platform "$PLATFORMS" \
      -t "${IMAGE_REGISTRY}/star-archive-backend:latest" \
      -f ../backend/Dockerfile \
      ../backend
  else
    docker buildx build \
      --platform "$PLATFORMS" \
      -t star-archive-backend:latest \
      -f ../backend/Dockerfile \
      ../backend
  fi
}

build_frontend() {
  echo "=== 构建 frontend (${PLATFORMS}) ==="
  if [[ -n "$PUSH" && -n "$IMAGE_REGISTRY" ]]; then
    docker buildx build --push \
      --platform "$PLATFORMS" \
      -t "${IMAGE_REGISTRY}/star-archive-frontend:latest" \
      -f ../frontend/Dockerfile \
      ../frontend
  else
    docker buildx build \
      --platform "$PLATFORMS" \
      -t star-archive-frontend:latest \
      -f ../frontend/Dockerfile \
      ../frontend
  fi
}

PUSH=""
[[ "${1:-}" == "push" ]] && PUSH=1

ensure_buildx

# 未 push 时：构建双架构并留在 buildx 缓存（manifest list）；本机 docker-compose up 会使用当前架构。
# 若需镜像在本地可用，请先: docker buildx use default 且 builder 支持 multi-platform，再执行本脚本。
if [[ -n "$PUSH" ]]; then
  if [[ -z "$IMAGE_REGISTRY" ]]; then
    echo "push 模式需设置环境变量 IMAGE_REGISTRY，例如: IMAGE_REGISTRY=docker.io/myuser $0 push"
    exit 1
  fi
  build_backend
  build_frontend
  echo "已推送到 ${IMAGE_REGISTRY}/star-archive-{backend,frontend}:latest（amd64+arm64）"
  exit 0
fi

# 仅构建：先打双架构，再把当前平台 load 到本地以便 docker-compose up 使用
echo "构建 backend + frontend（linux/amd64, linux/arm64）..."
build_backend
build_frontend
CURRENT_PLATFORM="linux/$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')"
echo "将当前平台 (${CURRENT_PLATFORM}) 加载到本地 Docker..."
docker buildx build --load --platform "$CURRENT_PLATFORM" -t star-archive-backend:latest -f ../backend/Dockerfile ../backend
docker buildx build --load --platform "$CURRENT_PLATFORM" -t star-archive-frontend:latest -f ../frontend/Dockerfile ../frontend
echo "完成。双架构已构建；当前架构已加载。推送: IMAGE_REGISTRY=你的仓库 $0 push"
