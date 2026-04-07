"""
预警路由 - 预警列表 / 解除预警 / 审计日志
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AlertRecord, User, GuardianRelation
from app.schemas import AlertResponse, MessageResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["预警管理"])


class ResolveAlertRequest(BaseModel):
    """处理预警请求"""
    note: Optional[str] = ""  # 处理备注


class AlertDetailResponse(BaseModel):
    """预警详情响应"""
    id: int
    user_id: int
    username: Optional[str] = None
    nickname: Optional[str] = None
    alert_type: str
    risk_level: int
    fraud_type: Optional[str] = None
    title: str
    description: Optional[str] = None
    suggestion: Optional[str] = None
    report_json: Optional[dict] = None
    guardian_notified: bool
    is_resolved: bool
    resolved_by: Optional[int] = None
    resolver_name: Optional[str] = None
    resolve_note: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=list[AlertResponse], summary="预警列表")
async def list_alerts(
    is_resolved: bool | None = None,
    user_id: int | None = None,
    alert_type: str | None = None,
    page: int = 1,
    page_size: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    获取预警记录列表
    
    - 普通用户：只能看到自己的预警
    - 监护人：可以看到自己 + 被守护者的预警（包括 ward_alert 类型）
    - 管理员：可以看到所有预警
    """
    query = select(AlertRecord, User).join(User, AlertRecord.user_id == User.id)

    if current_user.role == "admin":
        if user_id is not None:
            query = query.where(AlertRecord.user_id == user_id)
    elif current_user.role == "guardian":
        # 监护人查看：自己的预警 + 被守护者的预警
        charges_result = await db.execute(
            select(GuardianRelation.user_id).where(
                GuardianRelation.guardian_id == current_user.id,
                GuardianRelation.is_active == True,
            )
        )
        charge_user_ids = [row[0] for row in charges_result.all()]
        
        # 包含自己的 ward_alert 和被守护者的所有预警
        all_user_ids = charge_user_ids + [current_user.id]
        query = query.where(AlertRecord.user_id.in_(all_user_ids))
    else:
        # 普通用户只能看自己的
        query = query.where(AlertRecord.user_id == current_user.id)

    if is_resolved is not None:
        query = query.where(AlertRecord.is_resolved == is_resolved)
    
    if alert_type:
        query = query.where(AlertRecord.alert_type == alert_type)

    query = query.order_by(AlertRecord.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rows = result.all()
    
    # 获取所有处理人ID
    resolved_by_ids = [alert.resolved_by for alert, _ in rows if alert.resolved_by]
    
    # 批量查询处理人信息
    resolver_map = {}
    if resolved_by_ids:
        resolver_result = await db.execute(
            select(User).where(User.id.in_(resolved_by_ids))
        )
        resolvers = resolver_result.all()
        resolver_map = {r[0].id: (r[0].nickname or r[0].username) for r in resolvers}
    
    # 构建响应，包含用户信息和处理人信息
    alerts_response = []
    for alert, user in rows:
        alert_dict = AlertResponse.model_validate(alert).model_dump()
        alert_dict['username'] = user.username
        alert_dict['nickname'] = user.nickname or user.username
        alert_dict['resolver_name'] = resolver_map.get(alert.resolved_by) if alert.resolved_by else None
        alerts_response.append(alert_dict)
    
    return alerts_response


@router.get("/stats", summary="预警统计")
async def get_alert_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取预警统计数据"""
    # 构建基础查询条件
    if current_user.role == "admin":
        base_filter = True
    elif current_user.role == "guardian":
        charges_result = await db.execute(
            select(GuardianRelation.user_id).where(
                GuardianRelation.guardian_id == current_user.id,
                GuardianRelation.is_active == True,
            )
        )
        charge_user_ids = [row[0] for row in charges_result.all()]
        all_user_ids = charge_user_ids + [current_user.id]
        base_filter = AlertRecord.user_id.in_(all_user_ids)
    else:
        base_filter = AlertRecord.user_id == current_user.id

    # 统计总数
    total_result = await db.execute(
        select(func.count(AlertRecord.id)).where(base_filter)
    )
    total = total_result.scalar() or 0

    # 待处理数
    pending_result = await db.execute(
        select(func.count(AlertRecord.id)).where(base_filter, AlertRecord.is_resolved == False)
    )
    pending = pending_result.scalar() or 0

    # 高风险数
    high_risk_result = await db.execute(
        select(func.count(AlertRecord.id)).where(base_filter, AlertRecord.risk_level >= 2)
    )
    high_risk = high_risk_result.scalar() or 0

    return {
        "total": total,
        "pending": pending,
        "resolved": total - pending,
        "high_risk": high_risk,
    }


@router.put("/{alert_id}/resolve", response_model=MessageResponse, summary="解除预警")
async def resolve_alert(
    alert_id: int,
    data: ResolveAlertRequest = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    将指定预警标记为已解决
    
    - 支持添加处理备注
    - 记录处理人和处理时间（审计日志）
    """
    if data is None:
        data = ResolveAlertRequest()
        
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
        all_user_ids = charge_user_ids + [current_user.id]

        result = await db.execute(
            select(AlertRecord).where(
                AlertRecord.id == alert_id,
                AlertRecord.user_id.in_(all_user_ids),
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

    # 更新预警状态
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = current_user.id  # 记录处理人
    alert.resolve_note = data.note or ""  # 记录处理备注
    
    await db.commit()
    return MessageResponse(message=f"预警已解除，处理人: {current_user.nickname or current_user.username}")


@router.get("/{alert_id}", summary="预警详情")
async def get_alert_detail(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单条预警的详细信息"""
    query = select(AlertRecord, User).join(User, AlertRecord.user_id == User.id).where(AlertRecord.id == alert_id)
    
    if current_user.role == "guardian":
        charges_result = await db.execute(
            select(GuardianRelation.user_id).where(
                GuardianRelation.guardian_id == current_user.id,
                GuardianRelation.is_active == True,
            )
        )
        charge_user_ids = [row[0] for row in charges_result.all()]
        all_user_ids = charge_user_ids + [current_user.id]
        query = query.where(AlertRecord.user_id.in_(all_user_ids))
    elif current_user.role != "admin":
        query = query.where(AlertRecord.user_id == current_user.id)
    
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="预警记录不存在")
    
    alert, user = row
    
    # 获取处理人信息
    resolver_name = None
    if alert.resolved_by:
        resolver_result = await db.execute(select(User).where(User.id == alert.resolved_by))
        resolver = resolver_result.scalar_one_or_none()
        if resolver:
            resolver_name = resolver.nickname or resolver.username
    
    return {
        "id": alert.id,
        "user_id": alert.user_id,
        "username": user.username,
        "nickname": user.nickname or user.username,
        "alert_type": alert.alert_type,
        "risk_level": alert.risk_level,
        "fraud_type": alert.fraud_type,
        "title": alert.title,
        "description": alert.description,
        "suggestion": alert.suggestion,
        "report_json": alert.report_json,
        "guardian_notified": alert.guardian_notified,
        "is_resolved": alert.is_resolved,
        "resolved_by": alert.resolved_by,
        "resolver_name": resolver_name,
        "resolve_note": alert.resolve_note,
        "resolved_at": (alert.resolved_at.isoformat() + 'Z') if alert.resolved_at else None,
        "created_at": (alert.created_at.isoformat() + 'Z') if alert.created_at else None,
    }
