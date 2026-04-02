@echo off
chcp 65001 >nul
title Anti-Fraud Assistant 启动器

echo ==========================================
echo     Anti-Fraud Assistant 启动脚本
echo ==========================================
echo.

:: 检查 Docker 是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)

:: 启动数据库服务
echo [1/3] 启动 Docker 容器 (PostgreSQL + Redis)...
docker compose up -d
if errorlevel 1 (
    echo [错误] Docker 容器启动失败
    pause
    exit /b 1
)
echo [OK] Docker 容器已启动
echo.

:: 等待数据库就绪
echo 等待数据库就绪...
timeout /t 3 /nobreak >nul

:: 启动 Python 服务
echo [2/3] 启动 Python 服务 (端口 8000)...
start "Python Server" cmd /k "cd /d %~dp0server-python && conda activate fwwb && python run.py"
echo [OK] Python 服务启动中...
echo.

:: 等待 Python 服务启动
timeout /t 2 /nobreak >nul

:: 启动 Node 服务
echo [3/3] 启动 Node 服务 (端口 3001)...
start "Node Server" cmd /k "cd /d %~dp0server-node && npm run dev"
echo [OK] Node 服务启动中...
echo.

:: 启动前端
echo [3/3] 启动 Node 服务 (端口 3001)...
start "Fronted" cmd /k "cd /d %~dp0client-react && npm run dev"
echo [OK] Node 服务启动中...
echo.

echo ==========================================
echo     所有服务已启动！
echo ==========================================
echo.
echo 服务地址:
echo   - PostgreSQL: localhost:5432
echo   - Redis:      localhost:6379
echo   - Python API: http://localhost:8000
echo   - Node API:   http://localhost:3001
echo.
echo 提示: 关闭各个终端窗口即可停止对应服务
echo       运行 stop.bat 可一键停止所有服务
echo.
pause
