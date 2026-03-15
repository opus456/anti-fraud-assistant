"""
风险评估服务
基于LSTM思想的个性化风险评估算法
结合用户画像、历史行为、内容分析进行动态风险判定
"""
import math
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, Conversation, RiskLevel, UserRole

logger = logging.getLogger(__name__)

# ==================== 诈骗类型中文标签映射 ====================
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
    "lottery_scam": "虚假中奖诈骗",
    "other": "其他诈骗"
}

# LLM 可能返回非标准 fraud_type，映射到系统已知类型
FRAUD_TYPE_ALIASES = {
    "lottery_scam": "shopping",
    "lottery": "shopping",
    "prize_scam": "shopping",
    "fake_prize": "shopping",
    "advance_fee": "loan",
    "pig_butchering": "romance",
    "identity": "impersonation",
    "fake_identity": "impersonation",
    "deepfake": "ai_deepfake",
    "click_farming": "task_scam",
    "brush_order": "task_scam",
    "fake_loan": "loan",
    "online_shopping": "shopping",
    "fraud": "other",
}


def normalize_fraud_type(fraud_type: str) -> str:
    """将 LLM 返回的 fraud_type 归一化到系统已知类型"""
    if not fraud_type:
        return None
    fraud_type = fraud_type.lower().strip()
    if fraud_type in FRAUD_TYPE_LABELS:
        return fraud_type
    if fraud_type in FRAUD_TYPE_ALIASES:
        return FRAUD_TYPE_ALIASES[fraud_type]
    return fraud_type  # 保留原值，FRAUD_TYPE_LABELS.get() 会回退到空


class RiskAssessor:
    """
    个性化风险评估引擎
    
    算法设计（LSTM思想的简化实现）:
    1. 短期记忆: 当前输入内容的即时风险评分
    2. 长期记忆: 用户历史行为的累计风险画像
    3. 遗忘门: 时间衰减因子，越近的行为权重越高
    4. 输入门: 用户画像权重调整
    5. 输出门: 综合决策输出
    """

    # 用户角色风险权重（脆弱群体权重更高）
    ROLE_RISK_WEIGHTS = {
        UserRole.ELDER: 1.4,     # 老年人风险感知较弱
        UserRole.CHILD: 1.5,     # 儿童防范意识最弱
        UserRole.STUDENT: 1.2,   # 学生社会经验不足
        UserRole.FINANCE: 1.1,   # 财会人员面临定向攻击
        UserRole.ADULT: 1.0,     # 基准权重
        UserRole.OTHER: 1.0,
    }

    # 年龄段风险调整因子
    AGE_RISK_FACTORS = {
        (0, 16): 1.5,      # 未成年
        (16, 25): 1.2,     # 青年
        (25, 45): 1.0,     # 壮年（基准）
        (45, 60): 1.15,    # 中年
        (60, 120): 1.4,    # 老年
    }

    def __init__(self):
        self.time_decay_factor = 0.95  # 时间衰减系数

    async def assess_risk(
        self,
        content_risk: dict,
        user: Optional[User] = None,
        db: Optional[AsyncSession] = None
    ) -> dict:
        """
        综合风险评估
        
        参数:
            content_risk: 文本分析的风险评分结果
            user: 当前用户对象
            db: 数据库会话
            
        返回:
            综合风险评估结果
        """
        # 1. 即时风险（短期记忆）- 当前内容分析得分
        instant_score = content_risk.get("total_score", 0.0)

        # 2. 历史风险（长期记忆）- 基于用户历史行为
        history_score = 0.0
        if user and db:
            history_score = await self._calculate_history_risk(user, db)

        # 3. 用户画像风险调整（输入门）
        profile_weight = self._get_profile_weight(user) if user else 1.0

        # 4. 时间衰减的历史权重（遗忘门）
        history_weight = 0.2  # 历史占20%
        instant_weight = 0.8  # 即时占80%

        # 5. 综合风险评分（输出门）
        final_score = (
            instant_score * instant_weight * profile_weight +
            history_score * history_weight
        )
        final_score = min(round(final_score, 3), 1.0)

        # 确定风险等级
        risk_level = self._determine_risk_level(final_score)

        # 确定需要的预警动作
        alert_actions = self._determine_alert_actions(risk_level, user)

        return {
            "final_score": final_score,
            "instant_score": instant_score,
            "history_score": history_score,
            "profile_weight": profile_weight,
            "risk_level": risk_level,
            "alert_actions": alert_actions,
            "fraud_type": content_risk.get("top_fraud_type"),
            "fraud_type_label": FRAUD_TYPE_LABELS.get(
                content_risk.get("top_fraud_type", ""), ""
            )
        }

    async def _calculate_history_risk(self, user: User, db: AsyncSession) -> float:
        """
        计算用户历史风险评分（LSTM长期记忆）
        基于近期对话记录的风险趋势
        """
        # 获取用户近30天的对话记录
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.user_id == user.id,
                Conversation.created_at >= thirty_days_ago
            )
            .order_by(Conversation.created_at.desc())
            .limit(50)
        )
        recent_conversations = result.scalars().all()

        if not recent_conversations:
            return 0.0

        # 带时间衰减的加权平均
        weighted_sum = 0.0
        weight_total = 0.0
        now = datetime.utcnow()

        for conv in recent_conversations:
            # 距今天数
            days_ago = (now - conv.created_at).days + 1
            # 时间衰减权重：越近权重越高
            decay = math.pow(self.time_decay_factor, days_ago)

            # 风险得分加权
            if conv.is_fraud:
                weighted_sum += conv.risk_score * decay * 1.5  # 检出诈骗的记录权重更高
            else:
                weighted_sum += conv.risk_score * decay

            weight_total += decay

        if weight_total == 0:
            return 0.0

        return min(round(weighted_sum / weight_total, 3), 1.0)

    def _get_profile_weight(self, user: User) -> float:
        """根据用户画像计算风险调整权重"""
        # 角色权重
        role_weight = self.ROLE_RISK_WEIGHTS.get(user.role_type, 1.0)

        # 年龄权重
        age_weight = 1.0
        if user.age:
            for (low, high), weight in self.AGE_RISK_FACTORS.items():
                if low <= user.age < high:
                    age_weight = weight
                    break

        # 综合权重（取两者的平均）
        return round((role_weight + age_weight) / 2, 3)

    @staticmethod
    def _determine_risk_level(score: float) -> str:
        """根据评分确定风险等级"""
        from app.config import settings
        if score >= settings.RISK_HIGH_THRESHOLD:
            return RiskLevel.CRITICAL.value
        elif score >= settings.RISK_MEDIUM_THRESHOLD:
            return RiskLevel.HIGH.value
        elif score >= settings.RISK_LOW_THRESHOLD:
            return RiskLevel.MEDIUM.value
        elif score > 0.1:
            return RiskLevel.LOW.value
        else:
            return RiskLevel.SAFE.value

    @staticmethod
    def _determine_alert_actions(risk_level: str, user: Optional[User] = None) -> list[str]:
        """根据风险等级确定预警动作"""
        actions = []

        if risk_level == RiskLevel.LOW.value:
            actions.append("popup")  # 弹窗提醒

        elif risk_level == RiskLevel.MEDIUM.value:
            actions.append("popup")
            actions.append("voice")  # 语音警告

        elif risk_level == RiskLevel.HIGH.value:
            actions.append("popup")
            actions.append("voice")
            actions.append("guardian")  # 通知监护人

        elif risk_level == RiskLevel.CRITICAL.value:
            actions.append("popup")
            actions.append("voice")
            actions.append("guardian")
            actions.append("lock")  # 设备锁定建议

        return actions


# 全局风险评估器单例
risk_assessor = RiskAssessor()
