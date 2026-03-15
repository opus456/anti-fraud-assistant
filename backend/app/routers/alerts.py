"""
预警记录路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Alert
from app.schemas import AlertResponse, MessageResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["预警记录"])


@router.get("/", response_model=list[AlertResponse], summary="获取预警列表")
async def get_alerts(
    page: int = 1,
    page_size: int = 20,
    unresolved_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取当前用户的预警记录"""
    query = select(Alert).where(Alert.user_id == current_user.id)

    if unresolved_only:
        query = query.where(Alert.is_resolved == False)

    query = query.order_by(Alert.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    return [AlertResponse.model_validate(a) for a in result.scalars().all()]


@router.put("/{alert_id}/resolve", response_model=MessageResponse, summary="标记预警已处理")
async def resolve_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """将预警标记为已处理"""
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="预警不存在")

    from datetime import datetime
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    await db.commit()

    return MessageResponse(message="预警已标记为已处理")
