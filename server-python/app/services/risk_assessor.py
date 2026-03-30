"""
风险评估服务 — LSTM 思想的个性化风险评估
"""
from __future__ import annotations

import math
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, Conversation

logger = logging.getLogger(__name__)

FRAUD_TYPE_LABELS = {
    "investment": "投资理财诈骗",
    "impersonation": "冒充身份诈骗",
    "romance": "杀猪盘/婚恋诈骗",
    "task_scam": "刷单返利诈骗",
    "loan": "贷款诈骗",
    "shopping": "购物诈骗",
    "phishing": "钓鱼诈骗",
    "gaming": "游戏诈骗",
    "telecom": "电信诈骗",
    "ai_deepfake": "AI深度伪造诈骗",
    "recruitment": "招聘诈骗",
    "other": "其他诈骗",
}

FRAUD_TYPE_ALIASES = {
    "lottery_scam": "shopping", "lottery": "shopping", "prize_scam": "shopping",
    "fake_prize": "shopping", "advance_fee": "loan", "pig_butchering": "romance",
    "identity": "impersonation", "fake_identity": "impersonation",
    "deepfake": "ai_deepfake", "click_farming": "task_scam",
    "brush_order": "task_scam", "fake_loan": "loan",
    "online_shopping": "shopping", "fraud": "other",
}

ROLE_RISK_WEIGHTS = {
    "elder": 1.4, "child": 1.5, "student": 1.2,
    "finance": 1.1, "adult": 1.0, "other": 1.0,
}

AGE_RISK_FACTORS = {
    (0, 16): 1.5, (16, 25): 1.2, (25, 45): 1.0,
    (45, 60): 1.15, (60, 120): 1.4,
}


def normalize_fraud_type(fraud_type: str) -> str:
    if not fraud_type:
        return None
    fraud_type = fraud_type.lower().strip()
    if fraud_type in FRAUD_TYPE_LABELS:
        return fraud_type
    if fraud_type in FRAUD_TYPE_ALIASES:
        return FRAUD_TYPE_ALIASES[fraud_type]
    return fraud_type


def cot_risk_level_to_score(level: int) -> float:
    """将 CoT 输出的 risk_level (0-3) 映射到 0-1 分数"""
    return {0: 0.05, 1: 0.35, 2: 0.65, 3: 0.9}.get(level, 0.5)


class RiskAssessor:

    def __init__(self):
        self.time_decay_factor = 0.95

    async def assess_risk(
        self, content_risk: dict, user: Optional[User] = None, db: Optional[AsyncSession] = None
    ) -> dict:
        instant_score = content_risk.get("total_score", 0.0)

        history_score = 0.0
        if user and db:
            history_score = await self._calculate_history_risk(user, db)

        profile_weight = self._get_profile_weight(user) if user else 1.0

        final_score = instant_score * 0.8 * profile_weight + history_score * 0.2
        final_score = min(round(final_score, 3), 1.0)

        risk_level = self._determine_risk_level(final_score)
        alert_actions = self._determine_alert_actions(risk_level)

        return {
            "final_score": final_score,
            "instant_score": instant_score,
            "history_score": history_score,
            "profile_weight": profile_weight,
            "risk_level": risk_level,
            "alert_actions": alert_actions,
            "fraud_type": content_risk.get("top_fraud_type"),
            "fraud_type_label": FRAUD_TYPE_LABELS.get(content_risk.get("top_fraud_type", ""), ""),
        }

    async def _calculate_history_risk(self, user: User, db: AsyncSession) -> float:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        result = await db.execute(
            select(Conversation)
            .where(Conversation.user_id == user.id, Conversation.created_at >= thirty_days_ago)
            .order_by(Conversation.created_at.desc())
            .limit(50)
        )
        recent = result.scalars().all()
        if not recent:
            return 0.0

        weighted_sum = 0.0
        weight_total = 0.0
        now = datetime.utcnow()
        for conv in recent:
            days_ago = (now - conv.created_at).days + 1
            decay = math.pow(self.time_decay_factor, days_ago)
            if conv.is_fraud:
                weighted_sum += conv.risk_score * decay * 1.5
            else:
                weighted_sum += conv.risk_score * decay
            weight_total += decay

        return min(round(weighted_sum / max(weight_total, 0.001), 3), 1.0)

    def _get_profile_weight(self, user: User) -> float:
        role_weight = ROLE_RISK_WEIGHTS.get(user.role_type, 1.0)
        age_weight = 1.0
        if user.age:
            for (low, high), w in AGE_RISK_FACTORS.items():
                if low <= user.age < high:
                    age_weight = w
                    break
        return round((role_weight + age_weight) / 2, 3)

    @staticmethod
    def _determine_risk_level(score: float) -> str:
        from app.config import settings
        if score >= settings.RISK_HIGH_THRESHOLD:
            return "critical"
        elif score >= settings.RISK_MEDIUM_THRESHOLD:
            return "high"
        elif score >= settings.RISK_LOW_THRESHOLD:
            return "medium"
        elif score > 0.1:
            return "low"
        return "safe"

    @staticmethod
    def _determine_alert_actions(risk_level: str) -> list[str]:
        actions_map = {
            "low": ["popup"],
            "medium": ["popup", "voice"],
            "high": ["popup", "voice", "guardian"],
            "critical": ["popup", "voice", "guardian", "lock"],
        }
        return actions_map.get(risk_level, [])


risk_assessor = RiskAssessor()
