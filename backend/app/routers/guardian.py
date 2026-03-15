"""
监护人路由 - 监护人管理与联动
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Guardian
from app.schemas import GuardianCreate, GuardianResponse, MessageResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/guardians", tags=["监护人"])


@router.get("/", response_model=list[GuardianResponse], summary="获取监护人列表")
async def get_guardians(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取当前用户的所有监护人"""
    result = await db.execute(
        select(Guardian)
        .where(Guardian.user_id == current_user.id, Guardian.is_active == True)
        .order_by(Guardian.is_primary.desc())
    )
    return [GuardianResponse.model_validate(g) for g in result.scalars().all()]


@router.post("/", response_model=GuardianResponse, summary="添加监护人")
async def add_guardian(
    data: GuardianCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """添加新的监护人联系方式"""
    # 限制最多5个监护人
    count_result = await db.execute(
        select(Guardian).where(
            Guardian.user_id == current_user.id,
            Guardian.is_active == True
        )
    )
    if len(count_result.scalars().all()) >= 5:
        raise HTTPException(status_code=400, detail="最多只能设置5个监护人")

    guardian = Guardian(
        user_id=current_user.id,
        name=data.name,
        phone=data.phone,
        email=data.email,
        relationship_type=data.relationship_type,
        is_primary=data.is_primary
    )
    db.add(guardian)
    await db.commit()
    await db.refresh(guardian)
    return GuardianResponse.model_validate(guardian)


@router.put("/{guardian_id}", response_model=GuardianResponse, summary="更新监护人信息")
async def update_guardian(
    guardian_id: int,
    data: GuardianCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新监护人信息"""
    result = await db.execute(
        select(Guardian).where(
            Guardian.id == guardian_id,
            Guardian.user_id == current_user.id
        )
    )
    guardian = result.scalar_one_or_none()
    if not guardian:
        raise HTTPException(status_code=404, detail="监护人不存在")

    guardian.name = data.name
    guardian.phone = data.phone
    guardian.email = data.email
    guardian.relationship_type = data.relationship_type
    guardian.is_primary = data.is_primary

    await db.commit()
    await db.refresh(guardian)
    return GuardianResponse.model_validate(guardian)


@router.delete("/{guardian_id}", response_model=MessageResponse, summary="删除监护人")
async def delete_guardian(
    guardian_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """删除指定监护人"""
    result = await db.execute(
        select(Guardian).where(
            Guardian.id == guardian_id,
            Guardian.user_id == current_user.id
        )
    )
    guardian = result.scalar_one_or_none()
    if not guardian:
        raise HTTPException(status_code=404, detail="监护人不存在")

    guardian.is_active = False
    await db.commit()
    return MessageResponse(message="监护人已删除")


@router.post("/{guardian_id}/notify", response_model=MessageResponse, summary="向监护人发送通知")
async def notify_guardian(
    guardian_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    手动向监护人发送安全通知
    (实际生产环境中需集成短信/电话API)
    """
    result = await db.execute(
        select(Guardian).where(
            Guardian.id == guardian_id,
            Guardian.user_id == current_user.id,
            Guardian.is_active == True
        )
    )
    guardian = result.scalar_one_or_none()
    if not guardian:
        raise HTTPException(status_code=404, detail="监护人不存在")

    # 模拟发送通知（实际项目中接入短信API如阿里云/腾讯云短信服务）
    return MessageResponse(
        message=f"已向监护人 {guardian.name}({guardian.phone}) 发送安全通知",
        success=True
    )
