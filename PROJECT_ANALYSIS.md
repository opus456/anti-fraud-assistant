# 多模态反诈智能体助手 - 项目深度解析文档

> 生成时间: 2026-03-29
> 项目版本: v2.0.0

---

## 📋 目录

1. [项目概述](#1-项目概述)
2. [整体架构](#2-整体架构)
3. [代码阅读顺序建议](#3-代码阅读顺序建议)
4. [模块详细解析](#4-模块详细解析)
   - [4.1 数据库层 (database)](#41-数据库层-database)
   - [4.2 Chrome 插件 (extension)](#42-chrome-插件-extension)
   - [4.3 Node.js 网关 (server-node)](#43-nodejs-网关-server-node)
   - [4.4 Python AI 后端 (server-python)](#44-python-ai-后端-server-python)
   - [4.5 React 前端 (client-react)](#45-react-前端-client-react)
5. [核心数据流](#5-核心数据流)
6. [关键技术点](#6-关键技术点)

---

## 1. 项目概述

这是一个**多模态反诈智能体助手**系统，采用 **感知-决策-干预-进化** 的设计理念：

| 阶段 | 功能 | 实现模块 |
|------|------|----------|
| **感知** | 采集用户浏览器中的 DOM 文本和屏幕帧 | Chrome 插件 |
| **决策** | AI 分析诈骗风险（关键词+RAG+LLM CoT） | Python FastAPI |
| **干预** | 实时告警用户和监护人 | Node.js 网关 + Socket.io |
| **进化** | 管理员审核新型案例并更新知识库 | 管理后台 + 向量化存储 |

### 技术栈

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端层                                    │
│  React 18 + TypeScript + Vite + TailwindCSS + Zustand + ECharts│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       网关层 (Node.js)                          │
│      Express + Socket.io + JWT + HTTP Proxy                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      AI 后端层 (Python)                         │
│  FastAPI + LangChain + PyTorch + Qwen LLM + BGE Embedding      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        存储层                                    │
│         PostgreSQL (pgvector HNSW) + Redis                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 整体架构

```
                    ┌──────────────────┐
                    │   Chrome 插件    │
                    │  (DOM采集/截屏)  │
                    └────────┬─────────┘
                             │ WebSocket
                             ↓
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ React 前端   │←──→│  Node.js 网关    │←──→│ Python AI 后端   │
│ (三端界面)   │    │  (实时通信枢纽)  │    │ (风险检测引擎)   │
└──────────────┘    └──────────────────┘    └────────┬─────────┘
                             ↑                       │
                             │ 告警推送              ↓
                    ┌────────┴─────────┐    ┌──────────────────┐
                    │   监护人终端     │    │  PostgreSQL      │
                    └──────────────────┘    │  (pgvector 索引) │
                                            └──────────────────┘
```

### 项目目录结构

```
anti-fraud_assistant/
├── client-react/          # React 前端 (用户/监护人/管理员三端)
├── extension/             # Chrome Manifest V3 插件
├── server-node/           # Node.js Express + Socket.io 网关
├── server-python/         # Python FastAPI AI 引擎
├── database/              # PostgreSQL DDL (含 pgvector)
├── docker-compose.yml     # PostgreSQL + Redis 基础设施
├── run.bat / run.ps1      # Windows 启动脚本
└── README.md              # 项目说明
```

---

## 3. 代码阅读顺序建议

### 🎯 推荐阅读路线

按照数据流动方向，建议以下阅读顺序：

```
第一阶段: 理解数据存储结构
├── 1. database/init.sql          ← 数据库表结构定义 (必看!)
└── 理解 8 张核心表和 pgvector 向量索引

第二阶段: 理解数据采集入口
├── 2. extension/manifest.json    ← 插件配置
├── 3. extension/content.js       ← DOM 文本采集逻辑
└── 4. extension/background.js    ← WebSocket 通信管理

第三阶段: 理解实时通信枢纽
├── 5. server-node/src/index.js   ← 网关入口
├── 6. server-node/src/gateway.js ← Socket.io 核心逻辑 (重要!)
└── 7. server-node/src/routes/proxy.js ← API 代理

第四阶段: 理解 AI 检测核心
├── 8. server-python/run.py       ← 服务启动入口
├── 9. server-python/app/main.py  ← FastAPI 应用配置
├── 10. server-python/app/config.py ← 配置参数
├── 11. server-python/app/routers/detection.py ← 检测 API
├── 12. server-python/app/services/fraud_detector.py ← 三级检测引擎 (核心!)
├── 13. server-python/app/services/llm_service.py   ← LLM CoT 推理
├── 14. server-python/app/services/rag_service.py   ← 知识库检索
└── 15. server-python/app/services/embedding_service.py ← 向量生成

第五阶段: 理解前端交互
├── 16. client-react/src/main.tsx    ← 前端入口
├── 17. client-react/src/App.tsx     ← 路由配置
├── 18. client-react/src/api/index.ts ← API 和 Socket.io 封装
├── 19. client-react/src/store/index.ts ← Zustand 状态管理
├── 20. client-react/src/pages/Detection.tsx ← 智能检测页面 (核心交互!)
├── 21. client-react/src/pages/UserConsole.tsx ← 实时监控台
└── 22. client-react/src/pages/GuardianDashboard.tsx ← 监护人面板
```

### 📌 快速理解核心文件 (Top 5)

如果时间有限，优先阅读这 5 个文件：

| 优先级 | 文件 | 说明 |
|--------|------|------|
| ⭐⭐⭐⭐⭐ | `server-python/app/services/fraud_detector.py` | 三级级联检测引擎，整个系统的核心算法 |
| ⭐⭐⭐⭐⭐ | `database/init.sql` | 数据库结构，理解数据模型 |
| ⭐⭐⭐⭐ | `server-node/src/gateway.js` | 实时通信枢纽，连接前端与 AI 后端 |
| ⭐⭐⭐⭐ | `extension/content.js` | 数据采集源头，理解输入来源 |
| ⭐⭐⭐ | `client-react/src/pages/Detection.tsx` | 核心交互界面，理解用户体验 |

---

## 4. 模块详细解析

### 4.1 数据库层 (database)

📁 **目录**: `database/`

#### 文件清单
```
database/
└── init.sql    # PostgreSQL 初始化脚本 (含 pgvector 扩展)
```

#### 核心表结构 (8 张表)

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `users` | 用户信息 | role(user/guardian/admin), role_type(elder/child/student/adult), risk_score |
| `guardian_relations` | 监护人关系 | user_id, guardian_id, is_primary |
| `scam_knowledge_base` | 诈骗知识库 | embedding(vector(1024)), scam_type, HNSW 索引 |
| `user_memory_logs` | 用户记忆 | short_term_context, long_term_summary |
| `conversations` | 对话记录 | input_type(text/image/audio), is_fraud, risk_score, matched_cases |
| `alert_records` | 预警记录 | risk_level(0-3), guardian_notified, is_resolved |
| `reports` | 安全报告 | report_type(weekly/monthly), fraud_type_summary |
| `fraud_statistics` | 诈骗统计 | province, city, fraud_type, case_count |

#### pgvector HNSW 索引配置

```sql
-- 1024维向量，余弦相似度，HNSW 算法
CREATE INDEX idx_skb_embedding ON scam_knowledge_base
    USING hnsw (embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);
```

**参数说明**:
- `m=16`: 每个节点最大连接数（平衡精度与速度）
- `ef_construction=64`: 构建时搜索深度（数值越大越精准）
- `vector_cosine_ops`: 使用余弦相似度计算

#### 表关系图

```
users (核心)
  │
  ├─→ guardian_relations (自引用: 监护人↔被监护人)
  ├─→ user_memory_logs (1:1 记忆存储)
  ├─→ conversations (1:N 对话历史)
  ├─→ alert_records (1:N 预警记录)
  └─→ reports (1:N 安全报告)

scam_knowledge_base (独立知识库)
  └─→ conversations.matched_cases (JSONB 引用)
```

---

### 4.2 Chrome 插件 (extension)

📁 **目录**: `extension/`

#### 文件清单
```
extension/
├── manifest.json    # Manifest V3 配置
├── background.js    # Service Worker 后台服务
└── content.js       # 内容脚本 (注入网页)
```

#### 4.2.1 manifest.json - 插件配置

```json
{
  "manifest_version": 3,
  "name": "Anti-Fraud Multimodal Sentinel",
  "permissions": ["storage", "activeTab", "tabs"],
  "host_permissions": ["<all_urls>", "ws://localhost:3001/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

**关键权限**:
- `<all_urls>`: 允许在所有网站运行
- `ws://localhost:3001/*`: WebSocket 连接到本地网关

#### 4.2.2 content.js - DOM 采集引擎

**核心功能**:
1. **DOM 变化观察**: 使用 `MutationObserver` 监听页面文本变化
2. **屏幕截图**: 使用 `getDisplayMedia` API 采集屏幕帧

**DOM 采集流程**:
```javascript
// 监听 DOM 变化
observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    // 提取新增/修改的文本内容
    // 限制单段 300 字符，总计 1500 字符
    // 发送到后台脚本
  }
});

observer.observe(document.body, {
  childList: true,      // 监听子节点变化
  subtree: true,        // 监听所有后代
  characterData: true   // 监听文本内容变化
});
```

**屏幕采集流程**:
```javascript
// 每 2 秒采集一帧
screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: { frameRate: 1 },
  audio: false
});

// 缩放至 960x540，JPEG 65% 质量
canvas.toDataURL("image/jpeg", 0.65);
```

**数据发送格式**:
```javascript
{
  type: "AF_FORWARD_DATA",
  payload: {
    token: "jwt_token",
    text: "采集到的DOM文本",
    image_frame: "data:image/jpeg;base64,...",  // 可选
    source: "dom-mutation" | "screen-capture",
    url: "https://current-page.com",
    ts: 1699999999999
  }
}
```

#### 4.2.3 background.js - WebSocket 管理

**核心功能**:
1. 维护与 Node.js 网关的 WebSocket 连接
2. 处理 Socket.io 协议握手和心跳
3. 转发采集数据到网关

**连接认证流程**:
```
1. 收到引擎握手包 "0{...}" → 发送认证: 40{"token":"xxx"}
2. 收到确认包 "40" → 标记已认证
3. 收到心跳 "2" → 回复 "3"
4. 数据转发: 42["monitor_data", {...}]
```

**消息处理器**:
```javascript
chrome.runtime.onMessage.addListener((msg, sender) => {
  switch (msg.type) {
    case "AF_START_MONITORING":  // 启动监控
    case "AF_STOP_MONITORING":   // 停止监控
    case "AF_FORWARD_DATA":      // 转发数据
  }
});
```

---

### 4.3 Node.js 网关 (server-node)

📁 **目录**: `server-node/`

#### 文件清单
```
server-node/
├── package.json
├── .env
└── src/
    ├── index.js           # 入口文件
    ├── gateway.js         # Socket.io 核心逻辑
    ├── middleware/
    │   └── auth.js        # JWT 认证
    └── routes/
        └── proxy.js       # API 代理 + 内部告警
```

#### 4.3.1 index.js - 服务入口

```javascript
// 核心启动流程
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: {...} });

setupGateway(io);           // 初始化 Socket.io 网关
mountProxy(app, broadcast); // 挂载 API 代理

server.listen(3001);
```

#### 4.3.2 gateway.js - 实时通信枢纽 (重要!)

**Socket.io 房间策略**:
```
user:{userId}       → 用户个人房间 (接收个人告警)
guardian:{userId}   → 监护人房间 (接收被监护人告警)
```

**核心事件处理**:

| 事件 | 方向 | 功能 |
|------|------|------|
| `connection` | 客户端→服务器 | 连接认证 + 加入房间 |
| `monitor_data` | 客户端→服务器 | 接收监控数据，调用 Python API 检测 |
| `DETECTION_RESULT` | 服务器→客户端 | 返回检测结果 |
| `SHOW_WARNING` | 服务器→用户 | 高危警报 (risk_level >= 2) |
| `GUARDIAN_ALERT` | 服务器→监护人 | 被监护人告警通知 |

**检测流程**:
```javascript
socket.on('monitor_data', async (data) => {
  // 1. 判断多模态 vs 纯文本
  const endpoint = hasMultimodal 
    ? '/api/detection/multimodal'
    : '/api/detection/text';
  
  // 2. 调用 Python 后端
  const result = await axios.post(PYTHON_API + endpoint, payload);
  
  // 3. 风险等级 >= 2 时广播告警
  if (riskLevel >= 2) {
    io.to(`user:${userId}`).emit('SHOW_WARNING', alertPayload);
    io.to(`guardian:${userId}`).emit('GUARDIAN_ALERT', alertPayload);
  }
  
  // 4. 返回结果
  socket.emit('DETECTION_RESULT', result);
});
```

#### 4.3.3 proxy.js - API 代理

**两个核心功能**:

1. **内部告警端点** `POST /internal/alert`
   - Python 后端推送告警
   - 使用 `X-Internal-Secret` 验证

2. **API 代理** `/api/*`
   - 代理所有请求到 Python 后端
   - 前端统一通过网关访问

---

### 4.4 Python AI 后端 (server-python)

📁 **目录**: `server-python/`

#### 文件清单
```
server-python/
├── run.py                    # 启动脚本
├── requirements.txt          # 依赖声明
├── .env                      # 环境变量
└── app/
    ├── main.py               # FastAPI 应用
    ├── config.py             # 配置管理
    ├── database.py           # 数据库连接
    ├── models.py             # SQLAlchemy ORM 模型
    ├── routers/              # API 路由
    │   ├── auth.py           # 用户认证
    │   ├── detection.py      # 反诈检测 (核心!)
    │   ├── knowledge.py      # 知识库管理
    │   ├── guardian.py       # 监护人管理
    │   ├── alerts.py         # 预警管理
    │   ├── reports.py        # 报告生成
    │   ├── statistics.py     # 数据统计
    │   ├── memory.py         # 记忆管理
    │   └── evolve.py         # 知识进化
    ├── services/             # 业务逻辑层
    │   ├── fraud_detector.py # 三级检测引擎 (核心!)
    │   ├── llm_service.py    # LLM CoT 推理
    │   ├── rag_service.py    # RAG 知识库检索
    │   └── embedding_service.py # 向量生成
    └── data_source/          # 内置知识库数据
        ├── 百度反诈.json
        ├── 搜狗反诈.json
        ├── 搜狗诈骗预警.json
        └── 搜狗-诈骗套路.json
```

#### 4.4.1 config.py - 配置管理

**关键配置项**:
```python
# LLM 配置
LLM_API_URL = "https://api-ai.gitcode.com/v1/chat/completions"
LLM_MODEL = "Qwen/Qwen3.5-35B-A3B"
EMBEDDING_MODEL = "BAAI/bge-m3"  # 1024维向量

# 风险阈值
LOW_THRESHOLD = 0.3
MEDIUM_THRESHOLD = 0.6
HIGH_THRESHOLD = 0.85
DETECTION_FRAUD_THRESHOLD = 0.22
```

#### 4.4.2 fraud_detector.py - 三级级联检测引擎 (核心!)

这是整个系统最核心的文件，实现了三级级联检测：

```
┌─────────────────────────────────────────────────────────┐
│                    三级级联检测流程                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Level 1: 关键词规则引擎 (毫秒级)                       │
│    ├─ 12 种诈骗类型关键词检测                           │
│    ├─ 紧急信号检测 (转账、验证码、立即...)              │
│    ├─ 安全上下文检测 (降低误报)                         │
│    ├─ 高危组合模式 (正则表达式)                         │
│    └─ 特征评分 (URL、手机号、银行卡)                    │
│                         ↓                               │
│  Level 2: RAG 知识库检索 (百毫秒级)                     │
│    ├─ pgvector HNSW 向量相似度搜索                      │
│    ├─ TF-IDF 降级方案                                   │
│    └─ 返回 Top-3 相似案例                               │
│                         ↓                               │
│  Level 3: LLM CoT 思维链 (秒级，条件触发)               │
│    ├─ 5 维度分析 (紧迫性/资金/权威/信息/回报)           │
│    ├─ 个性化角色提示                                    │
│    └─ JSON 结构化输出                                   │
│                         ↓                               │
│  多源融合 + 个性化风险评估                              │
│    ├─ 加权融合三级检测分数                              │
│    ├─ 用户画像风险调整                                  │
│    └─ 生成最终结果                                      │
└─────────────────────────────────────────────────────────┘
```

**检测结果结构**:
```python
DetectionResult = {
    "is_fraud": bool,              # 是否诈骗
    "risk_score": float,           # 0-1 风险分数
    "risk_level": str,             # safe/low/medium/high/critical
    "fraud_type": str,             # 诈骗类型代码
    "fraud_type_label": str,       # 诈骗类型名称
    "analysis": str,               # 详细分析文本
    "cot_reasoning": {             # CoT 推理详情
        "urgency_check": str,
        "financial_check": str,
        "authority_fake_check": str,
        "info_theft_check": str,
        "too_good_check": str,
        "risk_level": int,
        "scam_type": str
    },
    "matched_cases": list,         # RAG 匹配案例
    "suggestions": list,           # 安全建议
    "warning_scripts": list,       # 警告话术
    "alert_actions": list,         # 触发的告警动作
    "pipeline": {                  # 检测管道信息
        "llm_used": bool,
        "keyword_score": float,
        "rag_similarity": float,
        "timings_ms": {...}
    }
}
```

#### 4.4.3 llm_service.py - LLM CoT 推理

**CoT 系统提示词结构**:
```
你是专业反诈专家，请从以下5个维度逐步分析：

1. urgency_check: 是否制造紧迫感？
2. financial_check: 是否涉及资金操作？
3. authority_fake_check: 是否冒充权威身份？
4. info_theft_check: 是否索要敏感信息？
5. too_good_check: 是否承诺不切实际回报？

输出 JSON 格式结果...
```

**角色特定提示 (ROLE_HINTS)**:
- `elder`: 保健品诈骗、冒充子女/公检法
- `child`: 游戏诈骗、追星诱导
- `student`: 校园贷、刷单、虚假奖学金
- `finance`: 冒充领导转账、财务系统钓鱼

#### 4.4.4 rag_service.py - 知识库检索

**双链路检索策略**:
```
优先: pgvector 向量检索 (HNSW 算法)
降级: TF-IDF + 余弦相似度 (sklearn)
```

**向量检索查询**:
```sql
SELECT id, title, content, scam_type,
       (1 - embedding <-> query_embedding) as similarity
FROM scam_knowledge_base
WHERE is_active = true AND embedding IS NOT NULL
ORDER BY embedding <-> query_embedding
LIMIT 3;
```

#### 4.4.5 API 路由清单

| 路由前缀 | 文件 | 核心端点 |
|----------|------|----------|
| `/api/auth` | auth.py | `POST /register`, `POST /login`, `GET /me` |
| `/api/detection` | detection.py | `POST /text`, `POST /multimodal`, `GET /history` |
| `/api/knowledge` | knowledge.py | `POST /search`, `POST /add`, `POST /bootstrap` |
| `/api/guardians` | guardian.py | `POST /bind`, `GET /charges`, `DELETE /{id}` |
| `/api/alerts` | alerts.py | `GET /`, `POST /{id}/resolve` |
| `/api/reports` | reports.py | `POST /generate`, `GET /` |
| `/api/statistics` | statistics.py | `GET /overview`, `GET /fraud-map`, `GET /trends` |
| `/api/memory` | memory.py | `GET /`, `POST /compress` |
| `/api/evolve` | evolve.py | `POST /`, `GET /pending` |

---

### 4.5 React 前端 (client-react)

📁 **目录**: `client-react/`

#### 文件清单
```
client-react/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── src/
    ├── main.tsx              # 入口文件
    ├── App.tsx               # 路由配置
    ├── index.css             # 全局样式
    ├── api/
    │   └── index.ts          # Axios + Socket.io 封装
    ├── store/
    │   └── index.ts          # Zustand 状态管理
    ├── components/
    │   ├── Layout.tsx        # 侧边栏导航布局
    │   └── WarningOverlay.tsx # 全屏高危预警
    └── pages/
        ├── Login.tsx         # 登录页
        ├── Register.tsx      # 注册页
        ├── Dashboard.tsx     # 首页控制台
        ├── Detection.tsx     # 智能检测 (核心!)
        ├── UserConsole.tsx   # 实时监控台
        ├── GuardianDashboard.tsx # 监护人面板
        ├── AdminDashboard.tsx # 管理后台
        ├── Visualization.tsx # 数据大屏
        ├── History.tsx       # 检测记录
        ├── Alerts.tsx        # 预警中心
        ├── Knowledge.tsx     # 知识库
        ├── Profile.tsx       # 用户画像
        ├── Guardians.tsx     # 监护人管理
        └── Reports.tsx       # 安全报告
```

#### 4.5.1 App.tsx - 路由配置

**三层路由设计**:
```typescript
// 1. 认证页面 (无布局)
/login, /register

// 2. 专用面板 (独立布局)
/guardian-dashboard  → 仅 guardian/admin
/admin               → 仅 admin

// 3. 主布局内页面 (共享侧边栏)
/, /detection, /knowledge, /visualization, /monitor, 
/history, /alerts, /guardians, /reports, /profile
```

**受保护路由**:
```typescript
<ProtectedRoute roles={['user', 'guardian', 'admin']}>
  <Component />
</ProtectedRoute>
```

#### 4.5.2 api/index.ts - API 封装

```typescript
// Axios 实例
export const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  withCredentials: true
});

// Socket.io 实例
export const socket = io('http://localhost:3001', {
  auth: { token: getToken() }
});

// 请求拦截器: 自动附加 JWT Token
// 响应拦截器: 401 时自动跳转登录
```

#### 4.5.3 store/index.ts - Zustand 状态管理

```typescript
interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

// 持久化到 localStorage
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // state & actions
    }),
    { name: 'auth-storage' }
  )
);
```

#### 4.5.4 Detection.tsx - 智能检测页面 (核心交互!)

**功能**:
- 文本输入 + 图片上传
- 5 个示例文本快速选择
- 实时加载步骤显示
- CoT 推理过程展示
- 风险等级可视化

**检测流程**:
```typescript
const handleDetect = async () => {
  // 1. 构建 FormData (多模态)
  const formData = new FormData();
  formData.append('text', inputText);
  if (imageFile) formData.append('image', imageFile);
  
  // 2. 调用 API
  const result = await api.post('/detection/multimodal', formData);
  
  // 3. 展示结果
  setDetectionResult(result.data);
};
```

**结果展示组件**:
```
┌─────────────────────────────────────────────────┐
│  风险评分圆环 (RiskRing)                        │
│  绿色 <40 | 黄色 40-70 | 红色 ≥70               │
├─────────────────────────────────────────────────┤
│  CoT 链式推理                                   │
│  ├─ urgency_check: ✓ 制造紧迫感                │
│  ├─ financial_check: ✓ 涉及转账                │
│  └─ ...                                        │
├─────────────────────────────────────────────────┤
│  匹配案例列表                                   │
│  ├─ 案例1: xxx (相似度 85%)                    │
│  └─ 案例2: xxx (相似度 72%)                    │
├─────────────────────────────────────────────────┤
│  安全建议 | 警告话术                           │
└─────────────────────────────────────────────────┘
```

#### 4.5.5 UserConsole.tsx - 实时监控台

**功能**:
- Chrome 插件集成
- WebSocket 实时监控
- 屏幕采集控制
- 日志控制台

**插件通信**:
```typescript
// 探测插件
window.postMessage({ type: 'AF_PING_PLUGIN' }, origin);

// 启动监控
window.postMessage({
  type: 'AF_START_MONITORING',
  payload: { token, gatewayWsUrl }
}, origin);

// 监听结果
socket.on('DETECTION_RESULT', handleResult);
socket.on('SHOW_WARNING', handleWarning);
```

#### 4.5.6 GuardianDashboard.tsx - 监护人面板

**功能**:
- 被监护人列表
- 实时高危预警
- 待处理预警表格
- 检测记录查看

**告警处理**:
```typescript
socket.on('GUARDIAN_ALERT', (alert) => {
  setAlertMode(true);  // 背景变红
  setLatestAlert(alert);
  // 显示脉冲动画告警横幅
});
```

---

## 5. 核心数据流

### 5.1 实时监控数据流

```
用户浏览网页
    ↓
Chrome 插件 (content.js)
  ├─ MutationObserver 捕获 DOM 变化
  └─ getDisplayMedia 采集屏幕帧
    ↓
Chrome 插件 (background.js)
  └─ WebSocket 发送 42["monitor_data", {...}]
    ↓
Node.js 网关 (gateway.js)
  └─ 调用 Python API /detection/multimodal
    ↓
Python AI 后端 (fraud_detector.py)
  ├─ Level 1: 关键词规则 (5ms)
  ├─ Level 2: RAG 检索 (50ms)
  └─ Level 3: LLM CoT (200ms, 条件触发)
    ↓
Node.js 网关
  ├─ emit('DETECTION_RESULT', result) → 用户
  └─ emit('GUARDIAN_ALERT', alert) → 监护人 (if risk >= 2)
    ↓
React 前端
  └─ 更新 UI / 显示告警
```

### 5.2 手动检测数据流

```
用户在 Detection 页面输入文本/上传图片
    ↓
React 前端 (Detection.tsx)
  └─ POST /api/detection/multimodal
    ↓
Node.js 网关 (proxy.js)
  └─ 代理到 Python 后端
    ↓
Python AI 后端 (detection.py)
  └─ 调用 fraud_detector.detect()
    ↓
返回 DetectionResult
    ↓
React 前端
  └─ 展示风险评分、CoT 推理、匹配案例、建议
```

### 5.3 知识库进化数据流

```
管理员在 AdminDashboard 审核待处理事件
    ↓
点击"批准" → POST /api/evolve
    ↓
Python 后端 (evolve.py)
  ├─ 生成 embedding (1024维)
  └─ 写入 scam_knowledge_base 表
    ↓
pgvector HNSW 索引自动更新
    ↓
后续检测可匹配到新案例
```

---

## 6. 关键技术点

### 6.1 三级级联检测算法

```
总分数 = 
  关键词分数 * 0.42 +
  紧急信号分数 * 0.18 +
  特征分数 * 0.08 +
  模式分数 * 0.20 +
  组合分数 * 0.12 -
  安全度调整
```

### 6.2 pgvector HNSW 索引优势

- **O(log n) 查询时间**: 百万级数据秒级响应
- **高精度**: 95%+ 召回率
- **动态插入**: 无需重建索引
- **余弦相似度**: 适合文本语义匹配

### 6.3 Socket.io 房间策略

```javascript
// 用户房间: 接收个人告警
socket.join(`user:${userId}`);

// 监护人房间: 接收被监护人告警
socket.join(`guardian:${chargeUserId}`);

// 广播告警时:
io.to(`user:${userId}`).emit('SHOW_WARNING', ...);
io.to(`guardian:${userId}`).emit('GUARDIAN_ALERT', ...);
```

### 6.4 LLM CoT 提示工程

**5 维度分析框架**:
1. `urgency_check` - 紧迫感检测
2. `financial_check` - 资金操作检测
3. `authority_fake_check` - 冒充权威检测
4. `info_theft_check` - 信息窃取检测
5. `too_good_check` - 过度承诺检测

**角色特定提示**: 根据用户 role_type (elder/child/student/finance) 给予针对性警告

---

## 结语

本项目是一个完整的端到端反诈骗系统，涵盖了从数据采集、实时通信、AI 分析到用户交互的全链路。核心亮点包括：

✅ **多模态感知**: DOM 文本 + 屏幕截图 + 音视频（扩展）
✅ **三级级联检测**: 关键词 → RAG → LLM CoT，平衡速度与精度
✅ **向量知识库**: pgvector HNSW 索引，高效语义检索
✅ **实时告警**: Socket.io 双向通信，毫秒级推送
✅ **监护机制**: 监护人实时接收被监护人告警
✅ **自适应进化**: 管理员审核 → 知识库更新 → 检测能力增强

建议从 `database/init.sql` 开始阅读，理解数据模型后，再按照数据流顺序阅读各模块代码。
