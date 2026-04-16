# 破局 - 识破每一次骗局

> **版本**: v2.2.0  
> **最后更新**: 2026-04-15  
> **核心概念**: 用 AI 守护，让诈骗无所遁形

本项目基于 **感知-决策-干预-进化** 设计理念，为用户和家人构建全方位反诈防线。

## 架构特色

- **感知**: Chrome 插件采集 DOM 增量文本 + 屏幕帧
- **决策**: Python FastAPI + LangChain + PyTorch + pgvector RAG + CoT 分析
- **干预**: Node.js 网关实时联动用户与监护人告警
- **进化**: 管理员审核新型案例后写入知识库并生成向量

## 工程结构

- `client-react`: 三端 Web 前端 (用户/监护人/管理员) + 移动应用
- `extension`: Chrome Manifest V3 插件
- `server-node`: Express + Socket.io 网关
- `server-python`: FastAPI AI 引擎
- `database`: PostgreSQL DDL (含 pgvector HNSW 索引)
- `docker-compose.yml`: PostgreSQL + Redis 基础设施

## 技术栈

- **前端**: React 18 + TypeScript + Vite + TailwindCSS + Zustand + ECharts
- **移动**: React + Capacitor (iOS/Android)
- **插件**: Chrome Extension Manifest V3
- **网关**: Node.js + Express + Socket.io
- **AI 后端**: Python + FastAPI + LangChain + OpenAI/Ollama
- **存储**: PostgreSQL (pgvector) + Redis

## 快速启动

### 1) 查看完成度报告（重要！）

请先阅读 [COMPLETION_REPORT.md](COMPLETION_REPORT.md) 了解项目当前的完成情况、修复的问题和可用的功能。

### 2) 快速参考

- 📖 快速使用指南: [QUICK_START.md](QUICK_START.md)
- 📱 Android编译指南: [ANDROID_BUILD.md](ANDROID_BUILD.md)
- 📝 版本更新记录: [CHANGELOG.md](CHANGELOG.md)
- 📊 项目完成报告: [COMPLETION_REPORT.md](COMPLETION_REPORT.md)
- 📋 改动总结: [UPDATE_SUMMARY.md](UPDATE_SUMMARY.md)

### 1) 启动数据库与 Redis

```bash
docker compose up -d
```

### 2) 启动 Python AI 服务

```bash
cd server-python
pip install -r requirements.txt
python run.py
```

默认地址: http://localhost:8000

### 3) 启动 Node 网关

```bash
cd server-node
npm install
npm run dev
```

默认地址: http://localhost:3001

### 4) 启动 React 前端

```bash
cd client-react
npm install
npm run dev
```

默认地址: http://localhost:5173

### 5) 构建 Android 应用

```bash
cd client-react

# 构建 Web 应用
npm run build

# 自动编译 APK（一行命令）
# Windows 用户：
..\build-android-debug.bat

# Mac/Linux 用户：
../build-android-debug.sh

# 或手动步骤：
npx cap sync android
cd android
./gradlew assembleDebug  # 生成 app-debug.apk
```

详见 [ANDROID_BUILD.md](ANDROID_BUILD.md) 完整指南

### 6) 在手机上运行

```bash
# 使用 ADB 安装到已连接的 Android 设备
adb install -r client-react/android/app/build/outputs/apk/debug/app-debug.apk

# 启动应用
adb shell am start -n com.pojiefraud.assistant/.MainActivity
```

## 关键环境变量

### server-python

- DATABASE_URL: PostgreSQL 连接串
- REDIS_URL: Redis 连接串
- SECRET_KEY: JWT 密钥
- LLM_API_URL: 大模型接口地址
- LLM_API_KEY: 大模型密钥
- LLM_MODEL: 对话模型
- EMBEDDING_API_URL: 向量接口基地址
- EMBEDDING_MODEL: 向量模型
- NODE_GATEWAY_URL: 网关回调地址

### server-node

- PORT: 网关端口，默认 3001
- PYTHON_API: Python 服务地址，默认 http://localhost:8000
- SECRET_KEY: JWT 验签密钥（需与 Python 一致）
- CORS_ORIGINS: 允许的前端来源

### client-react

- VITE_EXTENSION_ID: 已安装插件 ID（可选）
- VITE_GATEWAY_WS_URL: 网关地址（默认当前站点 origin）

## 目标需求对应关系

- 数据库 DDL 与索引: database/init.sql
- 插件核心文件: extension/manifest.json, extension/background.js, extension/content.js
- 网关核心分发: server-node/src/gateway.js
- CoT + RAG + 记忆 + 进化: server-python/app/services 与 server-python/app/routers
- 三端核心页面:
  - 用户监控台: client-react/src/pages/UserConsole.tsx
  - 监护人实时大屏: client-react/src/pages/GuardianDashboard.tsx
  - 管理员仪表盘: client-react/src/pages/AdminDashboard.tsx

## 注意事项

- PostgreSQL 需启用 pgvector 扩展，database/init.sql 已包含 CREATE EXTENSION。
- 若 LLM/Embedding 密钥为空，系统会回退到本地可运行路径，但效果会下降。
- 插件屏幕采集依赖用户授权，未授权时不会发送图像帧。
- 生产环境部署前**必须**更换默认的 SECRET_KEY。

## 更新日志

### v2.1.0 (2026-04-02)
- 🔒 修复文件上传路径注入安全漏洞
- 🔒 修复 Redis 连接池竞争条件
- 🔒 修复 Node.js 网关 userId 验证缺失
- 🔒 修复 HTTP 代理响应头检查
- 🧹 清理 Chrome 插件无效的 ws:// 权限声明
- 🐛 修复 React 组件 Object URL 内存泄漏
- 📄 新增 server-node/.env.example 配置示例
- 📄 更新 .gitignore 添加备份文件规则

### v2.0.0 (2026-03-29)
- 🎉 项目结构重构，统一为 client-react/server-node/server-python
- ✨ 实现完整的感知-决策-干预-进化流程
- 🤖 集成 LangChain + CoT 推理链
- 📱 支持 Android 移动端（Capacitor）
