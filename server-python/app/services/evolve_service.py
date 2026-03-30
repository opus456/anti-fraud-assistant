"""
自适应进化服务 — 管理员审核 + 知识库更新
"""
import logging

from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)


class EvolveService:

    async def add_new_scam_case(self, title: str, content: str, scam_type: str = "", source: str = "admin_review"):
        """
        管理员审核确认新型诈骗数据，写入知识库并生成 embedding。
        """
        doc_id = await rag_service.add_knowledge(
            title=title,
            content=content,
            category="case",
            source=source,
            scam_type=scam_type,
        )
        logger.info(f"进化：新增诈骗案例 doc_id={doc_id}, scam_type={scam_type}")
        return doc_id


evolve_service = EvolveService()
