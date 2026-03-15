"""
知识库初始化脚本
从 data/ 目录的JSON文件中导入反诈知识到SQLite数据库
"""
import json
import os
import sys
import re
import logging

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.knowledge_service import knowledge_service
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# 诈骗类型关键词映射（用于自动分类）
FRAUD_TYPE_MAPPING = {
    "投资": "investment",
    "理财": "investment",
    "金融": "investment",
    "冒充": "impersonation",
    "公检法": "impersonation",
    "客服": "impersonation",
    "婚恋": "romance",
    "交友": "romance",
    "杀猪盘": "romance",
    "刷单": "task_scam",
    "兼职": "task_scam",
    "做任务": "task_scam",
    "贷款": "loan",
    "校园贷": "loan",
    "购物": "shopping",
    "退款": "shopping",
    "钓鱼": "phishing",
    "链接": "phishing",
    "游戏": "gaming",
    "充值": "gaming",
    "电信": "telecom",
    "电话": "telecom",
    "AI": "ai_deepfake",
    "换脸": "ai_deepfake",
    "深度伪造": "ai_deepfake",
}


def detect_fraud_type(title: str, content: str) -> str:
    """根据标题和内容自动检测诈骗类型"""
    text = title + content[:500]
    for keyword, fraud_type in FRAUD_TYPE_MAPPING.items():
        if keyword in text:
            return fraud_type
    return ""


def detect_category(title: str, content: str, source_name: str) -> str:
    """自动检测文档类别"""
    text = title + content[:300]

    # 法律法规
    if any(kw in text for kw in ["法律", "法规", "条例", "中华人民共和国", "法院", "立法"]):
        return "law"

    # 预警信息
    if any(kw in text for kw in ["预警", "警告", "紧急", "话术", "劝阻"]):
        return "warning"

    # 预防指南
    if any(kw in text for kw in ["防范", "防骗", "技巧", "指南", "识别", "反诈", "防诈"]):
        return "prevention"

    # 案例
    if any(kw in text for kw in ["案例", "诈骗", "套路", "手法", "受害", "被骗"]):
        return "case"

    return "case"  # 默认归类为案例


def load_json_data(file_path: str) -> list[dict]:
    """加载JSON数据文件"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 处理数据结构: {website_name, source_url, source_data: [{title, content}]}
        if isinstance(data, dict) and "source_data" in data:
            source_name = data.get("website_name", "")
            articles = data["source_data"]
            for article in articles:
                article["source"] = source_name
            return articles
        elif isinstance(data, list):
            return data
        else:
            logger.warning(f"未知的数据格式: {file_path}")
            return []
    except Exception as e:
        logger.error(f"加载文件失败 {file_path}: {e}")
        return []


def init_knowledge_base():
    """
    初始化知识库
    读取data目录下所有JSON文件，处理后导入ChromaDB
    """
    data_dir = settings.DATA_SOURCE_DIR
    logger.info(f"📂 数据源目录: {data_dir}")

    if not os.path.exists(data_dir):
        logger.error(f"数据目录不存在: {data_dir}")
        return

    # 获取所有JSON文件
    json_files = [f for f in os.listdir(data_dir) if f.endswith(".json")]
    logger.info(f"📄 发现 {len(json_files)} 个JSON数据文件")

    total_added = 0

    for json_file in json_files:
        file_path = os.path.join(data_dir, json_file)
        logger.info(f"\n{'='*50}")
        logger.info(f"📖 正在处理: {json_file}")

        articles = load_json_data(file_path)
        logger.info(f"  发现 {len(articles)} 篇文章")

        for article in articles:
            title = article.get("title", "").strip()
            content = article.get("content", "").strip()
            source = article.get("source", json_file)

            if not title or not content:
                continue

            # 清洗内容
            content = re.sub(r'\s+', ' ', content)

            # 自动检测分类和诈骗类型
            category = detect_category(title, content, source)
            fraud_type = detect_fraud_type(title, content)

            # 添加到知识库
            try:
                knowledge_service.add_knowledge(
                    title=title,
                    content=content,
                    category=category,
                    source=source,
                    fraud_type=fraud_type
                )
                total_added += 1
                logger.info(f"  ✅ [{category}] {title[:40]}... (类型: {fraud_type or '通用'})")
            except Exception as e:
                logger.error(f"  ❌ 添加失败: {title[:30]}... - {e}")

    # 显示最终统计
    stats = knowledge_service.get_stats()
    logger.info(f"\n{'='*50}")
    logger.info(f"🎉 知识库初始化完成!")
    logger.info(f"  本次导入: {total_added} 条")
    logger.info(f"  知识库总量: {stats['knowledge_count']} 条知识")
    logger.info(f"  案例库总量: {stats['case_count']} 条案例")
    logger.info(f"  总计: {stats['total']} 条")


if __name__ == "__main__":
    init_knowledge_base()
