# 🛡️ 多模态反诈智能体助手

基于 RAG + LLM + 个性化风险评估的全栈反诈检测系统。

---

## 技术架构

| 层级 | 技术栈 |
|------|--------|
| **前端** | React 18 + TypeScript + Tailwind CSS 3 + Vite 5 + Recharts + Zustand |
| **后端** | Python + FastAPI + SQLAlchemy 2.0 (async) |
| **数据库** | SQLite (关系型) + ChromaDB (向量/RAG) |
| **AI** | OpenAI 兼容 LLM API + 本地关键词规则引擎 + jieba 中文 NLP |

## 功能特性

### 核心检测
- **文本诈骗检测** — 多引擎融合：LLM 分析(60%) + 本地规则引擎(40%)
- **RAG 知识增强** — ChromaDB 向量检索匹配相似案例辅助判断
- **12 种诈骗类型识别** — 投资理财、冒充公检法、杀猪盘、刷单等

### 个性化风险评估
- **用户画像** — 年龄/性别/职业/身份类型多维度建模
- **LSTM 风格时序评估** — 历史检测记录时间衰减加权
- **角色风险系数** — 老年人(×1.4)、儿童(×1.5)等差异化保护

### 守护者系统
- 添加家人/朋友为守护者
- 高风险时自动触发守护者通知
- 分级告警：弹窗 → 语音 → 守护者通知 → 紧急锁定

### 数据可视化
- 全国 31 省诈骗态势分布图
- 诈骗类型分布饼图
- 30 天趋势折线图
- 年龄/风险等级分布
- 实时监控仪表盘

### 其他
- JWT 认证 + bcrypt 加密
- AI 生成个性化安全报告（日/周/月报）
- 知识库检索与管理
- 响应式设计（移动端优先）

---

## 快速开始

### 1. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 LLM API Key（可选，不填则使用本地规则引擎）
```

### 3. 初始化知识库

```bash
cd backend
python scripts/init_knowledge.py
```

### 4. 启动后端

```bash
cd backend
python run.py
# 后端运行于 http://localhost:8000
# API 文档: http://localhost:8000/docs
```

### 5. 安装前端依赖并启动

```bash
cd frontend
npm install
npm run dev
# 前端运行于 http://localhost:5173
```

### 6. 访问系统

打开浏览器访问 `http://localhost:5173`，注册账户即可使用。

---

## 项目结构

```
anti-fraud_assistant/
├── backend/
│   ├── app/
│   │   ├── config.py          # 全局配置
│   │   ├── database.py        # 数据库连接
│   │   ├── models.py          # ORM 模型
│   │   ├── schemas.py         # Pydantic 模型
│   │   ├── main.py            # FastAPI 入口
│   │   ├── utils/
│   │   │   ├── security.py    # JWT + 密码加密
│   │   │   └── text_processor.py  # 中文 NLP 处理
│   │   ├── services/
│   │   │   ├── llm_service.py      # LLM API 服务
│   │   │   ├── knowledge_service.py # RAG 知识库服务
│   │   │   ├── risk_assessor.py     # 个性化风险评估
│   │   │   └── fraud_detector.py    # 核心检测引擎
│   │   └── routers/
│   │       ├── auth.py         # 认证路由
│   │       ├── detection.py    # 检测路由
│   │       ├── knowledge.py    # 知识库路由
│   │       ├── guardian.py     # 守护者路由
│   │       ├── statistics.py   # 统计路由
│   │       ├── reports.py      # 报告路由
│   │       └── alerts.py       # 告警路由
│   ├── scripts/
│   │   └── init_knowledge.py   # 知识库初始化脚本
│   ├── requirements.txt
│   ├── run.py
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/index.ts        # Axios HTTP 客户端
│   │   ├── store/index.ts      # Zustand 全局状态
│   │   ├── components/
│   │   │   └── Layout.tsx      # 主布局（侧栏 + 底栏）
│   │   ├── pages/
│   │   │   ├── Login.tsx       # 登录
│   │   │   ├── Register.tsx    # 注册（两步引导）
│   │   │   ├── Dashboard.tsx   # 首页仪表盘
│   │   │   ├── Detection.tsx   # 核心检测页
│   │   │   ├── History.tsx     # 检测历史
│   │   │   ├── Knowledge.tsx   # 知识库检索
│   │   │   ├── Visualization.tsx # 数据可视化
│   │   │   ├── Profile.tsx     # 用户画像
│   │   │   ├── Guardians.tsx   # 守护者管理
│   │   │   ├── Reports.tsx     # 安全报告
│   │   │   └── Alerts.tsx      # 告警中心
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
└── data/                        # 反诈知识数据源
    ├── 百度反诈.json
    ├── 搜狗-诈骗套路.json
    ├── 搜狗反诈.json
    └── 搜狗诈骗预警.json
```

---

## API 概览

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | `POST /api/auth/register` | 用户注册 |
| 认证 | `POST /api/auth/login` | 用户登录 |
| 检测 | `POST /api/detection/text` | 文本诈骗检测 |
| 检测 | `POST /api/detection/quick` | 快速检测（无需登录） |
| 知识库 | `POST /api/knowledge/search` | 知识库搜索 |
| 守护者 | `GET/POST /api/guardian/` | 守护者 CRUD |
| 统计 | `GET /api/statistics/overview` | 统计概览 |
| 报告 | `POST /api/reports/generate` | 生成安全报告 |
| 告警 | `GET /api/alerts/` | 告警列表 |

完整 API 文档：启动后端后访问 `http://localhost:8000/docs`

---

## 配置说明

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `LLM_API_URL` | LLM API 地址 | SiliconFlow |
| `LLM_API_KEY` | LLM API 密钥 | 空（使用本地引擎） |
| `LLM_MODEL` | 模型名称 | Qwen2.5-7B-Instruct |
| `SECRET_KEY` | JWT 签名密钥 | 需更改 |
| `DEBUG` | 调试模式 | True |

> **注意**: 不配置 LLM API Key 时，系统自动降级为本地关键词规则引擎，检测功能仍可正常使用。

---

## Docker 部署（推荐）

### 前置条件

服务器需要安装：
- **Docker** ≥ 20.10
- **Docker Compose** ≥ 2.0

```bash
# Ubuntu/Debian 一键安装 Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker && sudo systemctl start docker

# 验证安装
docker --version
docker compose version
```

---

### 方式一：上传源码到服务器构建

#### 1. 打包上传

```bash
# 本地 Windows PowerShell
cd D:\Fwwb\Code
Compress-Archive -Path anti-fraud_assistant -DestinationPath anti-fraud_assistant.zip

# 上传到服务器（替换为你的服务器信息）
scp anti-fraud_assistant.zip root@你的服务器IP:/root/
```

或用 SFTP 工具 / 宝塔面板上传 zip 文件。

#### 2. 服务器上构建并启动

```bash
ssh root@你的服务器IP
cd /root
unzip anti-fraud_assistant.zip
cd anti-fraud_assistant

# 一键构建并启动
docker compose up -d --build
```

#### 3. 验证

```bash
docker compose ps           # 容器应为 Up 状态
docker compose logs -f      # 查看日志，确认知识库初始化完成
curl http://localhost/api/   # 测试 API
```

浏览器访问 `http://你的服务器IP` 即可。

---

### 方式二：推送到 Docker Hub → 服务器一键拉取（推荐）

只需推送/拉取 **一个镜像**，服务器上不需要源码。

#### 1. 本地构建并推送

```bash
cd D:\Fwwb\Code\anti-fraud_assistant

# 注册 Docker Hub 后登录（https://hub.docker.com 免费注册）
docker login

# 构建镜像（替换 你的用户名 为 Docker Hub 用户名）
docker build -t 你的用户名/anti-fraud-assistant:latest .

# 推送到 Docker Hub
docker push 你的用户名/anti-fraud-assistant:latest
```

#### 2. 服务器上拉取并运行

SSH 登录服务器：

```bash
# 拉取镜像
docker pull 你的用户名/anti-fraud-assistant:latest

# 一键启动
docker run -d \
  --name anti-fraud \
  --restart unless-stopped \
  -p 80:80 \
  -v anti-fraud-data:/app/data \
  -v anti-fraud-uploads:/app/uploads \
  -e SECRET_KEY=你的JWT密钥 \
  -e LLM_API_KEY=BKxf_NoAL7ciz_yxQsrKisME \
  你的用户名/anti-fraud-assistant:latest
```

搞定。浏览器访问 `http://你的服务器IP` 即可。

#### 或者用 docker-compose.yml（可选）

在服务器上创建一个 `docker-compose.yml`：

```bash
mkdir -p /root/anti-fraud && cd /root/anti-fraud
cat > docker-compose.yml << 'EOF'
services:
  app:
    image: 你的用户名/anti-fraud-assistant:latest
    container_name: anti-fraud
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - app-data:/app/data
      - app-uploads:/app/uploads
    environment:
      - SECRET_KEY=${SECRET_KEY:-anti-fraud-secret-key-change-in-production}
      - LLM_API_KEY=${LLM_API_KEY:-BKxf_NoAL7ciz_yxQsrKisME}
      - LLM_API_URL=${LLM_API_URL:-https://api-ai.gitcode.com/v1/chat/completions}
      - LLM_MODEL=${LLM_MODEL:-Qwen/Qwen3.5-397B-A17B}

volumes:
  app-data:
  app-uploads:
EOF

docker compose up -d
```

#### 更新部署

```bash
# 本地：重新构建推送
docker build -t 你的用户名/anti-fraud-assistant:latest .
docker push 你的用户名/anti-fraud-assistant:latest

# 服务器：拉取重启
docker pull 你的用户名/anti-fraud-assistant:latest
docker stop anti-fraud && docker rm anti-fraud
docker run -d \
  --name anti-fraud \
  --restart unless-stopped \
  -p 80:80 \
  -v anti-fraud-data:/app/data \
  -v anti-fraud-uploads:/app/uploads \
  你的用户名/anti-fraud-assistant:latest
```

---

### 方式三：本地导出镜像文件传输

适合服务器无法访问 Docker Hub 的情况。

```bash
# 本地构建 + 导出
docker build -t anti-fraud-assistant:latest .
docker save anti-fraud-assistant:latest -o anti-fraud.tar

# 上传到服务器
scp anti-fraud.tar root@你的服务器IP:/root/

# 服务器上加载 + 运行
docker load -i /root/anti-fraud.tar
docker run -d --name anti-fraud --restart unless-stopped \
  -p 80:80 \
  -v anti-fraud-data:/app/data \
  -v anti-fraud-uploads:/app/uploads \
  anti-fraud-assistant:latest
```

---

### 部署架构

整个系统打包在 **一个 Docker 容器** 中：

```
浏览器 → :80 (nginx)
              ├── 静态页面 (React SPA)
              └── /api/* → 127.0.0.1:8000 (FastAPI 后端)
                              └── SQLite (Docker 卷持久化)
```

容器内部由 supervisord 同时管理 nginx 和 FastAPI 后端进程。

---

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SECRET_KEY` | JWT 签名密钥 | 需修改 |
| `LLM_API_KEY` | LLM API 密钥 | GitCode API Key |
| `LLM_API_URL` | LLM API 地址 | GitCode |
| `LLM_MODEL` | 模型名称 | Qwen3.5-397B |

---

### 数据持久化

| 卷 | 容器路径 | 内容 |
|----|----------|------|
| `anti-fraud-data` 或 `app-data` | `/app/data` | SQLite 数据库 |
| `anti-fraud-uploads` 或 `app-uploads` | `/app/uploads` | 上传文件 |

首次启动自动导入 4744 条反诈知识数据。

```bash
# 备份数据库
docker cp anti-fraud:/app/data/anti_fraud.db ./backup.db
```

---

### 常用命令

```bash
docker ps | grep anti-fraud        # 查看状态
docker logs -f anti-fraud          # 查看日志
docker restart anti-fraud          # 重启
docker stop anti-fraud && docker rm anti-fraud  # 停止删除容器（数据保留）
docker volume rm anti-fraud-data anti-fraud-uploads  # 删除数据（慎用）
```

---

### 防火墙

服务器只需开放 **80 端口**：

```bash
# Ubuntu
sudo ufw allow 80/tcp

# CentOS
sudo firewall-cmd --permanent --add-port=80/tcp && sudo firewall-cmd --reload
```

云服务器（阿里云/腾讯云/华为云）还需在 **安全组** 中放行 80 端口。
