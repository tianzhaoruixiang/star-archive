#!/usr/bin/env bash
# 在 OnlyOffice 容器内请求文档 URL，用于排查「Download failed」。
# 用法: ./verify-onlyoffice-preview.sh "http://host.docker.internal:8000/littlesmall/api/workspace/archive-fusion/tasks/<taskId>/file"
# 文档地址可从前端预览弹窗提示或后端日志「OnlyOffice 预览配置」中复制。

set -e
URL="${1:?用法: $0 <文档完整URL>}"
CONTAINER="${ONLYOFFICE_CONTAINER:-archive-onlyoffice}"

echo "在容器 $CONTAINER 内请求: $URL"
docker exec "$CONTAINER" curl -sS -I -L --connect-timeout 5 "$URL" || true
