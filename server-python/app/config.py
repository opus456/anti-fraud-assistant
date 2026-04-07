"""
反诈智能体助手 - 应用配置
"""
from __future__ import annotations

import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # ========== 应用基础 ==========
    APP_NAME: str = "反诈智能体助手"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ========== 安全 ==========
    SECRET_KEY: str = "anti-fraud-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # ========== PostgreSQL ==========
    DATABASE_URL: str = "postgresql+asyncpg://antifraud:antifraud123@localhost:5432/antifraud"

    # ========== Redis ==========
    REDIS_URL: str = "redis://localhost:6379/0"

    # ========== LLM ==========
    LLM_API_URL: str = "https://api-ai.gitcode.com/v1/chat/completions"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "Qwen/Qwen3.5-397B-A17B"
    LLM_MAX_TOKENS: int = 512  # 减少token数量，加速响应
    LLM_TEMPERATURE: float = 0.2  # 更低的温度，更确定性的输出

    # ========== Ollama 本地模型 ==========
    USE_LOCAL_LLM: bool = True  # 是否使用本地 Ollama 模型
    OLLAMA_BASE_URL: str = "http://localhost:11434"  # Ollama 服务地址
    OLLAMA_MODEL: str = "gemma4:e4b"  # 本地多模态模型 (支持文本/图像/音频)
    OLLAMA_VISION_MODEL: str = "gemma4:e4b"  # 视觉模型 (多模态分析)
    OLLAMA_TIMEOUT: float = 90.0  # 90秒超时 (多模态需要更长时间)
    ALWAYS_USE_LLM: bool = True  # 每次检测都使用 LLM（提高准确率）

    # ========== Embedding (RAG/进化) ==========
    EMBEDDING_API_URL: str = "https://api-ai.gitcode.com/v1"
    EMBEDDING_MODEL: str = "BAAI/bge-m3"

    # ========== 风险阈值 ==========
    RISK_LOW_THRESHOLD: float = 0.3
    RISK_MEDIUM_THRESHOLD: float = 0.6
    RISK_HIGH_THRESHOLD: float = 0.85
    DETECTION_FRAUD_THRESHOLD: float = 0.22

    # ========== 文件上传 ==========
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")

    # ========== CORS ==========
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
    ]

    # ========== Node.js 网关回调 ==========
    NODE_GATEWAY_URL: str = "http://localhost:3001"

    model_config = {
        "env_file": str(BASE_DIR / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()

if not settings.LLM_API_KEY:
    settings.LLM_API_KEY = os.environ.get("ACCESS_TOKEN", "")

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
