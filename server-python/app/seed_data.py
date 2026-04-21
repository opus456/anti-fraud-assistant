"""
初始演示数据 —— 在数据库为空时自动填充
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models import User, AlertRecord, Conversation, GuardianRelation

logger = logging.getLogger(__name__)

# ==================== 12 条测试文本样本 ====================

SEED_CONVERSATIONS = [
    # ---- 黑样本（诈骗） ----
    {
        "input_content": "【建设银行】尊敬的用户，您的账户存在异常交易，已被临时冻结。请立即点击 http://ccb-verify.xyz/auth 进行身份验证，否则将在24小时内永久冻结。验证码将发送至您的手机，请勿泄露给他人。",
        "is_fraud": True, "fraud_type": "phishing", "risk_level": "high", "risk_score": 0.52,
        "fraud_type_label": "钓鱼欺诈",
    },
    {
        "input_content": "你好！我是XX电商平台客服，你昨天购买的商品存在质量问题需要退款。请添加我的企业微信 wxid_refund2025 办理退款手续，需要你提供支付宝账号和银行卡信息进行退款转账。本次退款金额为399元，48小时内到账。",
        "is_fraud": True, "fraud_type": "task_scam", "risk_level": "medium", "risk_score": 0.34,
        "fraud_type_label": "刷单/任务诈骗",
    },
    {
        "input_content": "急用钱？最快30分钟放款！无需抵押、无需担保，凭身份证即可申请5000-50000元贷款。利率低至0.03%/天。添加客服微信 loan_2025 立即申请，名额有限！",
        "is_fraud": True, "fraud_type": "loan", "risk_level": "medium", "risk_score": 0.33,
        "fraud_type_label": "贷款诈骗",
    },
    {
        "input_content": "我是你老同学张伟啊！好久没联系了。我现在急需一笔钱周转，能不能先借我3000元？我明天就还你。我这边银行卡被冻结了没法转账，你先转到我朋友的账户：6222021234567890123，户名李某某。拜托了，真的很急！",
        "is_fraud": True, "fraud_type": "ai_deepfake", "risk_level": "medium", "risk_score": 0.35,
        "fraud_type_label": "AI深度伪造",
    },
    {
        "input_content": "恭喜您！您已被随机抽中为我们平台的幸运用户，获得iPhone 16 Pro一部！请在24小时内点击链接 http://lucky-prize.top/claim 领取奖品。需支付99元运费和保险费。请勿错过，名额仅限3位！",
        "is_fraud": True, "fraud_type": "shopping", "risk_level": "medium", "risk_score": 0.37,
        "fraud_type_label": "网购诈骗",
    },
    {
        "input_content": "这里是XX市公安局刑侦大队，我是王警官，工号3847。经调查发现你的银行账户涉嫌一起洗钱案件，案件编号2025-BJ-0392。你需要立即配合调查，请不要挂断电话。现在需要你下载一个安全检查APP进行资金核查...",
        "is_fraud": True, "fraud_type": "impersonation", "risk_level": "high", "risk_score": 0.47,
        "fraud_type_label": "冒充公检法",
    },
    # ---- 白样本（安全） ----
    {
        "input_content": "如您确实购买了上述商品且需要退换货服务，请通过我们平台官方App内的「退换货」入口提交申请。退款将在7个工作日内原路退回，我们不会通过私人微信或外部链接办理退款业务。如收到类似诈骗信息，请切勿点击陌生链接或泄露验证码。",
        "is_fraud": False, "fraud_type": None, "risk_level": "safe", "risk_score": 0.14,
        "fraud_type_label": "",
    },
    {
        "input_content": "如果您对某个副业项目感兴趣，建议先查看平台资质是否齐全，确认是否有营业执照和ICP备案信息。正规兼职不会要求您先缴纳报名费或押金。请注意，凡是以「无报名费、无押金或无垫付款」为噱头吸引您做任务的行为，均有诈骗嫌疑。",
        "is_fraud": False, "fraud_type": None, "risk_level": "safe", "risk_score": 0.20,
        "fraud_type_label": "",
    },
    {
        "input_content": "感谢您对我行贷款业务的关注。正规银行贷款流程如下：1. 前往银行营业网点或官方App提交申请；2. 提供身份证、收入证明等材料；3. 等待审批（通常3-5个工作日）；4. 审批通过后签订合同。本行不会以认证金、保证金等名义要求您先行转账，请注意防范诈骗。",
        "is_fraud": False, "fraud_type": None, "risk_level": "safe", "risk_score": 0.11,
        "fraud_type_label": "",
    },
    {
        "input_content": "明天下午3点开会讨论一下项目进度，记得带上你的笔记本电脑。会议室在3楼302，预计1个小时左右。会后大家一起去楼下吃火锅吧，新开了一家味道不错。",
        "is_fraud": False, "fraud_type": None, "risk_level": "safe", "risk_score": 0.0,
        "fraud_type_label": "",
    },
    {
        "input_content": "提醒您：本平台不会通过私人聊天账号、外部网站链接或第三方二维码单独发放领奖资格，也不会要求用户提供银行卡号、支付密码、短信验证码等敏感信息。中奖信息请以App站内公告或官方页面通知为准。请勿轻信陌生链接或来电，如您发现可疑信息请向平台举报或拨打110。",
        "is_fraud": False, "fraud_type": None, "risk_level": "safe", "risk_score": 0.14,
        "fraud_type_label": "",
    },
    {
        "input_content": "为保障您的账户安全，我们提醒您注意以下几点：不要点击来源不明的短信链接，也不要向任何人透露短信验证码、支付密码、银行卡信息等敏感内容。如果接到自称「公安局」「法院」的电话，请先挂断并通过官方渠道核实。我们不会通过私人社交账号联系您处理账户问题，也不会要求您向指定账户转账。如有任何疑问，请拨打官方客服热线400-xxx-xxxx或前往营业网点咨询。提高警惕，保护个人信息安全。",
        "is_fraud": False, "fraud_type": None, "risk_level": "safe", "risk_score": 0.06,
        "fraud_type_label": "",
    },
]

# ==================== 预警工单种子数据 ====================

SEED_ALERTS = [
    {
        "alert_type": "ward_alert",
        "risk_level": 2,
        "fraud_type": "impersonation",
        "title": "检测到冒充公检法诈骗",
        "description": "被监护人收到自称公安局来电，要求下载APP配合调查。已自动拦截并通知监护人。",
        "is_resolved": True,
        "guardian_notified": True,
        "hours_ago": 48,
    },
    {
        "alert_type": "ward_alert",
        "risk_level": 3,
        "fraud_type": "phishing",
        "title": "检测到高风险钓鱼链接",
        "description": "被监护人点击了一个伪装成银行验证页面的链接，系统已及时阻断。",
        "is_resolved": True,
        "guardian_notified": True,
        "hours_ago": 72,
    },
    {
        "alert_type": "ward_alert",
        "risk_level": 1,
        "fraud_type": "task_scam",
        "title": "检测到疑似刷单诈骗信息",
        "description": "被监护人收到包含『日结工资』『在家赚钱』关键词的短信，疑似刷单诈骗。",
        "is_resolved": True,
        "guardian_notified": True,
        "hours_ago": 96,
    },
    {
        "alert_type": "self_detect",
        "risk_level": 2,
        "fraud_type": "loan",
        "title": "检测到贷款诈骗信息",
        "description": "用户提交的文本中包含『无抵押贷款』『低利率』『添加客服微信』等典型贷款诈骗特征。",
        "is_resolved": False,
        "guardian_notified": False,
        "hours_ago": 2,
    },
    {
        "alert_type": "self_detect",
        "risk_level": 3,
        "fraud_type": "impersonation",
        "title": "检测到冒充熟人诈骗",
        "description": "用户收到自称老同学的借款请求，转账目标为陌生人账户，高度疑似冒充诈骗。",
        "is_resolved": False,
        "guardian_notified": True,
        "hours_ago": 1,
    },
]


async def seed_demo_data():
    """在数据库为空时插入演示数据"""
    try:
        async with async_session() as db:
            # 检查是否已有 alert 数据
            result = await db.execute(select(func.count(AlertRecord.id)))
            alert_count = result.scalar() or 0
            if alert_count > 0:
                logger.info(f"数据库已有 {alert_count} 条预警记录，跳过种子数据")
                return

            # 查找已有用户
            user_result = await db.execute(select(User).limit(2))
            users = user_result.scalars().all()
            if not users:
                logger.info("暂无注册用户，跳过种子数据（用户首次登录后可重新触发）")
                return

            user = users[0]
            logger.info(f"为用户 {user.username} (id={user.id}) 插入演示数据...")

            now = datetime.utcnow()

            # 插入检测历史记录（conversations）
            for i, conv in enumerate(SEED_CONVERSATIONS):
                c = Conversation(
                    user_id=user.id,
                    session_id=f"seed_{i+1:03d}",
                    input_type="text",
                    input_content=conv["input_content"],
                    is_fraud=conv["is_fraud"],
                    fraud_type=conv["fraud_type"],
                    risk_level=conv["risk_level"],
                    risk_score=conv["risk_score"],
                    analysis_result={
                        "analysis": f"{'诈骗检测' if conv['is_fraud'] else '安全提醒'}：{conv.get('fraud_type_label', '正常消息')}",
                        "suggestions": ["保持警惕，不要轻信陌生信息"] if conv["is_fraud"] else ["该消息经分析为安全内容"],
                    },
                    ai_response=f"{'⚠️ 该消息存在诈骗风险' if conv['is_fraud'] else '✅ 该消息为安全内容'}",
                    response_time_ms=150 + i * 30,
                    created_at=now - timedelta(hours=i * 3),
                )
                db.add(c)

            # 插入预警工单
            for i, alert in enumerate(SEED_ALERTS):
                hours = alert["hours_ago"]
                a = AlertRecord(
                    user_id=user.id,
                    alert_type=alert["alert_type"],
                    risk_level=alert["risk_level"],
                    fraud_type=alert["fraud_type"],
                    title=alert["title"],
                    description=alert["description"],
                    is_resolved=alert["is_resolved"],
                    guardian_notified=alert["guardian_notified"],
                    created_at=now - timedelta(hours=hours),
                    resolved_at=(now - timedelta(hours=hours - 1)) if alert["is_resolved"] else None,
                    report_json={
                        "fraud_type_label": alert["fraud_type"],
                        "ward_nickname": user.nickname or user.username,
                        "ward_username": user.username,
                    },
                )
                db.add(a)

            # 更新用户统计
            user.total_detections = len(SEED_CONVERSATIONS)
            user.fraud_hits = sum(1 for c in SEED_CONVERSATIONS if c["is_fraud"])

            await db.commit()
            logger.info(
                f"种子数据插入完成: {len(SEED_CONVERSATIONS)} 条检测历史, "
                f"{len(SEED_ALERTS)} 条预警工单"
            )

    except Exception as e:
        logger.error(f"种子数据插入失败: {e}")
