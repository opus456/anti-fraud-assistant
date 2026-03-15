"""
安全监测报告路由
自动生成可视化安全报告
"""
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Conversation, Report, FraudType, RiskLevel
from app.schemas import ReportRequest, ReportResponse, MessageResponse
from app.services.llm_service import generate_report_content
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/reports", tags=["安全报告"])


@router.post("/generate", response_model=ReportResponse, summary="生成安全报告")
async def generate_report(
    request: ReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    自动生成《安全监测报告》
    包含:风险说明、诈骗类型分析、趋势分析、防御建议
    """
    now = datetime.utcnow()

    # 确定报告时间范围
    period_map = {"daily": 1, "weekly": 7, "monthly": 30}
    days = period_map.get(request.report_type, 7)
    period_start = request.period_start or (now - timedelta(days=days))
    period_end = request.period_end or now

    # 查询该时段的检测统计
    query_base = select(Conversation).where(
        Conversation.user_id == current_user.id,
        Conversation.created_at >= period_start,
        Conversation.created_at <= period_end
    )

    # 总检测数
    total_result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.user_id == current_user.id,
            Conversation.created_at >= period_start,
            Conversation.created_at <= period_end
        )
    )
    total_detections = total_result.scalar() or 0

    # 诈骗检出数
    fraud_result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.user_id == current_user.id,
            Conversation.is_fraud == True,
            Conversation.created_at >= period_start,
            Conversation.created_at <= period_end
        )
    )
    fraud_detected = fraud_result.scalar() or 0

    # 风险分布
    risk_result = await db.execute(
        select(Conversation.risk_level, func.count(Conversation.id))
        .where(
            Conversation.user_id == current_user.id,
            Conversation.created_at >= period_start,
            Conversation.created_at <= period_end
        )
        .group_by(Conversation.risk_level)
    )
    risk_summary = {
        r.value if r else "unknown": c for r, c in risk_result.all()
    }

    # 诈骗类型分布
    type_result = await db.execute(
        select(Conversation.fraud_type, func.count(Conversation.id))
        .where(
            Conversation.user_id == current_user.id,
            Conversation.is_fraud == True,
            Conversation.created_at >= period_start,
            Conversation.created_at <= period_end
        )
        .group_by(Conversation.fraud_type)
    )
    fraud_type_summary = {
        r.value if r else "unknown": c for r, c in type_result.all()
    }

    # 生成报告内容
    stats = {
        "total_detections": total_detections,
        "fraud_detected": fraud_detected,
        "risk_summary": risk_summary,
        "fraud_type_summary": fraud_type_summary,
        "period": f"{period_start.strftime('%Y-%m-%d')} ~ {period_end.strftime('%Y-%m-%d')}"
    }

    content = await generate_report_content(stats, {
        "age": current_user.age,
        "role_type": current_user.role_type.value if current_user.role_type else "adult",
    })

    # 保存报告
    title_map = {"daily": "日报", "weekly": "周报", "monthly": "月报"}
    report = Report(
        user_id=current_user.id,
        title=f"安全监测{title_map.get(request.report_type, '报告')} - {now.strftime('%Y.%m.%d')}",
        report_type=request.report_type,
        period_start=period_start,
        period_end=period_end,
        total_detections=total_detections,
        fraud_detected=fraud_detected,
        risk_summary=json.dumps(risk_summary, ensure_ascii=False),
        fraud_type_summary=json.dumps(fraud_type_summary, ensure_ascii=False),
        suggestions="[]",
        content=content
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return ReportResponse.model_validate(report)


@router.get("/", response_model=list[ReportResponse], summary="获取报告列表")
async def get_reports(
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取当前用户的安全报告列表"""
    result = await db.execute(
        select(Report)
        .where(Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return [ReportResponse.model_validate(r) for r in result.scalars().all()]


@router.get("/{report_id}", response_model=ReportResponse, summary="获取报告详情")
async def get_report_detail(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取指定报告的详细内容"""
    result = await db.execute(
        select(Report).where(
            Report.id == report_id,
            Report.user_id == current_user.id
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    return ReportResponse.model_validate(report)
