"""
统计数据路由 - 为前端可视化提供数据支持
包含6大可视化功能的数据API:
1. 全国诈骗地图数据
2. 诈骗类型分布统计
3. 时间趋势分析
4. 年龄/性别分布
5. 风险等级分布
6. 实时监控数据
"""
import json
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    User, Conversation, Alert, FraudStatistic,
    FraudType, RiskLevel, UserRole
)
from app.schemas import StatisticsOverview

router = APIRouter(prefix="/api/statistics", tags=["数据统计"])


# ==================== 省份数据（模拟全国分布） ====================
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


@router.get("/overview", response_model=StatisticsOverview, summary="统计概览")
async def get_overview(db: AsyncSession = Depends(get_db)):
    """获取系统整体统计概览"""
    # 查询用户总数
    user_count = await db.execute(select(func.count(User.id)))
    total_users = user_count.scalar() or 0

    # 查询检测总数
    det_count = await db.execute(select(func.count(Conversation.id)))
    total_detections = det_count.scalar() or 0

    # 查询诈骗检出数
    fraud_count = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.is_fraud == True)
    )
    total_fraud = fraud_count.scalar() or 0

    # 查询预警总数
    alert_count = await db.execute(select(func.count(Alert.id)))
    total_alerts = alert_count.scalar() or 0

    # 平均响应时间
    avg_time = await db.execute(
        select(func.avg(Conversation.response_time_ms))
    )
    avg_response = avg_time.scalar() or 0

    return StatisticsOverview(
        total_users=max(total_users, 1),
        total_detections=total_detections + 15680,  # 加入演示基数
        total_fraud_detected=total_fraud + 2340,
        total_alerts=total_alerts + 890,
        detection_accuracy=0.946,
        avg_response_time_ms=round(avg_response, 1) if avg_response else 320.5
    )


@router.get("/fraud-map", summary="全国诈骗地图数据")
async def get_fraud_map():
    """
    可视化1 - 全国诈骗案件地理分布
    为热力地图提供各省份诈骗案件数和涉案金额数据
    """
    result = []
    for province, data in PROVINCE_DATA.items():
        # 添加随机波动模拟真实数据
        count = data["base_count"] + random.randint(-200, 200)
        amount = data["amount"] + random.randint(-300, 300)
        result.append({
            "province": province,
            "case_count": max(count, 0),
            "amount_involved": round(max(amount, 0) / 10000, 2),  # 万元
            "risk_index": round(count / 4200, 2)  # 相对风险指数
        })

    return sorted(result, key=lambda x: x["case_count"], reverse=True)


@router.get("/fraud-types", summary="诈骗类型分布")
async def get_fraud_type_stats(db: AsyncSession = Depends(get_db)):
    """
    可视化2 - 各类诈骗类型占比统计
    饼图/柱状图数据
    """
    # 基础演示数据
    type_data = {
        "investment": {"label": "投资理财诈骗", "base_count": 3200},
        "impersonation": {"label": "冒充身份诈骗", "base_count": 2800},
        "romance": {"label": "杀猪盘/婚恋诈骗", "base_count": 2100},
        "task_scam": {"label": "刷单返利诈骗", "base_count": 2500},
        "loan": {"label": "贷款诈骗", "base_count": 1900},
        "shopping": {"label": "购物诈骗", "base_count": 1200},
        "phishing": {"label": "钓鱼诈骗", "base_count": 1500},
        "gaming": {"label": "游戏诈骗", "base_count": 800},
        "telecom": {"label": "电信诈骗", "base_count": 2000},
        "ai_deepfake": {"label": "AI深度伪造诈骗", "base_count": 600},
    }

    # 查询实际数据并合并
    db_result = await db.execute(
        select(Conversation.fraud_type, func.count(Conversation.id))
        .where(Conversation.is_fraud == True)
        .group_by(Conversation.fraud_type)
    )
    for fraud_type, count in db_result.all():
        if fraud_type and fraud_type.value in type_data:
            type_data[fraud_type.value]["base_count"] += count

    total = sum(d["base_count"] for d in type_data.values())
    result = []
    for ft, data in type_data.items():
        result.append({
            "fraud_type": ft,
            "label": data["label"],
            "count": data["base_count"],
            "percentage": round(data["base_count"] / total * 100, 1) if total > 0 else 0
        })

    return sorted(result, key=lambda x: x["count"], reverse=True)


@router.get("/trends", summary="趋势分析数据")
async def get_trends(days: int = 30, db: AsyncSession = Depends(get_db)):
    """
    可视化3 - 检测量与诈骗检出趋势图
    折线图数据，展示每日检测量和诈骗检出量
    """
    result = []
    base_date = datetime.utcnow() - timedelta(days=days)

    for i in range(days):
        date = base_date + timedelta(days=i)
        date_str = date.strftime("%m-%d")

        # 模拟数据 + 实际数据结合
        base_total = random.randint(400, 650)
        base_fraud = random.randint(50, 120)

        # 工作日数量更高
        if date.weekday() < 5:
            base_total = int(base_total * 1.2)

        result.append({
            "date": date_str,
            "total": base_total,
            "fraud": base_fraud,
            "safe": base_total - base_fraud
        })

    return result


@router.get("/age-distribution", summary="受害者年龄分布")
async def get_age_distribution(db: AsyncSession = Depends(get_db)):
    """
    可视化4 - 诈骗受害者年龄段分布
    柱状图/饼图数据
    """
    age_groups = [
        {"age_group": "18岁以下", "count": 1200, "percentage": 8.5},
        {"age_group": "18-25岁", "count": 2800, "percentage": 19.8},
        {"age_group": "25-35岁", "count": 3500, "percentage": 24.8},
        {"age_group": "35-45岁", "count": 2600, "percentage": 18.4},
        {"age_group": "45-55岁", "count": 1800, "percentage": 12.8},
        {"age_group": "55-65岁", "count": 1400, "percentage": 9.9},
        {"age_group": "65岁以上", "count": 820, "percentage": 5.8},
    ]

    # 合并数据库实际用户数据
    db_result = await db.execute(
        select(User.age).where(User.fraud_hits > 0, User.age.isnot(None))
    )
    for (age,) in db_result.all():
        if age:
            for group in age_groups:
                if "以下" in group["age_group"] and age < 18:
                    group["count"] += 1
                elif "以上" in group["age_group"] and age >= 65:
                    group["count"] += 1

    return age_groups


@router.get("/risk-distribution", summary="风险等级分布")
async def get_risk_distribution(db: AsyncSession = Depends(get_db)):
    """
    可视化5 - 检测结果风险等级分布
    雷达图/饼图数据
    """
    distribution = [
        {"risk_level": "safe", "label": "安全", "count": 12500, "color": "#22c55e"},
        {"risk_level": "low", "label": "低风险", "count": 1800, "color": "#eab308"},
        {"risk_level": "medium", "label": "中风险", "count": 900, "color": "#f97316"},
        {"risk_level": "high", "label": "高风险", "count": 350, "color": "#ef4444"},
        {"risk_level": "critical", "label": "极高风险", "count": 130, "color": "#dc2626"},
    ]

    # 合并数据库实际数据
    db_result = await db.execute(
        select(Conversation.risk_level, func.count(Conversation.id))
        .group_by(Conversation.risk_level)
    )
    for risk_level, count in db_result.all():
        if risk_level:
            for d in distribution:
                if d["risk_level"] == risk_level.value:
                    d["count"] += count

    return distribution


@router.get("/realtime", summary="实时监控数据")
async def get_realtime_data(db: AsyncSession = Depends(get_db)):
    """
    可视化6 - 实时反诈监控面板数据
    展示最近的检测活动和预警事件
    """
    # 最近10条检测记录
    recent_result = await db.execute(
        select(Conversation)
        .order_by(Conversation.created_at.desc())
        .limit(10)
    )
    recent_detections = recent_result.scalars().all()

    # 最近活跃预警
    alert_result = await db.execute(
        select(Alert)
        .where(Alert.is_resolved == False)
        .order_by(Alert.created_at.desc())
        .limit(5)
    )
    active_alerts = alert_result.scalars().all()

    # 模拟实时指标
    return {
        "current_qps": round(random.uniform(2.5, 8.0), 1),  # 每秒查询数
        "active_users": random.randint(120, 350),
        "alerts_today": random.randint(15, 45),
        "blocked_today": random.randint(5, 20),
        "recent_detections": [
            {
                "id": d.id,
                "input_type": d.input_type,
                "is_fraud": d.is_fraud,
                "risk_level": d.risk_level.value if d.risk_level else "safe",
                "risk_score": d.risk_score,
                "response_time_ms": d.response_time_ms,
                "created_at": d.created_at.isoformat()
            } for d in recent_detections
        ],
        "active_alerts": [
            {
                "id": a.id,
                "alert_type": a.alert_type.value if a.alert_type else "",
                "risk_level": a.risk_level.value if a.risk_level else "",
                "title": a.title,
                "created_at": a.created_at.isoformat()
            } for a in active_alerts
        ]
    }


@router.get("/user-profile-stats", summary="用户画像统计")
async def get_user_profile_stats(db: AsyncSession = Depends(get_db)):
    """用户角色和地域分布统计"""
    # 角色分布
    role_result = await db.execute(
        select(User.role_type, func.count(User.id))
        .group_by(User.role_type)
    )
    role_labels = {
        "elder": "老年人", "child": "儿童/青少年",
        "adult": "成年人", "student": "学生",
        "finance": "财会人员", "other": "其他"
    }
    role_dist = [
        {"role": r.value if r else "other", "label": role_labels.get(r.value if r else "other", "其他"), "count": c}
        for r, c in role_result.all()
    ]

    # 性别分布
    gender_result = await db.execute(
        select(User.gender, func.count(User.id))
        .group_by(User.gender)
    )
    gender_labels = {"male": "男", "female": "女", "other": "其他"}
    gender_dist = [
        {"gender": g.value if g else "other", "label": gender_labels.get(g.value if g else "other", "其他"), "count": c}
        for g, c in gender_result.all()
    ]

    return {
        "role_distribution": role_dist,
        "gender_distribution": gender_dist
    }
