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
    """图片内容反诈检测 — 使用多模态LLM分析聊天截图、转账截图等"""
    import logging
    logger = logging.getLogger(__name__)
    
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

    # 使用多模态 LLM 分析图片
    from app.services.llm_service import call_ollama_vision
    
    vision_prompt = f"请分析这张图片是否存在诈骗风险。{context}" if context else "请分析这张图片是否存在诈骗风险，识别图片中的文字内容并判断是否涉及诈骗。"
    
    try:
        vision_result = await call_ollama_vision(
            prompt=vision_prompt,
            image_data=contents,
            timeout=90.0,
        )
        logger.info(f"图片视觉分析结果: {vision_result}")
    except Exception as e:
        logger.warning(f"视觉分析失败: {e}")
        vision_result = None

    # 构建分析文本
    if vision_result:
        detected_text = vision_result.get("detected_text", "")
        reason = vision_result.get("reason", "")
        analysis_text = f"[图片分析] {reason}"
        if detected_text:
            analysis_text += f"\n识别到的文字: {detected_text}"
        if context:
            analysis_text = f"{context}\n{analysis_text}"
    else:
        analysis_text = f"[图片上传] {context}" if context else "[图片上传] 用户上传了一张图片进行检测"

    result = await fraud_detector.detect_text(
        content=analysis_text,
        user=current_user,
        db=db,
        session_id=str(uuid.uuid4())[:8],
        # 如果视觉分析有结果，传入预判断的风险等级
        preset_risk=vision_result,
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


@router.post("/audio", response_model=DetectionResult, summary="音频检测")
async def detect_audio(
    file: UploadFile = File(...),
    context: str = Form(default=""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """音频内容反诈检测 — 支持语音消息、通话录音等"""
    import logging
    logger = logging.getLogger(__name__)
    
    allowed_types = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/m4a", "audio/ogg", "audio/webm"]
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="不支持的音频格式，请上传 MP3/WAV/M4A/OGG 格式")

    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过限制(50MB)")

    # 导入多模态服务进行语音转写
    from app.services.multimodal_service import multimodal_service
    
    try:
        transcript = await multimodal_service.transcribe_audio(contents)
        logger.info(f"音频转写结果: {transcript[:100] if transcript else '无'}...")
    except Exception as e:
        logger.warning(f"音频转写失败: {e}")
        transcript = "[音频内容待转写]"
    
    # 合并上下文和转写内容
    analysis_text = f"[语音消息] {transcript}"
    if context:
        analysis_text = f"{context}\n{analysis_text}"

    result = await fraud_detector.detect_text(
        content=analysis_text,
        user=current_user,
        db=db,
        session_id=str(uuid.uuid4())[:8],
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
            request.image_frame.strip(),
            request.audio_transcript.strip(),
            request.video_description.strip(),
        ]):
            raise HTTPException(status_code=400, detail="至少需要提供一种输入模态")

        # 导入多模态服务
        from app.services.multimodal_service import multimodal_service
        
        # 如果有 image_frame，使用视觉模型分析
        image_analysis = ""
        if request.image_frame.strip():
            logger.debug(f"收到图片帧，大小: {len(request.image_frame)} 字符")
            try:
                image_analysis = await multimodal_service.analyze_image(request.image_frame)
                logger.info(f"图片分析结果: {image_analysis[:100]}...")
            except Exception as e:
                logger.warning(f"图片分析失败: {e}")
                image_analysis = "[图片内容待分析]"
        
        # 合并OCR结果和视觉分析
        combined_image_info = request.image_ocr
        if image_analysis:
            combined_image_info = f"{request.image_ocr} | {image_analysis}" if request.image_ocr.strip() else image_analysis

        result = await fraud_detector.detect_multimodal(
            text=request.text,
            image_ocr=combined_image_info,
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
