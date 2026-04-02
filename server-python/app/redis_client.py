"""
Redis 客户端 - 短期记忆与会话流
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional
import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

_pool: Optional[aioredis.Redis] = None
_pool_lock = asyncio.Lock()


async def get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        async with _pool_lock:
            # 双重检查，防止竞争条件
            if _pool is None:
                _pool = aioredis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                    max_connections=20,
                )
    return _pool


async def close_redis():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


class RedisMemory:
    """基于 Redis 的短期记忆存储"""

    SHORT_TERM_TTL = 86400  # 24 小时
    KEY_PREFIX = "memory:short:"

    async def push_interaction(self, user_id: int, data: dict):
        r = await get_redis()
        key = f"{self.KEY_PREFIX}{user_id}"
        await r.lpush(key, json.dumps(data, ensure_ascii=False))
        await r.ltrim(key, 0, 99)  # 最多保留 100 条
        await r.expire(key, self.SHORT_TERM_TTL)

    async def get_recent(self, user_id: int, count: int = 10) -> list[dict]:
        r = await get_redis()
        key = f"{self.KEY_PREFIX}{user_id}"
        items = await r.lrange(key, 0, count - 1)
        return [json.loads(item) for item in items]

    async def get_all_user_ids(self) -> list[int]:
        r = await get_redis()
        keys = []
        async for key in r.scan_iter(match=f"{self.KEY_PREFIX}*"):
            uid = key.replace(self.KEY_PREFIX, "")
            if uid.isdigit():
                keys.append(int(uid))
        return keys

    async def clear_user(self, user_id: int):
        r = await get_redis()
        await r.delete(f"{self.KEY_PREFIX}{user_id}")


redis_memory = RedisMemory()
