"""
监护人路由 - 绑定 / 列表 / 解绑 / 被守护用户列表
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import GuardianRelation, User, Conversation
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
            "created_at": rel.created_at.isoformat() if rel.created_at else None,
        }
        for rel, user in rows
    ]


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
                "created_at": conv.created_at.isoformat() if conv.created_at else None,
            }
        )

    return {"items": items, "page": page, "page_size": page_size}
