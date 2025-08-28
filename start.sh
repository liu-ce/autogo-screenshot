#!/bin/bash

# ADB截图工具启动脚本

echo "=== ADB截图工具启动脚本 ==="

# 检查是否安装了Go
if ! command -v go &> /dev/null; then
    echo "错误: 未找到Go环境，请先安装Go"
    exit 1
fi

# 检查是否安装了ADB
if ! command -v adb &> /dev/null; then
    echo "错误: 未找到ADB工具，请先安装Android SDK或ADB"
    exit 1
fi

# 进入后端目录
cd backend

echo "正在编译后端服务..."
go build -o screenshot-backend main.go

if [ $? -ne 0 ]; then
    echo "错误: 后端编译失败"
    exit 1
fi

echo "正在启动后端服务..."
echo "前端页面访问: http://localhost:8083"
echo "按 Ctrl+C 停止服务"
echo ""

./screenshot-backend
