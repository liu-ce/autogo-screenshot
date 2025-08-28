# ADB截图工具

一个基于Go语言的Android设备截图工具，支持前后端分离部署。

## 功能特性

- 🔧 自动检测连接的Android设备
- 📱 一键截图
- ✂️ 区域选择和裁剪
- 🎨 多点取色功能
- 🔍 像素级放大镜
- 💾 支持PNG/JPG格式导出
- 📋 坐标复制功能
- 🎯 批量多点取色和代码生成

## 项目结构

```
autogo-screenshot/
├── backend/                 # 后端API服务
│   ├── main.go             # 后端主程序
│   └── go.mod              # Go模块文件
├── frontend/               # 前端静态文件
│   ├── index.html          # 主页面
│   └── app.js              # 前端JavaScript
├── start.sh                # Linux/macOS启动脚本
├── start.bat               # Windows启动脚本
├── web_main.go             # 原始单体应用（保留参考）
├── go.mod                  # 原始Go模块文件
└── README.md               # 说明文档
```

## 系统要求

- Go 1.21 或更高版本
- ADB (Android Debug Bridge)
- 已连接并启用USB调试的Android设备

## 安装和使用

### 方法1：使用启动脚本（推荐）

#### Linux/macOS
```bash
./start.sh
```

#### Windows
```batch
start.bat
```

### 方法2：手动启动

1. **编译并启动后端服务**
```bash
cd backend
go build -o screenshot-backend main.go
./screenshot-backend
```

2. **访问前端页面**
打开浏览器访问：http://localhost:8083

## 使用说明

1. **连接设备**
   - 通过USB连接Android设备
   - 确保已启用USB调试
   - 点击"刷新设备"按钮检测设备

2. **截图操作**
   - 选择目标设备
   - 选择截图方式：
     - "ADB截图"：通过ADB命令直接获取截图
     - "节点助手截图"：通过HTTP接口从节点助手获取截图
   - 等待截图完成

3. **区域选择**
   - 在截图上拖拽选择需要的区域
   - 坐标信息会实时显示在右侧面板

4. **取色功能**
   - 点击"启用取色模式"
   - 选择取色框
   - 点击图片上的点获取颜色

5. **多点取色**
   - 点击"多点取色模式"
   - 在图片上点击多个点
   - 点击"生成代码"获取Go代码

6. **保存图片**
   - 设置文件名和格式
   - 点击"保存并下载"

## 配置说明

### 修改端口
在 `backend/main.go` 中修改端口：
```go
log.Fatal(http.ListenAndServe(":8083", nil))
```

### 修改API地址
在 `frontend/app.js` 中修改API地址：
```javascript
const API_BASE = 'http://localhost:8083';
```

## 开发说明

### 后端API接口

- `GET /api/devices` - 获取设备列表
- `POST /api/screenshot` - 执行ADB截图
- `POST /api/node-screenshot` - 执行节点助手截图
- `POST /api/save` - 保存裁剪后的图片

### 节点助手配置

节点助手截图功能需要在 `localhost:8801` 运行节点助手服务，API格式：
```
http://localhost:8801/screen.png?device={设备ID}
```

### 前端功能模块

- 设备管理
- 截图显示
- 区域选择
- 取色工具
- 多点取色
- 文件保存

## 故障排除

### 常见问题

1. **找不到设备**
   - 检查USB连接
   - 确认已启用USB调试
   - 运行 `adb devices` 检查连接状态

2. **截图失败**
   - 确认设备已授权ADB访问
   - 检查设备屏幕是否锁定

3. **编译失败**
   - 检查Go版本是否符合要求
   - 确认网络连接正常（用于下载依赖）

4. **前端无法访问后端**
   - 检查后端服务是否正常启动
   - 确认端口8083未被占用
   - 检查防火墙设置

### ADB常用命令

```bash
# 检查连接的设备
adb devices

# 重启ADB服务
adb kill-server
adb start-server

# 手动截图（测试用）
adb exec-out screencap -p > screenshot.png
```

## 许可证

本项目采用MIT许可证。

## 更新日志

### v2.0.0
- ✨ 前后端分离架构
- 🔧 支持独立部署
- 📦 优化项目结构
- 🚀 添加启动脚本

### v1.0.0
- 🎉 初始版本
- 🔧 基本截图功能
- 🎨 取色工具
- 🎯 多点取色功能
