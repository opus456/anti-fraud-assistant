"""
APScheduler 定时任务 — 长短期记忆压缩
"""
import logging
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.redis_client import redis_memory
from app.services.memory_service import memory_service
from app.database import async_session

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def compress_all_user_memories():
    """每天遍历 Redis 短期记忆，压缩为长期画像"""
    logger.info("开始执行记忆压缩任务...")
    user_ids = await redis_memory.get_all_user_ids()
    logger.info(f"待压缩用户数: {len(user_ids)}")

    for user_id in user_ids:
        try:
            async with async_session() as db:
                await memory_service.compress_short_to_long(user_id, db)
        except Exception as e:
            logger.error(f"用户 {user_id} 记忆压缩失败: {e}")

    logger.info("记忆压缩任务完成")


def start_scheduler():
    scheduler.add_job(
        compress_all_user_memories,
        trigger="cron",
        hour=3,
        minute=0,
        id="memory_compress",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler 已启动，每日 03:00 执行记忆压缩")
