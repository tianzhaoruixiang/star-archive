#!/bin/sh
set -e
# 挂载卷 ./data/logs:/app/logs 时目录可能为 root 所有，导致 UID 1000 无法写日志；启动前修复权限
if [ -d /app/logs ]; then
  chown -R 1000:1000 /app/logs 2>/dev/null || true
  chmod -R 775 /app/logs 2>/dev/null || true
fi
exec su-exec 1000:1000 java \
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -jar /app/app.jar \
  --spring.config.additional-location=file:/config/
