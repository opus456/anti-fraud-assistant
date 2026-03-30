"""
知识库初始化脚本 — 从 JSON 数据源导入到 PostgreSQL
"""
import asyncio
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.rag_service import rag_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data_source"


async def load_json_file(filepath: Path, source: str, default_category: str = "case"):
    """加载单个 JSON 数据源文件"""
    if not filepath.exists():
        logger.warning(f"文件不存在: {filepath}")
        return 0

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    items = data if isinstance(data, list) else data.get("data", data.get("items", []))

    for item in items:
        title = item.get("title", item.get("name", ""))
        content = item.get("content", item.get("description", item.get("text", "")))
        if not title or not content:
            continue

        scam_type = item.get("scam_type", item.get("fraud_type", item.get("type", "")))
        category = item.get("category", default_category)

        await rag_service.add_knowledge(
            title=title,
            content=content,
            category=category,
            source=source,
            scam_type=scam_type,
        )
        count += 1

    logger.info(f"已导入 {count} 条数据 from {filepath.name}")
    return count


async def main():
    total = 0

    files = [
        ("百度反诈.json", "百度反诈", "prevention"),
        ("搜狗反诈.json", "搜狗反诈", "case"),
        ("搜狗诈骗预警.json", "搜狗诈骗预警", "warning"),
        ("搜狗-诈骗套路.json", "搜狗诈骗套路", "case"),
    ]

    for filename, source, category in files:
        filepath = DATA_DIR / filename
        count = await load_json_file(filepath, source, category)
        total += count

    logger.info(f"知识库初始化完成，共导入 {total} 条数据")
    stats = await rag_service.get_stats()
    logger.info(f"知识库统计: {stats}")


if __name__ == "__main__":
    asyncio.run(main())
