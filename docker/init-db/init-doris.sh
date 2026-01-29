#!/bin/sh
# Doris 启动后自动执行建表与测试数据脚本
set -e
FE_HOST="${DORIS_FE_HOST:-doris-fe}"
FE_PORT="${DORIS_FE_PORT:-9030}"
MYSQL_CMD="mysql -h $FE_HOST -P $FE_PORT -u root"
INIT_DIR="${INIT_DB_DIR:-/init-db}"

echo "Waiting for Doris FE at $FE_HOST:$FE_PORT..."
until $MYSQL_CMD -e 'SELECT 1' 2>/dev/null; do
  echo "  FE not ready, retry in 5s..."
  sleep 5
done
echo "Doris FE is ready."
echo "Waiting 15s for BE to register..."
sleep 15

echo "Running 01-init-schema.sql..."
$MYSQL_CMD < "$INIT_DIR/01-init-schema.sql"
echo "Running 02-test-data.sql..."
$MYSQL_CMD < "$INIT_DIR/02-test-data.sql"
echo "Doris init completed."
