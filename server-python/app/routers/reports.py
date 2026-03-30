"""
安全报告路由 - 生成 / 列表 / 详情
"""
from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Report, Conversation, User
from app.schemas import ReportRequest, ReportResponse, MessageResponse
from app.services.llm_service import generate_report_content
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/reports", tags=["安全报告"])


@router.post("/generate", response_model=ReportResponse, summary="生成安全报告")
async def generate_report(
    request: ReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """根据用户检测历史生成安全监测报告（支持 weekly / monthly）"""
    now = datetime.utcnow()
    if request.period_start and request.period_end:
        period_start = request.period_start
        period_end = request.period_end
    elif request.report_type == "monthly":
        period_start = now - timedelta(days=30)
        period_end = now
    else:
        period_start = now - timedelta(days=7)
        period_end = now

    # 统计该时间段内的检测数据
    base_query = (
        select(Conversation)
        .where(
            Conversation.user_id == current_user.id,
            Conversation.created_at >= period_start,
            Conversation.created_at <= period_end,
        )
    )
    result = await db.execute(base_query)
    conversations = result.scalars().all()

    total_detections = len(conversations)
    fraud_detected = sum(1 for c in conversations if c.is_fraud)

    # 风险等级分布
    risk_summary: dict[str, int] = {}
    for c in conversations:
        lvl = c.risk_level or "safe"
        risk_summary[lvl] = risk_summary.get(lvl, 0) + 1

    # 诈骗类型分布
    fraud_type_summary: dict[str, int] = {}
    for c in conversations:
        if c.is_fraud and c.fraud_type:
            fraud_type_summary[c.fraud_type] = fraud_type_summary.get(c.fraud_type, 0) + 1

    stats = {
        "total_detections": total_detections,
        "fraud_detected": fraud_detected,
        "risk_summary": risk_summary,
        "fraud_type_summary": fraud_type_summary,
        "period": f"{period_start.strftime('%Y-%m-%d')} ~ {period_end.strftime('%Y-%m-%d')}",
    }

    user_profile = {
        "age": current_user.age,
        "gender": current_user.gender,
        "role_type": current_user.role_type,
        "occupation": current_user.occupation,
    }
    content = await generate_report_content(stats, user_profile)

    # 生成建议列表
    suggestions = [
        "不要轻信陌生人发来的投资、兼职信息",
        "涉及转账汇款的操作务必核实对方身份",
        "不要向任何人透露验证码、密码等信息",
        "如遇可疑情况，立即拨打 96110 反诈热线",
    ]

    report_type_label = "周报" if request.report_type == "weekly" else "月报"
    report = Report(
        user_id=current_user.id,
        title=f"安全监测{report_type_label} ({period_start.strftime('%m.%d')}-{period_end.strftime('%m.%d')})",
        report_type=request.report_type,
        period_start=period_start,
        period_end=period_end,
        total_detections=total_detections,
        fraud_detected=fraud_detected,
        risk_summary=risk_summary,
        fraud_type_summary=fraud_type_summary,
        suggestions=suggestions,
        content=content,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return ReportResponse.model_validate(report)


@router.get("/", response_model=list[ReportResponse], summary="报告列表")
async def list_reports(
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的报告列表（分页）"""
    query = (
        select(Report)
        .where(Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    reports = result.scalars().all()
    return [ReportResponse.model_validate(r) for r in reports]


@router.get("/{report_id}", response_model=ReportResponse, summary="报告详情")
async def get_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取指定报告的详细内容"""
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == current_user.id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    return ReportResponse.model_validate(report)
