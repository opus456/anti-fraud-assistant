@echo off
chcp 65001 >nul
title Anti-Fraud Assistant 停止器

echo ==========================================
echo     Anti-Fraud Assistant 停止脚本
echo ==========================================
echo.

:: 停止 Node 服务 (端口 3001)
echo [1/3] 停止 Node 服务...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001.*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Node 服务已停止
echo.

:: 停止 Python 服务 (端口 8000)
echo [2/3] 停止 Python 服务...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000.*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Python 服务已停止
echo.

:: 停止 Docker 容器
echo [3/3] 停止 Docker 容器...
docker compose down
echo [OK] Docker 容器已停止
echo.

echo ==========================================
echo     所有服务已停止！
echo ==========================================
echo.
pause
