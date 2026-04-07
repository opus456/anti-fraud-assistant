# 反诈智能体助手 - Docker 部署指南

## 项目架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Gateway   │────▶│   Python    │
│   (Nginx)   │     │   (Node.js) │     │   Backend   │
│    :80      │     │    :3001    │     │    :8000    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │    Redis    │     │  PostgreSQL │
                    │    :6379    │     │    :5432    │
                    └─────────────┘     └─────────────┘
                                               │
                    ┌─────────────┐             │
                    │   Ollama    │◀────────────┘
                    │   :11434    │ (宿主机)
                    └─────────────┘
```

## 快速部署

### 1. 准备环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置 (必须修改密码和密钥!)
nano .env
```

### 2. 构建并启动所有服务

```bash
# 一键启动 (首次会构建镜像，需要几分钟)
docker compose -f docker-compose.prod.yml up -d

# 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 查看服务状态
docker compose -f docker-compose.prod.yml ps
```

### 3. 访问服务

- **前端界面**: http://your-server-ip:80
- **API 网关**: http://your-server-ip:3001
- **Python API**: http://your-server-ip:8000

## 服务器准备工作

### 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 重新登录后验证
docker --version
docker compose version
```

### 安装 Ollama (推荐)

```bash
# 安装 Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 下载模型 (约 5-10GB)
ollama pull gemma4:e4b

# 启动服务 (设置为后台服务)
sudo systemctl enable ollama
sudo systemctl start ollama

# 验证
curl http://localhost:11434/api/tags
```

### Linux 服务器 Ollama 配置

如果是 Linux 服务器，需要修改 `.env` 中的 Ollama 地址：

```bash
# 获取 Docker 网桥 IP
docker network inspect bridge | grep Gateway

# 通常是 172.17.0.1，修改 .env
OLLAMA_BASE_URL=http://172.17.0.1:11434
```

## 开发环境

如果只需要启动数据库基础设施：

```bash
# 仅启动 PostgreSQL 和 Redis
docker compose up -d

# 检查状态
docker compose ps
docker compose logs -f postgres
docker compose logs -f redis
```

然后手动启动应用服务：

```bash
# 前端 (另开终端)
cd client-react && npm run dev

# Node.js 网关 (另开终端)
cd server-node && npm run dev

# Python 后端 (另开终端)
cd server-python && python run.py
```

## 常用命令

```bash
# 重新构建镜像
docker compose -f docker-compose.prod.yml build

# 重新构建单个服务
docker compose -f docker-compose.prod.yml build python-backend

# 查看实时日志
docker compose -f docker-compose.prod.yml logs -f python-backend

# 进入容器
docker exec -it antifraud-python bash
docker exec -it antifraud-gateway sh

# 停止所有服务
docker compose -f docker-compose.prod.yml down

# 停止并删除数据卷 (⚠️ 危险：会删除数据库数据)
docker compose -f docker-compose.prod.yml down -v

# 重启单个服务
docker compose -f docker-compose.prod.yml restart python-backend
```

## 数据库迁移

如果从旧版本升级，需要运行迁移：

```bash
# 进入 Python 容器
docker exec -it antifraud-python bash

# 运行迁移脚本
python -m scripts.migrate_alert_audit_fields
```

## 故障排查

### 1. 容器无法启动

```bash
# 查看详细日志
docker compose -f docker-compose.prod.yml logs python-backend

# 检查健康状态
docker inspect antifraud-python --format='{{.State.Health.Status}}'
```

### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
docker exec antifraud-postgres pg_isready -U antifraud

# 查看数据库日志
docker compose -f docker-compose.prod.yml logs postgres
```

### 3. Ollama 无法访问

```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 检查 Docker 网络连通性
docker exec antifraud-python curl http://host.docker.internal:11434/api/tags
```

### 4. 前端无法访问 API

```bash
# 检查网关健康状态
curl http://localhost:3001/health

# 检查 Nginx 日志
docker logs antifraud-frontend
```

## 生产环境建议

1. **修改默认密码**: 必须修改 `.env` 中的数据库密码和 SECRET_KEY
2. **HTTPS**: 使用反向代理 (如 Nginx/Traefik) 配置 SSL 证书
3. **备份**: 定期备份 PostgreSQL 数据卷
4. **监控**: 配置日志收集和监控告警
5. **防火墙**: 只开放必要端口 (80/443)

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | 80 | Web 界面 |
| Gateway | 3001 | API 网关 (内部) |
| Python | 8000 | AI 引擎 (内部) |
| PostgreSQL | 5432 | 数据库 (内部) |
| Redis | 6379 | 缓存 (内部) |
| Ollama | 11434 | LLM 服务 (宿主机) |
