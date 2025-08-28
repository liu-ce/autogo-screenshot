@echo off
REM ADB截图工具启动脚本 (Windows)

echo === ADB截图工具启动脚本 ===

REM 检查是否安装了Go
where go >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Go环境，请先安装Go
    pause
    exit /b 1
)

REM 检查是否安装了ADB
where adb >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到ADB工具，请先安装Android SDK或ADB
    pause
    exit /b 1
)

REM 进入后端目录
cd backend

echo 正在编译后端服务...
go build -o screenshot-backend.exe main.go

if %errorlevel% neq 0 (
    echo 错误: 后端编译失败
    pause
    exit /b 1
)

echo 正在启动后端服务...
echo 前端页面访问: http://localhost:8083
echo 按 Ctrl+C 停止服务
echo.

screenshot-backend.exe
pause
