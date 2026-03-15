FROM python:3.13-slim

WORKDIR /app

# 安装系统依赖（jieba/scikit-learn 编译需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# 先复制 requirements.txt 利用 Docker 缓存
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制后端代码
COPY app/ ./app/
COPY run.py .
COPY scripts/ ./scripts/
COPY entrypoint.sh .
COPY data_source/ ./data_source/

# 创建必要目录
RUN mkdir -p data uploads && \
    chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
