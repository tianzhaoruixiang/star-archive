#!/usr/bin/env bash
# 删除 Docker Buildx 插件（需 sudo）
# 执行：./remove-buildx.sh
set -e

# 若仍有 buildx，先删除 docker-container 类 builder（会删掉对应容器）
if docker buildx ls &>/dev/null; then
  for name in multiarch; do
    if docker buildx inspect "$name" &>/dev/null; then
      echo "移除 builder: $name"
      docker buildx rm "$name" 2>/dev/null || true
    fi
  done
  docker buildx use default 2>/dev/null || true
fi

PLUGIN_PATH="/usr/libexec/docker/cli-plugins/docker-buildx"
if [[ -f "$PLUGIN_PATH" ]]; then
  echo "移除 Buildx 插件: $PLUGIN_PATH"
  sudo rm -f "$PLUGIN_PATH"
  echo "已删除。之后 docker buildx 将不可用。"
else
  echo "未找到 $PLUGIN_PATH，可能已删除或安装位置不同。"
fi
