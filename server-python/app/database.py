"""
PostgreSQL 异步数据库连接 (asyncpg + SQLAlchemy)
"""
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """应用启动时确保表结构存在"""
    async with engine.begin() as conn:
        # 首先确保 pgvector 扩展已启用
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            logger.info("pgvector 扩展已启用")
        except Exception as e:
            logger.warning(f"创建 pgvector 扩展失败: {e}")
        
        # 然后创建表结构
        await conn.run_sync(Base.metadata.create_all)
        logger.info("数据库表结构已初始化")


async def check_db_connection() -> bool:
    """检测数据库连通性，避免启动阶段因基础设施未就绪直接崩溃。"""
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning(f"数据库连接不可用: {exc}")
        return False
