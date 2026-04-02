"""
从 data_source 中提取诈骗案例，生成大模型微调数据集
支持多种格式：
1. 分类格式 (text, label, fraud_type) - 用于训练分类模型
2. JSON Lines 格式 - 通用微调格式
3. Alpaca 格式 - 常用指令微调格式
"""
import json
import re
import os
from pathlib import Path
from typing import List, Dict, Any
import hashlib

# 数据源目录
DATA_SOURCE_DIR = Path(__file__).parent.parent / "data_source"
OUTPUT_DIR = Path(__file__).parent.parent / "finetune_data"

# 诈骗类型映射
FRAUD_TYPE_MAP = {
    "网络游戏": "game_scam",
    "游戏": "game_scam",
    "投资": "investment_scam",
    "理财": "investment_scam",
    "金融": "investment_scam",
    "刷单": "task_scam",
    "兼职": "task_scam",
    "婚恋": "romance_scam",
    "交友": "romance_scam",
    "杀猪盘": "romance_scam",
    "冒充": "impersonation_scam",
    "公检法": "impersonation_scam",
    "领导": "impersonation_scam",
    "客服": "impersonation_scam",
    "贷款": "loan_scam",
    "网贷": "loan_scam",
    "中奖": "lottery_scam",
    "退款": "refund_scam",
    "退票": "refund_scam",
    "集资": "crowdfunding_scam",
    "众筹": "crowdfunding_scam",
    "虚拟货币": "crypto_scam",
    "区块链": "crypto_scam",
    "快递": "express_scam",
    "电信": "telecom_scam",
    "短信": "telecom_scam",
    "钓鱼": "phishing_scam",
    "霸屏": "phishing_scam",
}

FRAUD_TYPE_LABELS = {
    "game_scam": "网络游戏诈骗",
    "investment_scam": "投资理财诈骗",
    "task_scam": "刷单兼职诈骗",
    "romance_scam": "婚恋交友诈骗",
    "impersonation_scam": "冒充身份诈骗",
    "loan_scam": "贷款诈骗",
    "lottery_scam": "中奖诈骗",
    "refund_scam": "退款退票诈骗",
    "crowdfunding_scam": "非法集资诈骗",
    "crypto_scam": "虚拟货币诈骗",
    "express_scam": "快递诈骗",
    "telecom_scam": "电信诈骗",
    "phishing_scam": "钓鱼网站诈骗",
    "other_scam": "其他诈骗",
}


def detect_fraud_type(title: str, content: str) -> str:
    """根据标题和内容推断诈骗类型"""
    text = title + " " + content
    for keyword, fraud_type in FRAUD_TYPE_MAP.items():
        if keyword in text:
            return fraud_type
    return "other_scam"


def extract_case_from_content(content: str) -> List[Dict[str, str]]:
    """从内容中提取具体的诈骗案例"""
    cases = []
    
    # 提取 "事件经过" 部分
    patterns = [
        r"事件经过[：:\s]*\n*([\s\S]*?)(?=处理指导|小度支招|应对策略|防范意见|$)",
        r"案例[一二三四五六七八九十\d]+[：:\s]*\n*([\s\S]*?)(?=案例|防骗提醒|$)",
        r"第一步[、：:\s]*([\s\S]*?)(?=第二步|$)",
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            case_text = match.strip()
            if len(case_text) > 50:  # 过滤太短的内容
                cases.append({
                    "text": clean_text(case_text),
                    "is_fraud": True,
                })
    
    # 如果没有提取到具体案例，使用整个内容
    if not cases and len(content) > 100:
        # 提取核心段落（去除防范建议等）
        core_content = re.sub(r"(防范意见|应对策略|小度支招|处理指导)[\s\S]*", "", content)
        if len(core_content) > 100:
            cases.append({
                "text": clean_text(core_content[:2000]),  # 限制长度
                "is_fraud": True,
            })
    
    return cases


def clean_text(text: str) -> str:
    """清理文本"""
    # 移除多余的换行和空格
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    # 移除图片标记等
    text = re.sub(r'\[图片\]|\[表格\]', '', text)
    return text.strip()


def generate_negative_samples() -> List[Dict[str, Any]]:
    """生成负样本（非诈骗文本）"""
    # 一些正常对话/信息的模板
    normal_texts = [
        "您好，您的快递已经到达小区驿站，请凭取件码前来领取。",
        "尊敬的用户，您本月话费账单为68.5元，请于月底前缴纳。",
        "张先生您好，您预约的体检时间为明天上午9点，请准时到达。",
        "您的银行卡尾号1234于今日15:30消费人民币200.00元，余额5800.00元。",
        "亲爱的会员，您在我店购买的商品已发货，快递单号：SF1234567890。",
        "同学聚会定在下周六晚上7点，老地方见，记得准时哦！",
        "妈，我到学校了，一切都好，不用担心。",
        "领导，今天的会议纪要我已经整理好发到您邮箱了。",
        "今天天气不错，要不要一起去公园跑步？",
        "提醒您：您预约的医生门诊号为A015，请提前30分钟到达候诊区。",
        "您的信用卡账单已出，本期应还款金额3256.78元，最后还款日为25号。",
        "双十一活动开始啦！全场满300减50，快来选购吧！",
        "您关注的商品已降价，现价199元，比您关注时降了50元。",
        "朋友推荐的那本书不错，我已经看完了，改天借你。",
        "明天公司组织团建，请穿运动服装，9点在公司门口集合。",
    ]
    
    samples = []
    for text in normal_texts:
        samples.append({
            "text": text,
            "is_fraud": False,
            "fraud_type": None,
            "fraud_type_label": "正常信息",
            "risk_level": "safe",
        })
    
    return samples


def load_all_data() -> List[Dict[str, Any]]:
    """加载所有数据源"""
    all_items = []
    
    for json_file in DATA_SOURCE_DIR.glob("*.json"):
        print(f"处理文件: {json_file.name}")
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        source_name = data.get("website_name", json_file.stem)
        source_data = data.get("source_data", [])
        
        for item in source_data:
            title = item.get("title", "")
            content = item.get("content", "")
            
            if not content:
                continue
            
            fraud_type = detect_fraud_type(title, content)
            
            # 提取案例
            cases = extract_case_from_content(content)
            
            for case in cases:
                sample = {
                    "text": case["text"],
                    "is_fraud": True,
                    "fraud_type": fraud_type,
                    "fraud_type_label": FRAUD_TYPE_LABELS.get(fraud_type, "其他诈骗"),
                    "risk_level": "high",
                    "title": title,
                    "source": source_name,
                }
                all_items.append(sample)
    
    return all_items


def deduplicate(samples: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """去重"""
    seen = set()
    unique = []
    for sample in samples:
        # 使用文本的hash去重
        text_hash = hashlib.md5(sample["text"].encode()).hexdigest()
        if text_hash not in seen:
            seen.add(text_hash)
            unique.append(sample)
    return unique


def save_classification_format(samples: List[Dict[str, Any]], output_path: Path):
    """保存为分类格式 (适合文本分类微调)"""
    data = []
    for sample in samples:
        data.append({
            "text": sample["text"],
            "label": 1 if sample["is_fraud"] else 0,
            "fraud_type": sample.get("fraud_type"),
            "fraud_type_label": sample.get("fraud_type_label"),
        })
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已保存分类格式: {output_path}")


def save_jsonl_format(samples: List[Dict[str, Any]], output_path: Path):
    """保存为 JSON Lines 格式 (适合通用微调)"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for sample in samples:
            line = json.dumps(sample, ensure_ascii=False)
            f.write(line + '\n')
    print(f"✅ 已保存 JSONL 格式: {output_path}")


def save_alpaca_format(samples: List[Dict[str, Any]], output_path: Path):
    """保存为 Alpaca 指令微调格式"""
    alpaca_data = []
    
    for sample in samples:
        if sample["is_fraud"]:
            output = f"""检测结果：疑似诈骗
风险等级：高
诈骗类型：{sample.get('fraud_type_label', '未知')}
分析：该内容包含典型的诈骗特征，如虚假承诺、诱导转账、套取个人信息等。请提高警惕，切勿轻信。"""
        else:
            output = """检测结果：正常
风险等级：安全
分析：未检测到明显的诈骗特征，该信息为正常内容。"""
        
        alpaca_data.append({
            "instruction": "请分析以下内容是否为诈骗信息，并给出风险等级和诈骗类型判断。",
            "input": sample["text"],
            "output": output,
        })
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(alpaca_data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已保存 Alpaca 格式: {output_path}")


def save_chat_format(samples: List[Dict[str, Any]], output_path: Path):
    """保存为对话格式 (适合 ChatGLM/Qwen 等模型微调)"""
    chat_data = []
    
    for sample in samples:
        if sample["is_fraud"]:
            assistant_response = f"""这是一条**高风险**的诈骗信息。

🚨 **风险等级**：高
🏷️ **诈骗类型**：{sample.get('fraud_type_label', '未知类型')}

**分析**：
该内容具有典型的诈骗特征，包括但不限于：
- 诱导性承诺（高回报、稳赚不赔等）
- 套取个人信息或资金
- 制造紧迫感迫使快速决策

**建议**：
1. 立即停止与对方的交流
2. 不要透露任何个人信息
3. 不要进行任何转账操作
4. 如已受骗，请立即拨打110报警"""
        else:
            assistant_response = """这是一条**正常**的信息。

✅ **风险等级**：安全
📝 **类型**：正常信息

**分析**：
未检测到明显的诈骗特征，该信息为日常正常内容。"""
        
        chat_data.append({
            "conversations": [
                {"role": "user", "content": f"请帮我分析这条信息是否是诈骗：\n\n{sample['text']}"},
                {"role": "assistant", "content": assistant_response}
            ]
        })
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(chat_data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已保存对话格式: {output_path}")


def print_statistics(samples: List[Dict[str, Any]]):
    """打印数据集统计信息"""
    total = len(samples)
    fraud_count = sum(1 for s in samples if s["is_fraud"])
    normal_count = total - fraud_count
    
    print("\n" + "=" * 50)
    print("📊 数据集统计")
    print("=" * 50)
    print(f"总样本数: {total}")
    print(f"诈骗样本: {fraud_count} ({fraud_count/total*100:.1f}%)")
    print(f"正常样本: {normal_count} ({normal_count/total*100:.1f}%)")
    
    # 按诈骗类型统计
    type_counts = {}
    for s in samples:
        if s["is_fraud"]:
            ft = s.get("fraud_type_label", "未知")
            type_counts[ft] = type_counts.get(ft, 0) + 1
    
    print("\n📋 诈骗类型分布:")
    for ft, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  - {ft}: {count}")
    print("=" * 50)


def main():
    """主函数"""
    print("🚀 开始生成微调数据集...")
    
    # 创建输出目录
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 加载诈骗数据
    fraud_samples = load_all_data()
    print(f"📥 加载诈骗样本: {len(fraud_samples)} 条")
    
    # 生成负样本
    normal_samples = generate_negative_samples()
    print(f"📥 生成正常样本: {len(normal_samples)} 条")
    
    # 合并并去重
    all_samples = fraud_samples + normal_samples
    all_samples = deduplicate(all_samples)
    print(f"📝 去重后总样本: {len(all_samples)} 条")
    
    # 打印统计信息
    print_statistics(all_samples)
    
    # 保存不同格式
    save_classification_format(all_samples, OUTPUT_DIR / "classification_dataset.json")
    save_jsonl_format(all_samples, OUTPUT_DIR / "dataset.jsonl")
    save_alpaca_format(all_samples, OUTPUT_DIR / "alpaca_dataset.json")
    save_chat_format(all_samples, OUTPUT_DIR / "chat_dataset.json")
    
    print("\n✅ 所有格式数据集已生成完毕！")
    print(f"📁 输出目录: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
