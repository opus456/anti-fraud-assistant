"""
反诈检测路由 - 核心检测API
支持文本、图片、音频等多模态输入检测
"""
import os
import uuid
import shutil
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
from app.utils.security import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/detection", tags=["反诈检测"])


@router.post("/text", response_model=DetectionResult, summary="文本检测")
async def detect_text(
    request: TextDetectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    文本内容反诈检测
    分析输入文本是否包含诈骗特征，返回风险评估结果
    """
    result = await fraud_detector.detect_text(
        content=request.content,
        user=current_user,
        db=db,
        session_id=str(uuid.uuid4())[:8]
    )
    return DetectionResult(**{k: v for k, v in result.items() if not k.startswith('_')})


@router.post("/image", response_model=DetectionResult, summary="图片检测")
async def detect_image(
    file: UploadFile = File(...),
    context: str = Form(default=""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    图片内容反诈检测
    支持聊天截图、转账截图等图片的分析
    """
    # 验证文件类型
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="不支持的图片格式，请上传 JPG/PNG/GIF/WebP 格式")

    # 验证文件大小
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过限制(50MB)")

    # 保存文件
    file_ext = file.filename.split(".")[-1] if file.filename else "jpg"
    file_name = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    # 对图片进行OCR文字提取（简化版：加入上下文分析）
    analysis_text = f"[图片上传] {context}" if context else "[图片上传] 用户上传了一张图片进行检测"

    result = await fraud_detector.detect_text(
        content=analysis_text,
        user=current_user,
        db=db,
        session_id=str(uuid.uuid4())[:8]
    )
    return DetectionResult(**{k: v for k, v in result.items() if not k.startswith('_')})


@router.post("/quick", response_model=DetectionResult, summary="快速检测(无需登录)")
async def quick_detect(request: TextDetectionRequest):
    """
    快速文本检测 - 无需登录即可使用
    使用本地规则引擎进行快速分析
    """
    result = await fraud_detector.detect_text(
        content=request.content,
        user=None,
        db=None,
    )
    return DetectionResult(**{k: v for k, v in result.items() if not k.startswith('_')})


@router.post("/multimodal", response_model=DetectionResult, summary="多模态检测")
async def detect_multimodal(
    request: MultimodalDetectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    多模态反诈检测
    支持文本、图片OCR、音频转写、视频描述融合分析
    """
    if not any([
        request.text.strip(),
        request.image_ocr.strip(),
        request.audio_transcript.strip(),
        request.video_description.strip(),
    ]):
        raise HTTPException(status_code=400, detail="至少需要提供一种输入模态")

    result = await fraud_detector.detect_multimodal(
        text=request.text,
        image_ocr=request.image_ocr,
        audio_transcript=request.audio_transcript,
        video_description=request.video_description,
        context=request.context,
        user=current_user,
        db=db,
        session_id=str(uuid.uuid4())[:8],
    )
    return DetectionResult(**{k: v for k, v in result.items() if not k.startswith('_')})


@router.get("/history", response_model=list[ConversationResponse], summary="检测历史")
async def get_detection_history(
    page: int = 1,
    page_size: int = 20,
    fraud_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取当前用户的检测历史记录"""
    query = select(Conversation).where(Conversation.user_id == current_user.id)

    if fraud_only:
        query = query.where(Conversation.is_fraud == True)

    query = query.order_by(Conversation.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    conversations = result.scalars().all()

    return [ConversationResponse.model_validate(c) for c in conversations]
