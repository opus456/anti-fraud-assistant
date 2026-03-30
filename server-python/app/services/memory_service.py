"""
长短期记忆服务 — Redis (短期) + PostgreSQL (长期)
"""
import json
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserMemoryLog
from app.redis_client import redis_memory
from app.services.llm_service import call_llm_text

logger = logging.getLogger(__name__)


class MemoryService:

    async def get_user_memory(self, user_id: int, db: AsyncSession) -> dict:
        """获取用户完整记忆"""
        short_term = await redis_memory.get_recent(user_id, count=20)

        result = await db.execute(
            select(UserMemoryLog)
            .where(UserMemoryLog.user_id == user_id)
            .order_by(UserMemoryLog.updated_at.desc())
            .limit(1)
        )
        log = result.scalar_one_or_none()
        long_term = log.long_term_summary if log else ""

        return {
            "short_term": short_term,
            "long_term_summary": long_term,
        }

    async def compress_short_to_long(self, user_id: int, db: AsyncSession):
        """压缩短期记忆为长期摘要"""
        short_term = await redis_memory.get_recent(user_id, count=50)
        if not short_term:
            return

        interactions_text = "\n".join(
            f"- {'⚠️诈骗' if item.get('is_fraud') else '✅安全'} "
            f"(风险:{item.get('risk_score', 0):.2f}) "
            f"{item.get('fraud_type', '')} "
            f"{item.get('content', '')[:80]}"
            for item in short_term
        )

        prompt = f"""请将以下用户近期交互记录压缩为一段简短的用户行为画像摘要（不超过200字）：

{interactions_text}

请总结用户的：
1. 常见风险接触类型
2. 风险意识水平
3. 需要特别关注的点

直接输出摘要文本，不要输出JSON。"""

        system_prompt = "你是用户行为分析师，请将用户交互记录压缩为简洁的画像摘要。"

        try:
            summary = await call_llm_text(prompt, system_prompt=system_prompt, temperature=0.3)
            if not summary:
                summary = (
                    f"近期共 {len(short_term)} 次交互，"
                    f"其中 {sum(1 for i in short_term if i.get('is_fraud'))} 次触发风险预警。"
                )
        except Exception as e:
            logger.warning(f"LLM 压缩摘要失败: {e}")
            summary = f"近期共 {len(short_term)} 次交互。"

        # 写入 PostgreSQL
        existing = await db.execute(
            select(UserMemoryLog).where(UserMemoryLog.user_id == user_id)
        )
        log = existing.scalar_one_or_none()
        if log:
            log.long_term_summary = summary
            log.short_term_context = json.dumps(short_term[:10], ensure_ascii=False)
            log.updated_at = datetime.utcnow()
        else:
            log = UserMemoryLog(
                user_id=user_id,
                short_term_context=json.dumps(short_term[:10], ensure_ascii=False),
                long_term_summary=summary,
            )
            db.add(log)

        await db.commit()
        logger.info(f"用户 {user_id} 长期记忆已更新")

        # 清除 Redis 短期记忆
        await redis_memory.clear_user(user_id)


memory_service = MemoryService()
