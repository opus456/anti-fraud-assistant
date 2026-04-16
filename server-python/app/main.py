"""
反诈智能体助手 - FastAPI 主应用
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, check_db_connection
from app.redis_client import close_redis
from app.routers import auth, detection, knowledge, guardian, statistics, reports, alerts, evolve, memory

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# 减少 SQLAlchemy 和 uvicorn 的日志输出，避免终端刷屏
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db_ready = False
    logger.info("正在初始化数据库...")
    if await check_db_connection():
        await init_db()
        app.state.db_ready = True
        logger.info("数据库初始化完成")
    else:
        logger.warning("数据库未就绪，服务将以降级模式启动；部分接口不可用")

    # 启动定时任务
    if app.state.db_ready:
        try:
            from tasks.memory_scheduler import start_scheduler
            start_scheduler()
        except Exception as e:
            logger.warning(f"定时任务启动失败: {e}")
    else:
        logger.warning("数据库未就绪，已跳过定时任务启动")

    logger.info(f"反诈智能体助手 v{settings.APP_VERSION} 已启动")
    logger.info(f"API: http://{settings.HOST}:{settings.PORT}")
    yield
    await close_redis()
    logger.info("服务正在关闭...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="多模态反诈智能体助手 — 感知-决策-干预-进化",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(detection.router)
app.include_router(knowledge.router)
app.include_router(guardian.router)
app.include_router(statistics.router)
app.include_router(reports.router)
app.include_router(alerts.router)
app.include_router(evolve.router)
app.include_router(memory.router)


@app.get("/", tags=["系统"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health", tags=["系统"])
async def health_check():
    db_ready = await check_db_connection()
    if not db_ready:
        return {
            "status": "degraded",
            "database": "unavailable",
            "knowledge_base": None,
        }

    from app.services.rag_service import rag_service

    try:
        kb_stats = await rag_service.get_stats()
    except Exception as exc:
        logger.warning(f"健康检查读取知识库统计失败: {exc}")
        return {
            "status": "degraded",
            "database": "available",
            "knowledge_base": None,
        }

    return {
        "status": "healthy",
        "database": "available",
        "knowledge_base": kb_stats,
    }
