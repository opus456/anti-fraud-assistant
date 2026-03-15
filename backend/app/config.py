"""
反诈智能体助手 - 应用配置
包含所有系统配置项，支持通过 .env 文件或环境变量覆盖
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings

# 项目根路径
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """系统全局配置"""

    # ========== 应用基础配置 ==========
    APP_NAME: str = "反诈智能体助手"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ========== 安全配置 ==========
    SECRET_KEY: str = "anti-fraud-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24小时

    # ========== 数据库配置 ==========
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR / 'data' / 'anti_fraud.db'}"

    # ========== LLM 配置 ==========
    # 支持兼容 OpenAI 接口的任何 LLM 服务
    LLM_API_URL: str = "https://api-ai.gitcode.com/v1/chat/completions"
    LLM_API_KEY: str = "BKxf_NoAL7ciz_yxQsrKisME"
    LLM_MODEL: str = "Qwen/Qwen3.5-397B-A17B"
    LLM_MAX_TOKENS: int = 4096
    LLM_TEMPERATURE: float = 0.3

    # ========== 嵌入模型配置 ==========
    EMBEDDING_MODEL: str = "shibing624/text2vec-base-chinese"

    # ========== 风险阈值配置 ==========
    RISK_LOW_THRESHOLD: float = 0.3       # 低风险阈值
    RISK_MEDIUM_THRESHOLD: float = 0.6    # 中风险阈值
    RISK_HIGH_THRESHOLD: float = 0.85     # 高风险阈值
    DETECTION_FRAUD_THRESHOLD: float = 0.22  # 是否判定为诈骗的阈值（用于F1调优）

    # ========== 文件上传配置 ==========
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")

    # ========== CORS 配置 ==========
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

    # ========== 数据源路径 ==========
    DATA_SOURCE_DIR: str = str(BASE_DIR.parent.parent / "data")

    model_config = {
        "env_file": str(BASE_DIR / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


# 全局配置单例
settings = Settings()

# LLM_API_KEY 为空时自动回退到系统环境变量 ACCESS_TOKEN
if not settings.LLM_API_KEY:
    settings.LLM_API_KEY = os.environ.get("ACCESS_TOKEN", "")

# 确保必要目录存在
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(BASE_DIR / "data", exist_ok=True)
