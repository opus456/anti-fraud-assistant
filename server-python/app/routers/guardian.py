"""
监护人路由 - 绑定 / 列表 / 解绑 / 被守护用户列表
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import GuardianRelation, User, Conversation, AlertRecord
from app.schemas import GuardianBind, GuardianRelationResponse, MessageResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/guardians", tags=["监护人"])


@router.post("/bind", response_model=GuardianRelationResponse, summary="绑定监护人")
async def bind_guardian(
    data: GuardianBind,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """通过监护人用户名绑定监护关系"""
    # 查找监护人账号
    result = await db.execute(
        select(User).where(User.username == data.guardian_username, User.is_active == True)
    )
    guardian = result.scalar_one_or_none()
    if not guardian:
        raise HTTPException(status_code=404, detail="监护人用户不存在")

    if guardian.id == current_user.id:
        raise HTTPException(status_code=400, detail="不能将自己设为监护人")

    # 检查是否已绑定
    existing = await db.execute(
        select(GuardianRelation).where(
            GuardianRelation.user_id == current_user.id,
            GuardianRelation.guardian_id == guardian.id,
            GuardianRelation.is_active == True,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="已绑定该监护人")

    # 限制最多 5 个监护人
    count_result = await db.execute(
        select(func.count(GuardianRelation.id)).where(
            GuardianRelation.user_id == current_user.id,
            GuardianRelation.is_active == True,
        )
    )
    if (count_result.scalar() or 0) >= 5:
        raise HTTPException(status_code=400, detail="最多只能绑定 5 个监护人")

    relation = GuardianRelation(
        user_id=current_user.id,
        guardian_id=guardian.id,
        relation_type=data.relationship,
        is_primary=data.is_primary,
    )
    db.add(relation)
    await db.commit()
    await db.refresh(relation)

    return GuardianRelationResponse(
        id=relation.id,
        guardian_id=guardian.id,
        guardian_username=guardian.username,
        guardian_nickname=guardian.nickname or guardian.username,
        relationship=relation.relation_type,
        is_primary=relation.is_primary,
        created_at=relation.created_at,
    )


@router.get("/", response_model=list[GuardianRelationResponse], summary="我的监护人列表")
async def list_guardians(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户绑定的所有监护人"""
    result = await db.execute(
        select(GuardianRelation, User)
        .join(User, GuardianRelation.guardian_id == User.id)
        .where(
            GuardianRelation.user_id == current_user.id,
            GuardianRelation.is_active == True,
        )
        .order_by(GuardianRelation.is_primary.desc(), GuardianRelation.created_at.desc())
    )
    rows = result.all()

    return [
        GuardianRelationResponse(
            id=rel.id,
            guardian_id=guardian.id,
            guardian_username=guardian.username,
            guardian_nickname=guardian.nickname or guardian.username,
            relationship=rel.relation_type,
            is_primary=rel.is_primary,
            created_at=rel.created_at,
        )
        for rel, guardian in rows
    ]


@router.delete("/{relation_id}", response_model=MessageResponse, summary="解除监护关系")
async def unbind_guardian(
    relation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """解除指定的监护关系"""
    result = await db.execute(
        select(GuardianRelation).where(
            GuardianRelation.id == relation_id,
            GuardianRelation.user_id == current_user.id,
        )
    )
    relation = result.scalar_one_or_none()
    if not relation:
        raise HTTPException(status_code=404, detail="监护关系不存在")

    relation.is_active = False
    await db.commit()
    return MessageResponse(message="监护关系已解除")


@router.get("/charges", summary="我守护的用户列表")
async def list_charges(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户作为监护人所守护的用户列表"""
    result = await db.execute(
        select(GuardianRelation, User)
        .join(User, GuardianRelation.user_id == User.id)
        .where(
            GuardianRelation.guardian_id == current_user.id,
            GuardianRelation.is_active == True,
        )
        .order_by(GuardianRelation.created_at.desc())
    )
    rows = result.all()

    return [
        {
            "relation_id": rel.id,
            "user_id": user.id,
            "username": user.username,
            "nickname": user.nickname or user.username,
            "age": user.age,
            "role_type": user.role_type,
            "risk_score": user.risk_score,
            "total_detections": user.total_detections,
            "fraud_hits": user.fraud_hits,
            "relationship": rel.relation_type,
            "is_primary": rel.is_primary,
            "created_at": (rel.created_at.isoformat() + 'Z') if rel.created_at else None,
        }
        for rel, user in rows
    ]


@router.post("/notify", response_model=MessageResponse, summary="发送通知给被守护者")
async def notify_charge(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """作为监护人向被守护者发送通知/提醒"""
    user_id = data.get("user_id")
    message = data.get("message", "您的监护人发来一条安全提醒")

    if not user_id:
        raise HTTPException(status_code=400, detail="缺少 user_id")

    # 验证守护关系
    result = await db.execute(
        select(GuardianRelation).where(
            GuardianRelation.guardian_id == current_user.id,
            GuardianRelation.user_id == user_id,
            GuardianRelation.is_active == True,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="没有守护此用户的权限")

    # TODO: 实际发送通知（集成阿里云短信/推送等）
    # 这里先返回成功，后续可对接真实通知服务
    return MessageResponse(message=f"通知已发送: {message[:50]}")


@router.post("/emergency", response_model=MessageResponse, summary="紧急通报")
async def emergency_alert(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """一键向所有监护人发送紧急求助"""
    # 获取所有监护人
    result = await db.execute(
        select(GuardianRelation, User)
        .join(User, GuardianRelation.guardian_id == User.id)
        .where(
            GuardianRelation.user_id == current_user.id,
            GuardianRelation.is_active == True,
        )
    )
    guardians = result.all()

    if not guardians:
        raise HTTPException(status_code=400, detail="暂无绑定的监护人")

    # 为每位监护人创建一条 ward_alert 类型的预警记录
    guardian_names = []
    for rel, guardian in guardians:
        guardian_names.append(guardian.nickname or guardian.username)
        alert = AlertRecord(
            user_id=guardian.id,  # 预警接收方是监护人
            alert_type="ward_alert",
            risk_level=3,
            title=f"紧急求助：{current_user.nickname or current_user.username} 发来一键求助",
            description=f"您守护的用户 {current_user.nickname or current_user.username} 触发了一键紧急求助，请立即联系确认安全。",
            suggestion="请立即拨打对方电话确认安全状况，必要时联系当地警方。",
            report_json={
                "ward_user_id": current_user.id,
                "ward_username": current_user.username,
                "ward_nickname": current_user.nickname or current_user.username,
                "emergency_time": datetime.utcnow().isoformat(),
            },
            guardian_notified=True,
            is_resolved=False,
            created_at=datetime.utcnow(),
        )
        db.add(alert)

    await db.commit()
    return MessageResponse(message=f"已向 {len(guardians)} 位监护人发送紧急求助: {', '.join(guardian_names)}")


@router.get("/detections", summary="我守护用户的全部检测记录")
async def list_charge_detections(
    page: int = 1,
    page_size: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """监护人查看被守护用户的检测记录"""
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)

    result = await db.execute(
        select(Conversation, User)
        .join(User, Conversation.user_id == User.id)
        .join(
            GuardianRelation,
            (GuardianRelation.user_id == User.id)
            & (GuardianRelation.guardian_id == current_user.id)
            & (GuardianRelation.is_active == True),
        )
        .order_by(Conversation.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = result.all()

    items = []
    for conv, user in rows:
        items.append(
            {
                "id": conv.id,
                "user_id": user.id,
                "username": user.username,
                "nickname": user.nickname or user.username,
                "input_type": conv.input_type,
                "input_content": conv.input_content,
                "is_fraud": conv.is_fraud,
                "risk_level": conv.risk_level,
                "risk_score": conv.risk_score,
                "fraud_type": conv.fraud_type,
                "response_time_ms": conv.response_time_ms,
                "created_at": (conv.created_at.isoformat() + 'Z') if conv.created_at else None,
            }
        )

    return {"items": items, "page": page, "page_size": page_size}


@router.get("/pending-alerts", summary="获取待处理的预警数量")
async def get_pending_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户（作为监护人）未处理的预警数量"""
    # 统计未处理的 ward_alert 类型的警报
    result = await db.execute(
        select(func.count(AlertRecord.id)).where(
            AlertRecord.user_id == current_user.id,
            AlertRecord.alert_type == "ward_alert",
            AlertRecord.is_resolved == False,
        )
    )
    pending_count = result.scalar() or 0
    
    # 获取最近的预警列表（最多5条）
    alerts_result = await db.execute(
        select(AlertRecord)
        .where(
            AlertRecord.user_id == current_user.id,
            AlertRecord.alert_type == "ward_alert",
            AlertRecord.is_resolved == False,
        )
        .order_by(AlertRecord.created_at.desc())
        .limit(5)
    )
    recent_alerts = alerts_result.scalars().all()
    
    return {
        "pending_count": pending_count,
        "recent_alerts": [
            {
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "risk_level": a.risk_level,
                "fraud_type": a.fraud_type,
                "suggestion": a.suggestion,
                "created_at": (a.created_at.isoformat() + 'Z') if a.created_at else None,
                "ward_user_id": a.report_json.get("ward_user_id") if isinstance(a.report_json, dict) else None,
                "ward_username": a.report_json.get("ward_username") if isinstance(a.report_json, dict) else None,
                "ward_nickname": a.report_json.get("ward_nickname") if isinstance(a.report_json, dict) else None,
            }
            for a in recent_alerts
        ],
    }
