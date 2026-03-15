"""
文本预处理工具
中文分词、关键词提取、文本清洗等NLP基础功能
"""
import re
import jieba
import jieba.analyse


# ==================== 诈骗相关关键词库 ====================

# 各类诈骗高频关键词（权重化）
FRAUD_KEYWORDS = {
    # 投资理财诈骗
    "investment": {
        "keywords": ["高收益", "稳赚不赔", "内部消息", "理财平台", "投资回报", "翻倍",
                      "保本保息", "推荐股票", "外汇交易", "虚拟货币", "区块链投资",
                      "私募基金", "跟单", "配资", "杀猪盘理财"],
        "weight": 0.85
    },
    # 冒充身份诈骗
    "impersonation": {
        "keywords": ["公安局", "检察院", "法院", "银行客服", "社保局", "医保",
                      "国家反诈中心", "警官", "快递理赔", "客服退款", "安全账户",
                      "冻结", "资金清查", "配合调查", "涉嫌洗钱"],
        "weight": 0.9
    },
    # 杀猪盘/婚恋诈骗
    "romance": {
        "keywords": ["网恋", "交友", "约会", "恋爱", "相亲", "真心",
                      "一起投资", "带你赚钱", "博彩", "赌博平台", "充值返利"],
        "weight": 0.8
    },
    # 刷单诈骗
    "task_scam": {
        "keywords": ["刷单", "做任务", "点赞关注", "兼职", "返佣", "日结",
                      "零投入", "躺赚", "抢单", "充值做单", "垫付", "佣金"],
        "weight": 0.85
    },
    # 贷款诈骗
    "loan": {
        "keywords": ["低息贷款", "免抵押", "秒到账", "征信修复", "会员费",
                      "解冻费", "工本费", "保证金", "信用卡提额", "校园贷",
                      "验证流水", "刷流水"],
        "weight": 0.85
    },
    # 购物诈骗
    "shopping": {
        "keywords": ["低价出售", "代购", "免费领", "中奖", "红包",
                      "优惠券", "限时抢购", "退货退款", "物流异常",
                      "恭喜", "大奖", "手续费", "领取", "获奖",
                      "最后机会", "错过", "到账", "先交", "中了"],
        "weight": 0.8
    },
    # 钓鱼诈骗
    "phishing": {
        "keywords": ["点击链接", "验证码", "身份核实", "账户异常", "重新登录",
                      "银行卡号", "密码", "个人信息", "实名认证"],
        "weight": 0.8
    },
    # 游戏诈骗
    "gaming": {
        "keywords": ["游戏充值", "账号交易", "代练", "装备出售", "皮肤",
                      "低价点券", "游戏代充", "外挂", "私下交易"],
        "weight": 0.75
    },
    # 电信诈骗
    "telecom": {
        "keywords": ["手机欠费", "号码注销", "包裹违禁", "航班改签",
                      "退税", "补贴", "社保异常", "ETC异常"],
        "weight": 0.8
    },
    # AI深度伪造诈骗
    "ai_deepfake": {
        "keywords": ["AI换脸", "视频通话", "语音合成", "声音克隆",
                      "紧急借钱", "转账验证", "熟人借钱"],
        "weight": 0.9
    }
}

# 紧急动作关键词（可能正在被骗的信号）
URGENT_KEYWORDS = [
    "转账", "汇款", "打款", "银行卡", "密码", "验证码",
    "马上", "立刻", "立即", "紧急", "赶快", "赶紧", "速速", "抓紧",
    "不要告诉", "保密", "不要错过", "最后机会",
    "下载APP", "屏幕共享", "远程控制", "二维码", "扫码",
    "安全账户", "资金转移", "配合调查", "逮捕", "冻结"
]

# 安全语境关键词（用于抑制误报）
SAFE_CONTEXT_KEYWORDS = [
    "一起吃饭", "天气真好", "上班", "下班", "周末", "火锅店", "电影", "朋友借钱",
    "工资", "薪资", "账单", "官方APP", "官方客服电话", "预约", "体检", "快递单号",
    "退货退款", "保险赔付", "保单", "活动中心", "游戏内", "自动发放"
]


def clean_text(text: str) -> str:
    """清洗文本：去除多余空白、特殊字符等"""
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)  # 控制字符
    text = re.sub(r'\s+', ' ', text)  # 多余空白
    return text.strip()


def segment_text(text: str) -> list[str]:
    """中文分词"""
    return list(jieba.cut(text))


def extract_keywords(text: str, top_k: int = 20) -> list[tuple[str, float]]:
    """提取关键词及权重"""
    return jieba.analyse.extract_tags(text, topK=top_k, withWeight=True)


def detect_fraud_keywords(text: str) -> dict:
    """
    基于关键词库进行诈骗特征检测
    返回: {fraud_type: score, ...} 各类型的匹配得分
    
    评分策略: 匹配首个关键词给予基础分(权重*0.5)，
    每多匹配一个关键词额外加(权重*0.12)，上限1.0
    """
    text_lower = text.lower()
    scores = {}

    for fraud_type, config in FRAUD_KEYWORDS.items():
        matched = []
        for keyword in config["keywords"]:
            if keyword in text_lower:
                matched.append(keyword)

        if matched:
            weight = config["weight"]
            # 基础分 + 每个额外匹配词的增益
            base = weight * 0.5
            bonus = (len(matched) - 1) * weight * 0.12
            scores[fraud_type] = round(min(base + bonus, 1.0), 3)

    return scores


def detect_urgent_signals(text: str) -> list[str]:
    """检测紧急信号关键词"""
    return [kw for kw in URGENT_KEYWORDS if kw in text]


def calculate_text_risk_score(text: str) -> dict:
    """
    综合文本风险评分算法
    结合关键词匹配、紧急信号、文本特征等多维度评估
    """
    # 1. 关键词匹配评分
    fraud_scores = detect_fraud_keywords(text)
    keyword_score = max(fraud_scores.values()) if fraud_scores else 0.0

    # 2. 紧急信号评分
    urgent_signals = detect_urgent_signals(text)
    urgent_score = min(len(urgent_signals) * 0.15, 0.5)

    # 2.5 安全语境抑制项
    safe_hits = [kw for kw in SAFE_CONTEXT_KEYWORDS if kw in text]
    safe_score = min(len(safe_hits) * 0.08, 0.32)

    # 3. 文本特征评分
    feature_score = 0.0
    # 包含URL
    if re.search(r'https?://\S+|www\.\S+', text):
        feature_score += 0.1
    # 包含手机号
    if re.search(r'1[3-9]\d{9}', text):
        feature_score += 0.05
    # 包含银行卡号特征
    if re.search(r'\d{16,19}', text):
        feature_score += 0.15
    # 大量感叹号（诱导性）
    if text.count('!') + text.count('！') > 3:
        feature_score += 0.05

    # 综合加权
    total_score = keyword_score * 0.6 + urgent_score * 0.25 + feature_score * 0.15
    if keyword_score < 0.5:
        # 当强诈骗特征不明显时，允许安全语境抑制误报
        total_score -= safe_score
    total_score = round(min(total_score, 1.0), 3)
    total_score = max(total_score, 0.0)

    # 确定最可能的诈骗类型
    top_fraud_type = max(fraud_scores, key=fraud_scores.get) if fraud_scores else None

    return {
        "total_score": total_score,
        "keyword_score": keyword_score,
        "urgent_score": urgent_score,
        "feature_score": feature_score,
        "safe_score": safe_score,
        "fraud_scores": fraud_scores,
        "urgent_signals": urgent_signals,
        "safe_context_hits": safe_hits,
        "top_fraud_type": top_fraud_type
    }
