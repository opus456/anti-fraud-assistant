#!/bin/bash
set -e

echo "=== 反诈智能体助手 Docker 启动 ==="

# 创建 supervisor 日志目录
mkdir -p /var/log/supervisor

# 检查知识库是否已初始化（DB文件大于50KB说明已有数据）
DB_FILE="/app/data/anti_fraud.db"
if [ ! -f "$DB_FILE" ] || [ $(stat -c%s "$DB_FILE" 2>/dev/null || echo 0) -lt 51200 ]; then
    echo "📚 首次启动，正在初始化知识库..."
    cd /app && python scripts/init_knowledge.py
    echo "✅ 知识库初始化完成"
else
    echo "✅ 知识库已存在，跳过初始化"
fi

# 用 supervisord 同时管理 nginx + 后端
echo "🚀 启动反诈智能体助手..."
exec supervisord -c /etc/supervisor/conf.d/app.conf
