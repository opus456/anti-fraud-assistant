# Docker 部署指南

## 快速启动

```bash
# 在 anti-fraud_assistant/ 目录下执行
docker-compose up -d --build
```

启动后访问：
- **前端页面**: http://你的服务器IP
- **后端 API 文档**: http://你的服务器IP:8000/docs

## 架构说明

| 服务 | 端口 | 说明 |
|------|------|------|
| frontend (nginx) | 80 | 前端页面 + API 反向代理 |
| backend (FastAPI) | 8000 | 后端 API 服务 |

前端 nginx 会自动将 `/api/*` 请求代理到后端服务，浏览器只需访问 80 端口。

## 环境变量配置

可在 `docker-compose.yml` 中修改，或创建 `.env` 文件：

```env
# JWT 密钥（生产环境务必修改）
SECRET_KEY=your-secure-random-key-here

# LLM API 配置
LLM_API_KEY=your-api-key
LLM_API_URL=https://api-ai.gitcode.com/v1/chat/completions
LLM_MODEL=Qwen/Qwen3.5-397B-A17B
```

## 数据持久化

- `backend-data` 卷：SQLite 数据库（用户数据、知识库、检测记录）
- `backend-uploads` 卷：用户上传的文件

首次启动时会自动从 `data_source/` 目录导入知识库数据（4744 条反诈知识）。

## 常用命令

```bash
# 查看日志
docker-compose logs -f

# 仅查看后端日志
docker-compose logs -f backend

# 停止服务
docker-compose down

# 停止并删除数据卷（慎用，会清空所有数据）
docker-compose down -v

# 重新构建并启动
docker-compose up -d --build
```

## 部署到服务器

1. 将 `anti-fraud_assistant/` 整个目录上传到服务器
2. 确保服务器已安装 Docker 和 Docker Compose
3. 执行 `docker-compose up -d --build`
4. 开放服务器 80 端口的防火墙规则

## 自定义端口

如需修改前端端口（默认 80），编辑 `docker-compose.yml`：

```yaml
frontend:
  ports:
    - "你的端口:80"
```
