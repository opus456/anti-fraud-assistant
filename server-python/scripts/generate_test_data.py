#!/usr/bin/env python3
"""
测试数据生成脚本 - 基于本地Ollama模型生成诈骗测试数据集
使用 data_source 中的真实案例作为参考，生成多样化的测试数据
"""
import json
import random
import asyncio
import httpx
import os
import sys
from pathlib import Path
from datetime import datetime

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

# 配置
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
OUTPUT_DIR = Path(__file__).parent.parent / "test_data"
DATA_SOURCE_DIR = Path(__file__).parent.parent / "data_source"

# 12种诈骗类型定义
SCAM_TYPES = {
    "investment_scam": {
        "label": "投资理财诈骗",
        "description": "虚假投资平台、高收益承诺、杀猪盘",
        "keywords": ["高收益", "稳赚不赔", "投资回报", "翻倍", "内部消息", "跟单"]
    },
    "task_scam": {
        "label": "兼职刷单诈骗",
        "description": "刷单返利、做任务赚钱、垫付陷阱",
        "keywords": ["刷单", "做任务", "返佣", "日结", "躺赚", "垫付"]
    },
    "credit_scam": {
        "label": "虚假征信诈骗",
        "description": "假冒征信中心、信用修复骗局",
        "keywords": ["征信修复", "逾期记录", "信用报告", "银保监", "贷款额度"]
    },
    "ai_voice_scam": {
        "label": "AI合成语音诈骗",
        "description": "AI换脸、声音克隆、冒充熟人",
        "keywords": ["紧急借钱", "视频通话", "声音", "转账", "急用"]
    },
    "impersonation_scam": {
        "label": "冒充公检法诈骗",
        "description": "假冒公安、检察院、法院工作人员",
        "keywords": ["公安局", "检察院", "涉嫌洗钱", "安全账户", "配合调查"]
    },
    "game_scam": {
        "label": "网络游戏诈骗",
        "description": "游戏装备交易、低价充值、账号买卖",
        "keywords": ["游戏充值", "装备交易", "低价点券", "私下交易", "代充"]
    },
    "romance_scam": {
        "label": "网络婚恋诈骗",
        "description": "虚假交友、杀猪盘、情感诈骗",
        "keywords": ["网恋", "交友", "一起投资", "带你赚钱", "真心"]
    },
    "shopping_scam": {
        "label": "虚假购物诈骗",
        "description": "钓鱼网站、虚假商品、退款陷阱",
        "keywords": ["低价出售", "限时抢购", "退货退款", "物流异常", "恭喜中奖"]
    },
    "friend_scam": {
        "label": "冒充熟人诈骗",
        "description": "冒充领导、亲友、老板借钱",
        "keywords": ["老板", "领导", "急用", "借钱", "先转", "还你"]
    },
    "loan_scam": {
        "label": "虚假贷款诈骗",
        "description": "低息贷款、免抵押、验证流水",
        "keywords": ["低息贷款", "免抵押", "秒到账", "验证流水", "解冻费"]
    },
    "refund_scam": {
        "label": "电商退款诈骗",
        "description": "冒充客服、理赔退款、账户异常",
        "keywords": ["客服", "退款", "订单异常", "赔偿", "验证码"]
    },
    "lottery_scam": {
        "label": "中奖信息诈骗",
        "description": "虚假中奖通知、需缴税/手续费",
        "keywords": ["恭喜中奖", "大奖", "手续费", "税费", "领取"]
    }
}

# 正常对话模板（负样本）
NORMAL_CONVERSATION_TEMPLATES = [
    "今天天气真好，我们去公园散步吧",
    "晚上一起吃火锅怎么样？",
    "明天的会议记得准时参加",
    "这个月工资已经发了，记得查收",
    "周末有空一起看电影吗？",
    "帮我带份午餐，谢谢",
    "快递到了，在门卫那里",
    "孩子的成绩出来了，考得还不错",
    "生日快乐！晚上一起庆祝",
    "出差回来了，给你带了特产",
    "记得按时吃药，注意休息",
    "公司下周组织团建，你参加吗？",
    "今天加班，晚点回家",
    "帮我看一下这个方案怎么样",
    "明天早上一起跑步吗？",
]


async def call_ollama(prompt: str, system_prompt: str = None, temperature: float = 0.8) -> str:
    """调用本地Ollama模型生成文本"""
    url = f"{OLLAMA_BASE_URL}/api/chat"
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": 500
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            return result.get("message", {}).get("content", "").strip()
    except Exception as e:
        print(f"Ollama调用失败: {e}")
        return ""


def load_source_data() -> list[dict]:
    """加载data_source中的原始数据"""
    all_data = []
    for json_file in DATA_SOURCE_DIR.glob("*.json"):
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "source_data" in data:
                    all_data.extend(data["source_data"])
                elif isinstance(data, list):
                    all_data.extend(data)
        except Exception as e:
            print(f"加载 {json_file} 失败: {e}")
    return all_data


async def generate_scam_dialogue(scam_type: str, scam_info: dict, reference_case: str = None) -> dict:
    """生成单个诈骗对话样本"""
    
    system_prompt = """你是一个反诈骗数据生成专家。你的任务是生成用于训练反诈骗模型的模拟诈骗对话。
生成的对话必须符合以下要求：
1. 真实模拟诈骗分子的话术和套路
2. 包含该诈骗类型的典型特征和关键词
3. 对话要自然流畅，像真实的聊天记录
4. 只输出对话内容，不要任何额外说明"""

    ref_text = f"\n参考案例:\n{reference_case[:500]}" if reference_case else ""
    
    prompt = f"""请生成一段{scam_info['label']}的诈骗对话。

诈骗类型描述: {scam_info['description']}
典型关键词: {', '.join(scam_info['keywords'])}
{ref_text}

生成要求:
1. 对话内容100-300字
2. 模拟诈骗分子发送给受害者的消息
3. 要包含诱导、施压、索取信息等典型诈骗特征
4. 可以是单条消息或多条连续消息

请直接输出对话内容:"""

    content = await call_ollama(prompt, system_prompt)
    
    if not content:
        # 使用备用模板
        content = generate_fallback_scam_text(scam_type, scam_info)
    
    return {
        "text": content,
        "is_fraud": True,
        "fraud_type": scam_type,
        "fraud_type_label": scam_info["label"],
        "risk_level": random.choice(["high", "critical"]),
        "source": "generated",
        "generated_at": datetime.now().isoformat()
    }


def generate_fallback_scam_text(scam_type: str, scam_info: dict) -> str:
    """生成备用诈骗文本（当LLM调用失败时）"""
    templates = {
        "investment_scam": [
            "您好，我是专业理财顾问，我们平台现有稳赚不赔的投资项目，日收益3%起，已有上千人获利。现在加入，首单免费体验，轻松月入过万。加我微信详细了解，机会难得，名额有限！",
            "恭喜您被选中参加我们的内部投资计划！这是银行内部渠道，保本保息，年化收益25%以上。只需要最低1万元起投，随时可以提现。现在开户还送500元红包！"
        ],
        "task_scam": [
            "【高薪兼职】在家做任务，日赚300-800元，简单点赞关注，多劳多得，结算即时到账。无需任何投入，新手也能轻松上手。名额有限，速来报名！加V：xxx",
            "亲，刷单兼职了解一下？每单佣金5-50元，一天做几十单轻松日入千元。先试做一单，满意后再继续。完全正规的电商运营，真实订单有保障。"
        ],
        "impersonation_scam": [
            "你好，这里是某某市公安局网络安全大队，经调查发现你的身份信息涉嫌一起跨境洗钱案件。为配合调查，需要你将账户资金转入安全账户进行资金核查，否则将对你实施司法冻结。",
            "【紧急通知】您的社保卡异常，涉嫌违规操作即将被停用。请立即联系我们的工作人员处理，需要下载指定APP配合进行远程核验。"
        ],
        "credit_scam": [
            "您好，我们是征信修复中心。检测到您的个人征信报告存在逾期记录，将影响您的贷款和信用卡申请。现在可以帮您处理修复，费用仅需998元，成功后再付款。",
        ],
        "ai_voice_scam": [
            "喂，我是xxx啊，我现在出了点急事，需要借5万块钱周转一下，明天就还你。我现在不方便转账，你先转到这个卡号：xxx，回头我给你转过去。",
        ],
        "loan_scam": [
            "【银行贷款】无抵押、无担保，最高可贷50万，利率低至0.3%，当天放款！仅需身份证即可申请。点击链接立即申请：xxx",
        ],
    }
    
    if scam_type in templates:
        return random.choice(templates[scam_type])
    
    # 通用模板
    keywords = random.sample(scam_info["keywords"], min(3, len(scam_info["keywords"])))
    return f"【{scam_info['label']}】紧急通知：{keywords[0]}相关事宜需要您立即处理。请添加专员微信xxx了解详情。{keywords[1]}，{keywords[2]}等问题都可以帮您解决。名额有限，抓紧时间！"


def generate_normal_sample() -> dict:
    """生成正常对话样本（负样本）"""
    text = random.choice(NORMAL_CONVERSATION_TEMPLATES)
    return {
        "text": text,
        "is_fraud": False,
        "fraud_type": None,
        "fraud_type_label": "正常对话",
        "risk_level": "safe",
        "source": "generated",
        "generated_at": datetime.now().isoformat()
    }


async def generate_test_dataset(
    scam_samples_per_type: int = 10,
    normal_samples: int = 50,
    use_llm: bool = True
):
    """生成完整的测试数据集"""
    print(f"开始生成测试数据集...")
    print(f"- 每种诈骗类型生成 {scam_samples_per_type} 个样本")
    print(f"- 生成 {normal_samples} 个正常对话样本")
    print(f"- 使用LLM生成: {use_llm}")
    print(f"- Ollama模型: {OLLAMA_MODEL}")
    print()
    
    # 加载参考数据
    source_data = load_source_data()
    print(f"已加载 {len(source_data)} 条参考数据")
    
    all_samples = []
    
    # 生成诈骗样本
    for scam_type, scam_info in SCAM_TYPES.items():
        print(f"\n生成 {scam_info['label']} 样本...")
        
        for i in range(scam_samples_per_type):
            # 随机选择一个参考案例
            ref_case = None
            if source_data:
                ref_item = random.choice(source_data)
                ref_case = ref_item.get("content", ref_item.get("text", ""))
            
            if use_llm:
                sample = await generate_scam_dialogue(scam_type, scam_info, ref_case)
            else:
                sample = {
                    "text": generate_fallback_scam_text(scam_type, scam_info),
                    "is_fraud": True,
                    "fraud_type": scam_type,
                    "fraud_type_label": scam_info["label"],
                    "risk_level": random.choice(["high", "critical"]),
                    "source": "template",
                    "generated_at": datetime.now().isoformat()
                }
            
            all_samples.append(sample)
            print(f"  [{i+1}/{scam_samples_per_type}] 已生成")
            
            # 避免过快请求
            if use_llm:
                await asyncio.sleep(0.5)
    
    # 生成正常对话样本
    print(f"\n生成正常对话样本...")
    for i in range(normal_samples):
        sample = generate_normal_sample()
        all_samples.append(sample)
    print(f"  已生成 {normal_samples} 个正常样本")
    
    # 打乱顺序
    random.shuffle(all_samples)
    
    # 保存数据集
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # JSON格式
    output_file = OUTPUT_DIR / "test_dataset.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_samples, f, ensure_ascii=False, indent=2)
    print(f"\n数据集已保存到: {output_file}")
    
    # JSONL格式
    output_file_jsonl = OUTPUT_DIR / "test_dataset.jsonl"
    with open(output_file_jsonl, "w", encoding="utf-8") as f:
        for sample in all_samples:
            f.write(json.dumps(sample, ensure_ascii=False) + "\n")
    print(f"JSONL格式已保存到: {output_file_jsonl}")
    
    # 统计信息
    fraud_count = sum(1 for s in all_samples if s["is_fraud"])
    normal_count = len(all_samples) - fraud_count
    
    print(f"\n=== 数据集统计 ===")
    print(f"总样本数: {len(all_samples)}")
    print(f"诈骗样本: {fraud_count}")
    print(f"正常样本: {normal_count}")
    print(f"诈骗类型覆盖: {len(SCAM_TYPES)} 种")
    
    # 按类型统计
    type_counts = {}
    for sample in all_samples:
        if sample["is_fraud"]:
            t = sample["fraud_type_label"]
            type_counts[t] = type_counts.get(t, 0) + 1
    
    print(f"\n各诈骗类型分布:")
    for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  - {t}: {c} 样本")
    
    return all_samples


async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="生成反诈骗测试数据集")
    parser.add_argument("--samples", type=int, default=5, help="每种诈骗类型的样本数")
    parser.add_argument("--normal", type=int, default=30, help="正常对话样本数")
    parser.add_argument("--no-llm", action="store_true", help="不使用LLM，仅使用模板生成")
    
    args = parser.parse_args()
    
    await generate_test_dataset(
        scam_samples_per_type=args.samples,
        normal_samples=args.normal,
        use_llm=not args.no_llm
    )


if __name__ == "__main__":
    asyncio.run(main())
