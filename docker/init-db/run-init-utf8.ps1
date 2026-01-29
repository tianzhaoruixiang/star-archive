# 在容器内以 UTF-8 执行 init SQL，避免 Windows 管道编码导致中文乱码
# 用法：在 docker 目录下执行 .\init-db\run-init-utf8.ps1
# 若仍乱码：请在编辑器中把 01/02 两个 sql 文件“另存为 UTF-8”后再执行本脚本

$ErrorActionPreference = "Stop"
$InitDir = $PSScriptRoot
$SchemaFile = Join-Path $InitDir "01-init-schema.sql"
$DataFile = Join-Path $InitDir "02-test-data.sql"

# 复制到 FE 容器并在容器内执行（由 Linux 读文件，避免 Windows 管道编码）
docker cp $SchemaFile archive-doris-fe:/tmp/01-init-schema.sql
docker cp $DataFile archive-doris-fe:/tmp/02-test-data.sql

Write-Host "Running 01-init-schema.sql..."
docker exec archive-doris-fe sh -c "mysql -h 127.0.0.1 -P 9030 -u root --default-character-set=utf8 < /tmp/01-init-schema.sql"
Write-Host "Running 02-test-data.sql..."
docker exec archive-doris-fe sh -c "mysql -h 127.0.0.1 -P 9030 -u root --default-character-set=utf8 < /tmp/02-test-data.sql"
Write-Host "Done."
exit 0
