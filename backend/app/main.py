"""
反诈智能体助手 - FastAPI 主应用
入口文件: 注册所有路由、中间件、启动事件
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.routers import auth, detection, knowledge, guardian, statistics, reports, alerts, realtime

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化数据库
    logger.info("🚀 正在初始化数据库...")
    await init_db()
    logger.info("✅ 数据库初始化完成")

    logger.info(f"✅ 反诈智能体助手 v{settings.APP_VERSION} 已启动")
    logger.info(f"📡 API地址: http://{settings.HOST}:{settings.PORT}")
    logger.info(f"📚 API文档: http://localhost:{settings.PORT}/docs")

    yield

    logger.info("🛑 服务正在关闭...")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="多模态反诈智能体助手 - 基于AI的全民反诈智能防护系统",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 跨域中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(detection.router)
app.include_router(knowledge.router)
app.include_router(guardian.router)
app.include_router(statistics.router)
app.include_router(reports.router)
app.include_router(alerts.router)
app.include_router(realtime.router)


# 根路径
@app.get("/", tags=["系统"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": f"http://localhost:{settings.PORT}/docs"
    }


@app.get("/health", tags=["系统"])
async def health_check():
    """健康检查接口"""
    from app.services.knowledge_service import knowledge_service
    kb_stats = knowledge_service.get_stats()
    return {
        "status": "healthy",
        "knowledge_base": kb_stats
    }
