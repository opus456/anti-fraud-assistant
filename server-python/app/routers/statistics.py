"""
统计数据路由 - 为前端可视化提供数据支持
包含 7 个接口：概览 / 诈骗地图 / 类型分布 / 趋势 / 年龄分布 / 风险分布 / 实时监控
采用「真实 DB 数据 + 演示基数」的方式，确保前端始终有可视化数据。
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Conversation, AlertRecord, FraudStatistic, GuardianRelation
from app.schemas import StatisticsOverview
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/statistics", tags=["数据统计"])


# ==================== 省份基础数据（演示用） ====================

PROVINCE_DATA = {
    "北京": {"base_count": 2850, "amount": 4500},
    "上海": {"base_count": 2650, "amount": 4200},
    "广东": {"base_count": 4200, "amount": 6800},
    "浙江": {"base_count": 2100, "amount": 3200},
    "江苏": {"base_count": 2800, "amount": 3900},
    "山东": {"base_count": 2400, "amount": 3100},
    "河南": {"base_count": 2200, "amount": 2800},
    "四川": {"base_count": 2000, "amount": 2600},
    "湖北": {"base_count": 1800, "amount": 2400},
    "湖南": {"base_count": 1700, "amount": 2200},
    "福建": {"base_count": 1900, "amount": 2900},
    "河北": {"base_count": 1600, "amount": 2000},
    "安徽": {"base_count": 1500, "amount": 1800},
    "辽宁": {"base_count": 1400, "amount": 1700},
    "陕西": {"base_count": 1200, "amount": 1500},
    "江西": {"base_count": 1100, "amount": 1400},
    "广西": {"base_count": 1300, "amount": 1800},
    "重庆": {"base_count": 1100, "amount": 1500},
    "天津": {"base_count": 900, "amount": 1300},
    "云南": {"base_count": 1000, "amount": 1300},
    "山西": {"base_count": 800, "amount": 1000},
    "贵州": {"base_count": 900, "amount": 1100},
    "吉林": {"base_count": 700, "amount": 900},
    "黑龙江": {"base_count": 800, "amount": 1000},
    "甘肃": {"base_count": 600, "amount": 700},
    "内蒙古": {"base_count": 500, "amount": 600},
    "新疆": {"base_count": 550, "amount": 700},
    "海南": {"base_count": 400, "amount": 600},
    "宁夏": {"base_count": 300, "amount": 350},
    "青海": {"base_count": 250, "amount": 300},
    "西藏": {"base_count": 150, "amount": 180},
}

FRAUD_TYPE_BASE = {
    "investment":    {"label": "投资理财诈骗",     "base_count": 3200},
    "impersonation": {"label": "冒充身份诈骗",     "base_count": 2800},
    "romance":       {"label": "杀猪盘/婚恋诈骗",  "base_count": 2100},
    "task_scam":     {"label": "刷单返利诈骗",     "base_count": 2500},
    "loan":          {"label": "贷款诈骗",         "base_count": 1900},
    "shopping":      {"label": "购物诈骗",         "base_count": 1200},
    "phishing":      {"label": "钓鱼诈骗",         "base_count": 1500},
    "gaming":        {"label": "游戏诈骗",         "base_count": 800},
    "telecom":       {"label": "电信诈骗",         "base_count": 2000},
    "ai_deepfake":   {"label": "AI深度伪造诈骗",   "base_count": 600},
}


# ==================== 1. 概览 ====================

@router.get("/overview", response_model=StatisticsOverview, summary="统计概览")
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """系统整体统计概览（真实数据 + 演示基数）"""
    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    det_count = (await db.execute(select(func.count(Conversation.id)))).scalar() or 0
    fraud_count = (
        await db.execute(
            select(func.count(Conversation.id)).where(Conversation.is_fraud == True)
        )
    ).scalar() or 0
    
    # 预警统计
    alerts_pending = (
        await db.execute(
            select(func.count(AlertRecord.id)).where(AlertRecord.is_resolved == False)
        )
    ).scalar() or 0
    alerts_resolved = (
        await db.execute(
            select(func.count(AlertRecord.id)).where(AlertRecord.is_resolved == True)
        )
    ).scalar() or 0
    alert_count = alerts_pending + alerts_resolved
    
    # 今日统计
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_det = (
        await db.execute(
            select(func.count(Conversation.id)).where(Conversation.created_at >= today_start)
        )
    ).scalar() or 0
    today_fraud = (
        await db.execute(
            select(func.count(Conversation.id)).where(
                Conversation.created_at >= today_start,
                Conversation.is_fraud == True,
            )
        )
    ).scalar() or 0
    
    # 守护关系数（当前用户相关）
    guard_count = (
        await db.execute(
            select(func.count(GuardianRelation.id)).where(
                GuardianRelation.guardian_id == current_user.id,
                GuardianRelation.is_active == True,
            )
        )
    ).scalar() or 0
    
    avg_time = (
        await db.execute(select(func.avg(Conversation.response_time_ms)))
    ).scalar()

    return StatisticsOverview(
        total_users=max(user_count, 1),
        total_detections=det_count + 15680,
        total_fraud_detected=fraud_count + 2340,
        fraud_detected=fraud_count + 2340,
        total_alerts=alert_count + 890,
        alerts_pending=alerts_pending + 15,  # 基数
        alerts_resolved=alerts_resolved + 875,
        today_detections=today_det + random.randint(500, 800),  # 演示基数
        today_fraud=today_fraud + random.randint(10, 30),
        detection_rate=round((fraud_count + 2340) / max(det_count + 15680, 1) * 100, 1),
        guard_count=guard_count,
        detection_accuracy=0.946,
        avg_response_time_ms=round(avg_time, 1) if avg_time else 320.5,
    )


# ==================== 2. 全国诈骗地图 ====================

@router.get("/fraud-map", summary="全国诈骗地图数据")
async def get_fraud_map(db: AsyncSession = Depends(get_db)):
    """为前端热力地图提供各省份诈骗案件数和涉案金额"""
    # 从 FraudStatistic 表聚合实际数据
    db_result = await db.execute(
        select(FraudStatistic.province, func.sum(FraudStatistic.case_count))
        .where(FraudStatistic.province != "")
        .group_by(FraudStatistic.province)
    )
    db_counts: dict[str, int] = {row[0]: int(row[1]) for row in db_result.all()}

    result = []
    for province, data in PROVINCE_DATA.items():
        count = data["base_count"] + db_counts.get(province, 0) + random.randint(-200, 200)
        amount = data["amount"] + random.randint(-300, 300)
        result.append({
            "province": province,
            "case_count": max(count, 0),
            "amount_involved": round(max(amount, 0) / 10000, 2),
            "risk_index": round(max(count, 0) / 4200, 2),
        })
    return sorted(result, key=lambda x: x["case_count"], reverse=True)


# ==================== 3. 诈骗类型分布 ====================

@router.get("/fraud-types", summary="诈骗类型分布")
async def get_fraud_type_stats(db: AsyncSession = Depends(get_db)):
    """饼图/柱状图 — 各类诈骗类型占比"""
    # 复制基础数据
    type_data = {k: dict(v) for k, v in FRAUD_TYPE_BASE.items()}

    # 合并 DB 实际数据
    db_result = await db.execute(
        select(Conversation.fraud_type, func.count(Conversation.id))
        .where(Conversation.is_fraud == True, Conversation.fraud_type.isnot(None))
        .group_by(Conversation.fraud_type)
    )
    for fraud_type, count in db_result.all():
        if fraud_type in type_data:
            type_data[fraud_type]["base_count"] += count

    total = sum(d["base_count"] for d in type_data.values())
    result = []
    for ft, data in type_data.items():
        result.append({
            "fraud_type": ft,
            "label": data["label"],
            "count": data["base_count"],
            "percentage": round(data["base_count"] / total * 100, 1) if total > 0 else 0,
        })
    return sorted(result, key=lambda x: x["count"], reverse=True)


# ==================== 4. 趋势分析 ====================

@router.get("/trends", summary="趋势分析数据")
async def get_trends(days: int = 30, db: AsyncSession = Depends(get_db)):
    """折线图 — 每日检测量与诈骗检出量"""
    base_date = datetime.utcnow() - timedelta(days=days)

    total_by_day: dict[str, int] = {}
    fraud_by_day: dict[str, int] = {}

    total_result = await db.execute(
        select(
            func.date_trunc("day", Conversation.created_at).label("day"),
            func.count(Conversation.id),
        )
        .where(Conversation.created_at >= base_date)
        .group_by("day")
    )
    for row in total_result.all():
        if row[0]:
            key = row[0].strftime("%m-%d")
            total_by_day[key] = int(row[1])

    fraud_result = await db.execute(
        select(
            func.date_trunc("day", Conversation.created_at).label("day"),
            func.count(Conversation.id),
        )
        .where(Conversation.created_at >= base_date, Conversation.is_fraud == True)
        .group_by("day")
    )
    for row in fraud_result.all():
        if row[0]:
            key = row[0].strftime("%m-%d")
            fraud_by_day[key] = int(row[1])

    result = []
    for i in range(days):
        date = base_date + timedelta(days=i)
        date_str = date.strftime("%m-%d")

        base_total = random.randint(400, 650)
        base_fraud = random.randint(50, 120)
        # 工作日数量更高
        if date.weekday() < 5:
            base_total = int(base_total * 1.2)

        db_total = total_by_day.get(date_str, 0)
        db_fraud = fraud_by_day.get(date_str, 0)

        day_total = base_total + db_total
        day_fraud = base_fraud + db_fraud

        result.append({
            "date": date_str,
            "total": day_total,
            "fraud": day_fraud,
            "safe": day_total - day_fraud,
        })
    return result


# ==================== 5. 年龄分布 ====================

@router.get("/age-distribution", summary="受害者年龄分布")
async def get_age_distribution(db: AsyncSession = Depends(get_db)):
    """柱状图/饼图 — 诈骗受害者年龄段分布"""
    age_groups = [
        {"age_group": "18岁以下",  "min": 0,  "max": 17,  "count": 1200, "percentage": 8.5},
        {"age_group": "18-25岁",   "min": 18, "max": 25,  "count": 2800, "percentage": 19.8},
        {"age_group": "25-35岁",   "min": 25, "max": 35,  "count": 3500, "percentage": 24.8},
        {"age_group": "35-45岁",   "min": 35, "max": 45,  "count": 2600, "percentage": 18.4},
        {"age_group": "45-55岁",   "min": 45, "max": 55,  "count": 1800, "percentage": 12.8},
        {"age_group": "55-65岁",   "min": 55, "max": 65,  "count": 1400, "percentage": 9.9},
        {"age_group": "65岁以上",  "min": 65, "max": 999, "count": 820,  "percentage": 5.8},
    ]

    # 合并 DB 中曾命中诈骗的用户年龄
    db_result = await db.execute(
        select(User.age).where(User.fraud_hits > 0, User.age.isnot(None))
    )
    for (age,) in db_result.all():
        if age is None:
            continue
        for group in age_groups:
            if group["min"] <= age <= group["max"]:
                group["count"] += 1
                break

    # 重新计算百分比
    total = sum(g["count"] for g in age_groups)
    for g in age_groups:
        g["percentage"] = round(g["count"] / total * 100, 1) if total > 0 else 0

    return [
        {"age_group": g["age_group"], "count": g["count"], "percentage": g["percentage"]}
        for g in age_groups
    ]


# ==================== 6. 风险分布 ====================

@router.get("/risk-distribution", summary="风险等级分布")
async def get_risk_distribution(db: AsyncSession = Depends(get_db)):
    """雷达图/饼图 — 检测结果风险等级分布"""
    distribution = [
        {"risk_level": "safe",     "label": "安全",     "count": 12500, "color": "#22c55e"},
        {"risk_level": "low",      "label": "低风险",   "count": 1800,  "color": "#eab308"},
        {"risk_level": "medium",   "label": "中风险",   "count": 900,   "color": "#f97316"},
        {"risk_level": "high",     "label": "高风险",   "count": 350,   "color": "#ef4444"},
        {"risk_level": "critical", "label": "极高风险", "count": 130,   "color": "#dc2626"},
    ]

    # 合并 DB 实际数据（risk_level 在 Conversation 中是字符串）
    db_result = await db.execute(
        select(Conversation.risk_level, func.count(Conversation.id))
        .group_by(Conversation.risk_level)
    )
    for risk_level, count in db_result.all():
        if not risk_level:
            continue
        for d in distribution:
            if d["risk_level"] == risk_level:
                d["count"] += count

    return distribution


# ==================== 7. 实时监控 ====================

@router.get("/realtime", summary="实时监控数据")
async def get_realtime_data(db: AsyncSession = Depends(get_db)):
    """实时反诈监控面板 — 最近检测活动与活跃预警"""
    # 最近 10 条检测记录
    recent_result = await db.execute(
        select(Conversation).order_by(Conversation.created_at.desc()).limit(10)
    )
    recent_detections = recent_result.scalars().all()

    # 最近未解决预警
    alert_result = await db.execute(
        select(AlertRecord)
        .where(AlertRecord.is_resolved == False)
        .order_by(AlertRecord.created_at.desc())
        .limit(5)
    )
    active_alerts = alert_result.scalars().all()

    return {
        "current_qps": round(random.uniform(2.5, 8.0), 1),
        "active_users": random.randint(120, 350),
        "alerts_today": random.randint(15, 45),
        "blocked_today": random.randint(5, 20),
        "recent_detections": [
            {
                "id": d.id,
                "input_type": d.input_type,
                "is_fraud": d.is_fraud,
                "risk_level": d.risk_level or "safe",
                "risk_score": d.risk_score,
                "response_time_ms": d.response_time_ms,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in recent_detections
        ],
        "active_alerts": [
            {
                "id": a.id,
                "alert_type": a.alert_type,
                "risk_level": a.risk_level,
                "title": a.title,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in active_alerts
        ],
    }
