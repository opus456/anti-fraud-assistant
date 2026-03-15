# ============ Stage 1: 构建前端 ============
FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ .
RUN npx vite build

# ============ Stage 2: 最终镜像（Python + nginx） ============
FROM python:3.13-slim

WORKDIR /app

# 安装系统依赖：gcc(编译) + nginx + supervisord
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ nginx supervisor && \
    rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制后端代码
COPY backend/app/ ./app/
COPY backend/run.py .
COPY backend/scripts/ ./scripts/
COPY backend/data_source/ ./data_source/

# 复制前端构建产物到 nginx 目录
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# 复制配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY supervisord.conf /etc/supervisor/conf.d/app.conf
COPY entrypoint.sh .

# 删除 nginx 默认配置（避免冲突）
RUN rm -f /etc/nginx/sites-enabled/default

# 创建必要目录
RUN mkdir -p data uploads && chmod +x entrypoint.sh

EXPOSE 80

ENTRYPOINT ["./entrypoint.sh"]
