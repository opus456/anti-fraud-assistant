"""
认证路由 - 用户注册、登录、信息获取
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Gender, UserRole
from app.schemas import UserRegister, UserLogin, UserProfile, TokenResponse, UserProfileUpdate, MessageResponse
from app.utils.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register", response_model=TokenResponse, summary="用户注册")
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """用户注册接口 - 创建账户并返回JWT令牌"""
    # 检查用户名是否已存在
    existing = await db.execute(
        select(User).where((User.username == data.username) | (User.email == data.email))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户名或邮箱已被注册")

    # 创建新用户
    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        nickname=data.nickname or data.username,
        age=data.age,
        gender=Gender(data.gender) if data.gender in [e.value for e in Gender] else Gender.OTHER,
        role_type=UserRole(data.role_type) if data.role_type in [e.value for e in UserRole] else UserRole.ADULT,
        occupation=data.occupation,
        education=data.education,
        province=data.province,
        city=data.city,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 生成令牌
    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserProfile.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse, summary="用户登录")
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """用户登录接口 - 验证凭证并返回JWT令牌"""
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="账户已被禁用")

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserProfile.model_validate(user)
    )


@router.get("/me", response_model=UserProfile, summary="获取当前用户信息")
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户的完整画像信息"""
    return UserProfile.model_validate(current_user)


@router.put("/me", response_model=UserProfile, summary="更新用户画像")
async def update_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新当前用户的画像信息"""
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if field == "gender" and value:
            setattr(current_user, field, Gender(value))
        elif field == "role_type" and value:
            setattr(current_user, field, UserRole(value))
        else:
            setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return UserProfile.model_validate(current_user)
