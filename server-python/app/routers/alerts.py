"""
预警路由 - 预警列表 / 解除预警
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AlertRecord, User, GuardianRelation
from app.schemas import AlertResponse, MessageResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["预警管理"])


@router.get("/", response_model=list[AlertResponse], summary="预警列表")
async def list_alerts(
    is_resolved: bool | None = None,
    user_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的预警记录，可按 is_resolved 过滤"""
    query = select(AlertRecord)

    if current_user.role == "admin":
        if user_id is not None:
            query = query.where(AlertRecord.user_id == user_id)
    elif current_user.role == "guardian":
        charges_result = await db.execute(
            select(GuardianRelation.user_id).where(
                GuardianRelation.guardian_id == current_user.id,
                GuardianRelation.is_active == True,
            )
        )
        charge_user_ids = [row[0] for row in charges_result.all()]
        if not charge_user_ids:
            return []

        if user_id is not None:
            if user_id not in charge_user_ids:
                return []
            query = query.where(AlertRecord.user_id == user_id)
        else:
            query = query.where(AlertRecord.user_id.in_(charge_user_ids))
    else:
        query = query.where(AlertRecord.user_id == current_user.id)

    if is_resolved is not None:
        query = query.where(AlertRecord.is_resolved == is_resolved)

    query = query.order_by(AlertRecord.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    alerts = result.scalars().all()
    return [AlertResponse.model_validate(a) for a in alerts]


@router.put("/{alert_id}/resolve", response_model=MessageResponse, summary="解除预警")
async def resolve_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """将指定预警标记为已解决"""
    if current_user.role == "admin":
        result = await db.execute(select(AlertRecord).where(AlertRecord.id == alert_id))
    elif current_user.role == "guardian":
        charges_result = await db.execute(
            select(GuardianRelation.user_id).where(
                GuardianRelation.guardian_id == current_user.id,
                GuardianRelation.is_active == True,
            )
        )
        charge_user_ids = [row[0] for row in charges_result.all()]
        if not charge_user_ids:
            raise HTTPException(status_code=404, detail="预警记录不存在")

        result = await db.execute(
            select(AlertRecord).where(
                AlertRecord.id == alert_id,
                AlertRecord.user_id.in_(charge_user_ids),
            )
        )
    else:
        result = await db.execute(
            select(AlertRecord).where(
                AlertRecord.id == alert_id,
                AlertRecord.user_id == current_user.id,
            )
        )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="预警记录不存在")

    if alert.is_resolved:
        return MessageResponse(message="该预警已处于解决状态")

    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    await db.commit()
    return MessageResponse(message="预警已解除")
