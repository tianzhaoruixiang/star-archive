#!/usr/bin/env bash
# 使用默认构建器构建并启动（不走 buildx，拉取镜像会走 Docker 守护进程代理）
# 使用方式：./compose-build.sh  或  ./compose-build.sh up -d
set -e
cd "$(dirname "$0")"
export DOCKER_BUILDKIT=0
exec docker compose "$@"
