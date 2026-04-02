"""
反诈检测路由 - 文本 / 图片 / 快速 / 多模态检测 + 历史记录
"""
from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Conversation
from app.schemas import (
    TextDetectionRequest,
    MultimodalDetectionRequest,
    DetectionResult,
    ConversationResponse,
)
from app.services.fraud_detector import fraud_detector
from app.utils.security import get_current_user, get_current_user_optional
from app.config import settings

router = APIRouter(prefix="/api/detection", tags=["反诈检测"])


@router.post("/text", response_model=DetectionResult, summary="文本检测")
async def detect_text(
    request: TextDetectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """文本内容反诈检测 — 分析输入文本是否包含诈骗特征并返回风险评估"""
    result = await fraud_detector.detect_text(
        content=request.content,
        user=current_user,
        db=db,
        session_id=str(uuid.uuid4())[:8],
    )
    return DetectionResult(**{k: v for k, v in result.items() if not k.startswith("_")})


@router.post("/image", response_model=DetectionResult, summary="图片检测")
async def detect_image(
    file: UploadFile = File(...),
    context: str = Form(default=""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """图片内容反诈检测 — 支持聊天截图、转账截图等"""
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="不支持的图片格式，请上传 JPG/PNG/GIF/WebP 格式")

    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过限制(50MB)")

    # 保存文件 - 验证并清理文件扩展名防止路径注入
    import re
    file_ext = "jpg"  # 默认扩展名
    if file.filename:
        ext_match = re.match(r'^[a-zA-Z0-9]+$', file.filename.split(".")[-1])
        if ext_match:
            file_ext = ext_match.group(0).lower()
    file_name = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    # OCR 占位：将上下文信息传入检测引擎
    analysis_text = f"[图片上传] {context}" if context else "[图片上传] 用户上传了一张图片进行检测"

    result = await fraud_detector.detect_text(
        content=analysis_text,
        user=current_user,
        db=db,
        session_id=str(uuid.uuid4())[:8],
    )
    return DetectionResult(**{k: v for k, v in result.items() if not k.startswith("_")})


@router.post("/quick", response_model=DetectionResult, summary="快速检测(无需登录)")
async def quick_detect(
    request: TextDetectionRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """快速文本检测 — 无需登录即可使用，登录用户可保存记录"""
    result = await fraud_detector.detect_text(
        content=request.content,
        user=current_user,
        db=db if current_user else None,
    )
    return DetectionResult(**{k: v for k, v in result.items() if not k.startswith("_")})


@router.post("/multimodal", response_model=DetectionResult, summary="多模态检测")
async def detect_multimodal(
    request: MultimodalDetectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """多模态反诈检测 — 文本 / 图片OCR / 音频转写 / 视频描述融合分析"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # 检查是否有任何有效输入（包括 image_frame）
        if not any([
            request.text.strip(),
            request.image_ocr.strip(),
            request.image_frame.strip(),  # 添加 image_frame 检查
            request.audio_transcript.strip(),
            request.video_description.strip(),
        ]):
            raise HTTPException(status_code=400, detail="至少需要提供一种输入模态")

        # 如果有 image_frame 但没有 image_ocr，自动设置标记
        image_ocr = request.image_ocr
        if not image_ocr.strip() and request.image_frame.strip():
            image_ocr = "SCREEN_FRAME_CAPTURED"
            logger.debug(f"收到图片帧，大小: {len(request.image_frame)} 字符")

        result = await fraud_detector.detect_multimodal(
            text=request.text,
            image_ocr=image_ocr,
            audio_transcript=request.audio_transcript,
            video_description=request.video_description,
            context=request.context,
            user=current_user,
            db=db,
            session_id=str(uuid.uuid4())[:8],
        )
        return DetectionResult(**{k: v for k, v in result.items() if not k.startswith("_")})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"多模态检测异常: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"检测服务内部错误: {str(e)}")


@router.get("/history", response_model=list[ConversationResponse], summary="检测历史")
async def get_detection_history(
    page: int = 1,
    page_size: int = 20,
    fraud_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的检测历史记录（分页）"""
    query = select(Conversation).where(Conversation.user_id == current_user.id)

    if fraud_only:
        query = query.where(Conversation.is_fraud == True)

    query = query.order_by(Conversation.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    conversations = result.scalars().all()
    return [ConversationResponse.model_validate(c) for c in conversations]
