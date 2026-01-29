@echo off
echo ========================================
echo 重点人员档案监测系统 - 一键启动脚本
echo ========================================
echo.

echo [1/4] 启动 Docker 服务...
cd docker
docker-compose up -d
if %errorlevel% neq 0 (
    echo Docker 启动失败，请检查 Docker 是否已安装并运行
    pause
    exit /b 1
)

echo.
echo [2/4] 等待 Doris 服务启动（约30秒）...
timeout /t 30 /nobreak

echo.
echo [3/4] 初始化数据库...
mysql -h 127.0.0.1 -P 9030 -u root < init-db/01-init-schema.sql
mysql -h 127.0.0.1 -P 9030 -u root < init-db/02-init-data.sql

echo.
echo [4/4] 启动提示...
echo 请在新的终端窗口中分别执行：
echo.
echo 后端启动命令：
echo   cd backend
echo   mvn spring-boot:run
echo.
echo 前端启动命令：
echo   cd frontend
echo   npm install
echo   npm run dev
echo.
echo ========================================
echo 服务地址：
echo 前端: http://localhost:5173
echo 后端: http://localhost:8081/api
echo Swagger: http://localhost:8081/api/swagger-ui.html
echo 默认账号: admin / admin123
echo ========================================
pause
