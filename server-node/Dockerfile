# 反诈智能体助手 - Node.js 网关 Dockerfile
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装生产依赖 (使用 --omit=dev 而不是已弃用的 --only=production)
RUN npm ci --omit=dev && npm cache clean --force

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# 启动命令
CMD ["node", "src/index.js"]
