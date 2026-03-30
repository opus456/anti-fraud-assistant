"""
记忆管理路由 - 获取用户记忆摘要 / 触发短期→长期记忆压缩
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas import MessageResponse
from app.services.memory_service import memory_service
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/memory", tags=["记忆管理"])


@router.get("/", summary="获取用户记忆摘要")
async def get_memory(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的短期交互记录和长期行为摘要"""
    data = await memory_service.get_user_memory(current_user.id, db)
    return {
        "user_id": current_user.id,
        "short_term": data.get("short_term", []),
        "long_term_summary": data.get("long_term_summary", ""),
    }


@router.post("/compress", response_model=MessageResponse, summary="触发记忆压缩")
async def compress_memory(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """将 Redis 中的短期交互记录压缩为长期行为摘要并存入 PostgreSQL"""
    await memory_service.compress_short_to_long(current_user.id, db)
    return MessageResponse(message="记忆压缩完成")
