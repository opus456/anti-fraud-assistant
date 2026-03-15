#!/bin/bash
set -e

echo "=== 反诈智能体助手 Docker 启动 ==="

# 检查知识库是否已初始化（DB文件大于50KB说明已有数据）
DB_FILE="/app/data/anti_fraud.db"
if [ ! -f "$DB_FILE" ] || [ $(stat -f%z "$DB_FILE" 2>/dev/null || stat -c%s "$DB_FILE" 2>/dev/null) -lt 51200 ]; then
    echo "📚 首次启动，正在初始化知识库..."
    cd /app && python scripts/init_knowledge.py
    echo "✅ 知识库初始化完成"
else
    echo "✅ 知识库已存在，跳过初始化"
fi

# 启动后端服务
echo "🚀 启动反诈智能体助手后端..."
exec python run.py
