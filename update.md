# 角色设定
你是一个顶级的全栈 AI 架构师和资深开发工程师，精通 React 前端开发、Node.js 高并发网关、Python/PyTorch 深度学习、LLM 提示词工程以及复杂的关系型/向量数据库设计。

# 任务目标
请为我完整开发一个“多模态反诈智能体助手”系统。该系统包含“感知－决策－干预－进化”四大模块，具备三端（用户、监护人、管理员）Web 界面和一个 Chrome 浏览器监控插件。请一步到位，生成包含数据库 DDL、后端接口、AI 处理逻辑和前端核心组件的完整代码结构。

# 技术栈要求
- **前端（三端）**: React + Tailwind CSS + Zustand + ECharts (用于数据可视化大屏)
- **浏览器插件**: Chrome Extension Manifest V3
- **网关与业务后端**: Node.js + Express + Socket.io (处理实时通信)
- **AI 算法与计算后端**: Python + FastAPI + PyTorch + LangChain
- **数据与记忆存储**: PostgreSQL (开启 pgvector 插件用于 RAG) + Redis (用于短期记忆与会话流)

# 核心模块详细落地规范与代码要求

## 1. 数据库层 (PostgreSQL + pgvector)
请生成完整的 SQL DDL 脚本，必须包含以下核心表及外键关系：
- `users`: 包含字段 id, role (user/guardian/admin), profile_json (存储年龄、职业等静态画像)。
- `guardian_relations`: 关联 user_id 与 guardian_id。
- `scam_knowledge_base`: 包含字段 id, content (案例原文本), scam_type, embedding (vector(1024) 类型，用于 RAG)。
- `user_memory_logs`: 包含字段 id, user_id, short_term_context (Redis 定期持久化过来的近期行为), long_term_summary (大模型生成的长期画像摘要)。
- `alert_records`: 记录预警事件的时间、风险等级(0-3)、触发模态、完整评估报告。
**要求**：请为高频查询字段建立 B-Tree 索引，为 embedding 字段建立 HNSW 向量索引。

## 2. Chrome 插件感知端 (Manifest V3)
请生成 `manifest.json`, `background.js`, 和 `content.js` 的核心代码。
- **功能**：由 React 前端页面（User 端）触发开启监控。
- **采集逻辑**：使用 `MutationObserver` 获取页面 DOM 新增文本；使用 `navigator.mediaDevices.getDisplayMedia` 获取屏幕流，每 2 秒截取一帧 Base64 图片。
- **通信逻辑**：通过 WebSocket 将轻量化处理后的文本和图像帧实时发送给 Node.js 网关，附加当前用户的 token。

## 3. Node.js 网关与分发层
请生成基于 Express 和 Socket.io 的核心网关代码。
- **连接管理**：维护 User 和 Guardian 的 Socket Room。
- **流量转发**：接收插件传来的多模态数据，通过 HTTP/RPC 转发给 Python FastAPI 端。
- **实时干预联动**：当 Python 端返回的 `risk_level >= 2`（高风险）时，Node.js 需立即向该用户所在的房间广播 `SHOW_WARNING` 事件，并向其绑定的 Guardian 所在房间广播 `GUARDIAN_ALERT` 事件及现场截图。

## 4. Python/FastAPI AI 决策与进化引擎 (核心)
请生成基于 LangChain 和 PyTorch 的完整推理逻辑代码。
- **RAG 检索 (知识库)**：收到文本/图像 OCR 结果后，先连接 PostgreSQL，使用 pgvector 进行余弦相似度检索，提取 Top-3 相似诈骗案例作为 Context。
- **Zero-Day 诈骗识别 (思维链 CoT)**：设计一段硬编码的 System Prompt。要求大模型结合 RAG 上下文和用户历史记忆（从数据库拉取的长期画像），按以下 JSON 格式强制输出逻辑推理步骤：
  `{"urgency_check": "...", "financial_check": "...", "authority_fake_check": "...", "risk_level": [0,1,2,3], "scam_type": "...", "reason": "..."}`。
- **长短期记忆构建**：编写一个后台定时任务（可用 APScheduler），每天遍历 Redis 中的短期高频交互日志，调用 LLM 进行压缩总结，更新到 PostgreSQL 的 `user_memory_logs` 表的长期画像中。
- **自适应进化**：编写一个 `/api/evolve` 接口，接收管理员审核确认的新型诈骗数据，调用 Embedding 模型（如 BGE 或 OpenAI API）生成向量，直接 `INSERT` 进 `scam_knowledge_base` 表。

## 5. React 前端三端核心逻辑
请给出以下三个关键组件的代码骨架：
1. **用户端监控控制台**：包含一个显眼的 Switch 开关，点击后能与 Chrome 插件建立通信，授权屏幕录制并启动 WebSocket 监控。
2. **监护人实时大屏**：通过 WebSocket 监听报警。一旦触发，页面变为红色警示状态，渲染出《安全监测报告》（包含触发的风险类型、大模型输出的 reason 和截图）。
3. **管理员仪表盘**：使用 ECharts 渲染系统整体的拦截数据统计（柱状图/饼图），并提供一个表格供管理员审核未知风险事件（批准后调用后端的进化接口）。

# 输出要求
请保持代码的工程化结构，按文件夹路径（如 `/database`, `/extension`, `/server-node`, `/server-python`, `/client-react`）分类输出核心文件的完整代码，并在注释中注明启动和运行的关键环境变量。