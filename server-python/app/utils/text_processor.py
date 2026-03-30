"""
文本预处理工具 - 增强版关键词引擎
"""
from __future__ import annotations

import re
import jieba
import jieba.analyse


# ==================== 诈骗关键词库（增强版） ====================

FRAUD_KEYWORDS = {
    "investment": {
        "keywords": [
            "高收益", "稳赚不赔", "内部消息", "理财平台", "投资回报", "翻倍",
            "保本保息", "推荐股票", "外汇交易", "虚拟货币", "区块链投资",
            "私募基金", "跟单", "配资", "杀猪盘理财", "数字货币", "币圈",
            "USDT", "比特币", "以太坊", "矿机", "挖矿", "量化交易",
            "对冲基金", "期货", "原油投资", "黄金投资", "外盘", "内盘",
            "荐股", "牛股", "涨停", "操盘手", "交易信号", "保证收益",
        ],
        "weight": 0.85,
    },
    "impersonation": {
        "keywords": [
            "公安局", "检察院", "法院", "银行客服", "社保局", "医保",
            "国家反诈中心", "警官", "快递理赔", "客服退款", "安全账户",
            "冻结", "资金清查", "配合调查", "涉嫌洗钱", "通缉令",
            "逮捕令", "保密协议", "专案组", "办案民警", "公诉",
            "司法冻结", "涉嫌犯罪", "资产保全", "笔录", "传唤",
        ],
        "weight": 0.9,
    },
    "romance": {
        "keywords": [
            "网恋", "交友", "约会", "恋爱", "相亲", "真心",
            "一起投资", "带你赚钱", "博彩", "赌博平台", "充值返利",
            "杀猪盘", "感情投资", "交往", "结婚", "彩礼",
            "视频约会", "直播打赏", "礼物", "红包雨",
        ],
        "weight": 0.8,
    },
    "task_scam": {
        "keywords": [
            "刷单", "做任务", "点赞关注", "兼职", "返佣", "日结",
            "零投入", "躺赚", "抢单", "充值做单", "垫付", "佣金",
            "试单", "大额单", "连单", "福利单", "激活费",
            "保证金", "手续费", "升级VIP", "充值返利",
            "短视频点赞", "电商评价", "APP下载",
        ],
        "weight": 0.85,
    },
    "loan": {
        "keywords": [
            "低息贷款", "免抵押", "秒到账", "征信修复", "会员费",
            "解冻费", "工本费", "保证金", "信用卡提额", "校园贷",
            "验证流水", "刷流水", "放款", "额度", "利率",
            "网贷", "借条", "白条", "花呗套现", "信用分",
        ],
        "weight": 0.85,
    },
    "shopping": {
        "keywords": [
            "低价出售", "代购", "免费领", "中奖", "红包",
            "优惠券", "限时抢购", "退货退款", "物流异常",
            "恭喜", "大奖", "手续费", "领取", "获奖",
            "最后机会", "错过", "到账", "先交", "中了",
            "拼团", "砍价", "秒杀", "内部价", "员工价",
        ],
        "weight": 0.8,
    },
    "phishing": {
        "keywords": [
            "点击链接", "验证码", "身份核实", "账户异常", "重新登录",
            "银行卡号", "密码", "个人信息", "实名认证",
            "短信验证", "动态口令", "CVV", "有效期",
            "钓鱼网站", "仿冒", "木马", "病毒链接",
        ],
        "weight": 0.8,
    },
    "gaming": {
        "keywords": [
            "游戏充值", "账号交易", "代练", "装备出售", "皮肤",
            "低价点券", "游戏代充", "外挂", "私下交易",
            "王者荣耀", "原神", "和平精英", "第五人格",
        ],
        "weight": 0.75,
    },
    "telecom": {
        "keywords": [
            "手机欠费", "号码注销", "包裹违禁", "航班改签",
            "退税", "补贴", "社保异常", "ETC异常",
            "宽带续费", "流量套餐", "积分兑换",
        ],
        "weight": 0.8,
    },
    "ai_deepfake": {
        "keywords": [
            "AI换脸", "视频通话", "语音合成", "声音克隆",
            "紧急借钱", "转账验证", "熟人借钱",
            "深度伪造", "人脸识别", "生物特征",
            "合成语音", "变声器", "模拟声音",
        ],
        "weight": 0.9,
    },
    "recruitment": {
        "keywords": [
            "高薪招聘", "日薪千元", "居家办公", "打字员",
            "数据录入", "抄写员", "手工活", "零门槛",
            "培训费", "押金", "体检费", "服装费",
        ],
        "weight": 0.8,
    },
}

URGENT_KEYWORDS = [
    "转账", "汇款", "打款", "银行卡", "密码", "验证码",
    "马上", "立刻", "立即", "紧急", "赶快", "赶紧", "速速", "抓紧",
    "不要告诉", "保密", "不要错过", "最后机会",
    "下载APP", "屏幕共享", "远程控制", "二维码", "扫码",
    "安全账户", "资金转移", "配合调查", "逮捕", "冻结",
    "限时", "倒计时", "名额有限", "仅剩",
]

SAFE_CONTEXT_KEYWORDS = [
    "一起吃饭", "天气真好", "上班", "下班", "周末", "火锅店",
    "电影", "工资", "薪资", "账单", "官方APP", "官方客服电话",
    "预约", "体检", "快递单号", "健身", "跑步", "散步",
    "做饭", "加班", "开会", "出差", "学习", "考试",
]

HIGH_RISK_PATTERNS = [
    {
        "name": "social_security_remote_assist",
        "pattern": r"(社保卡|医保卡|社保).{0,10}(异常|冻结|停用|失效).{0,20}(远程协助|远程控制|下载.{0,8}APP|屏幕共享)",
        "weight": 0.55,
    },
    {
        "name": "authority_safe_account",
        "pattern": r"(公安|检察院|法院|社保局|客服).{0,20}(安全账户|转账|汇款|验证码)",
        "weight": 0.48,
    },
    {
        "name": "download_and_verify",
        "pattern": r"(下载.{0,8}APP|安装.{0,8}软件).{0,20}(验证码|转账|银行卡|密码)",
        "weight": 0.42,
    },
]

AUTHORITY_KEYWORDS = [
    "公安", "派出所", "警官", "检察院", "法院", "社保局", "医保局", "银行客服", "官方客服", "国家反诈中心",
]

MONEY_ACTION_KEYWORDS = [
    "转账", "汇款", "打款", "充值", "付款", "垫付", "解冻费", "保证金", "手续费", "安全账户",
]

CREDENTIAL_KEYWORDS = [
    "验证码", "密码", "银行卡", "身份证", "人脸识别", "短信验证", "动态口令", "CVV", "有效期",
]

REMOTE_CONTROL_KEYWORDS = [
    "下载APP", "安装APP", "安装软件", "远程协助", "远程控制", "屏幕共享", "共享屏幕", "扫码", "二维码", "点击链接",
]


def clean_text(text: str) -> str:
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def segment_text(text: str) -> list[str]:
    return list(jieba.cut(text))


def extract_keywords(text: str, top_k: int = 20) -> list[tuple[str, float]]:
    return jieba.analyse.extract_tags(text, topK=top_k, withWeight=True)


def detect_fraud_keywords(text: str) -> dict:
    text_lower = text.lower()
    scores = {}
    for fraud_type, config in FRAUD_KEYWORDS.items():
        matched = [kw for kw in config["keywords"] if kw.lower() in text_lower]
        if matched:
            weight = config["weight"]
            base = weight * 0.5
            bonus = (len(matched) - 1) * weight * 0.12
            scores[fraud_type] = round(min(base + bonus, 1.0), 3)
    return scores


def detect_urgent_signals(text: str) -> list[str]:
    return [kw for kw in URGENT_KEYWORDS if kw in text]


def calculate_text_risk_score(text: str) -> dict:
    fraud_scores = detect_fraud_keywords(text)
    keyword_score = max(fraud_scores.values()) if fraud_scores else 0.0

    urgent_signals = detect_urgent_signals(text)
    urgent_score = min(len(urgent_signals) * 0.15, 0.5)

    safe_hits = [kw for kw in SAFE_CONTEXT_KEYWORDS if kw in text]
    safe_score = min(len(safe_hits) * 0.08, 0.32)

    matched_patterns = [
        p["name"] for p in HIGH_RISK_PATTERNS if re.search(p["pattern"], text, re.IGNORECASE)
    ]
    pattern_score = min(
        sum(p["weight"] for p in HIGH_RISK_PATTERNS if p["name"] in matched_patterns),
        0.75,
    )

    feature_score = 0.0
    if re.search(r'https?://\S+|www\.\S+', text):
        feature_score += 0.1
    if re.search(r'1[3-9]\d{9}', text):
        feature_score += 0.05
    if re.search(r'\d{16,19}', text):
        feature_score += 0.15
    if text.count('!') + text.count('！') > 3:
        feature_score += 0.05

    authority_hits = [kw for kw in AUTHORITY_KEYWORDS if kw in text]
    money_hits = [kw for kw in MONEY_ACTION_KEYWORDS if kw in text]
    credential_hits = [kw for kw in CREDENTIAL_KEYWORDS if kw in text]
    remote_hits = [kw for kw in REMOTE_CONTROL_KEYWORDS if kw in text]

    combo_score = 0.0
    if authority_hits and (money_hits or credential_hits or remote_hits):
        combo_score += 0.18
    if remote_hits and (credential_hits or money_hits):
        combo_score += 0.18
    if money_hits and credential_hits:
        combo_score += 0.14
    if urgent_signals and (money_hits or remote_hits):
        combo_score += 0.12
    combo_score = min(combo_score, 0.55)

    total_score = (
        keyword_score * 0.42
        + urgent_score * 0.18
        + feature_score * 0.08
        + pattern_score * 0.2
        + combo_score * 0.12
    )
    if keyword_score < 0.5:
        total_score -= safe_score

    # 高危组合命中后，提高最低风险下限，避免明显诈骗文案漏检。
    if pattern_score >= 0.45:
        total_score = max(total_score, 0.72)
    if combo_score >= 0.3:
        total_score = max(total_score, 0.68)

    total_score = round(max(min(total_score, 1.0), 0.0), 3)

    top_fraud_type = max(fraud_scores, key=fraud_scores.get) if fraud_scores else None

    return {
        "total_score": total_score,
        "keyword_score": keyword_score,
        "urgent_score": urgent_score,
        "feature_score": feature_score,
        "pattern_score": pattern_score,
        "matched_patterns": matched_patterns,
        "combo_score": combo_score,
        "authority_hits": authority_hits,
        "money_hits": money_hits,
        "credential_hits": credential_hits,
        "remote_hits": remote_hits,
        "safe_score": safe_score,
        "fraud_scores": fraud_scores,
        "urgent_signals": urgent_signals,
        "safe_context_hits": safe_hits,
        "top_fraud_type": top_fraud_type,
    }
