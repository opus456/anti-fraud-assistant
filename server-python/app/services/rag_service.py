"""
RAG 检索服务
- 优先使用 pgvector 余弦检索 Top-K
- 向量不可用时自动退化为 TF-IDF
"""
from __future__ import annotations

import hashlib
import logging
import json
from pathlib import Path
from typing import Optional
from collections import Counter

import jieba
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select, text

from app.models import ScamKnowledge
from app.database import async_session
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)


class RAGService:
    """
    知识库 RAG 检索服务
    优先使用 pgvector 向量检索；向量未就绪时退化为 TF-IDF
    """

    def __init__(self):
        self._vectorizer: Optional[TfidfVectorizer] = None
        self._tfidf_matrix = None
        self._doc_ids: list[int] = []
        self._dirty = True

    @staticmethod
    def generate_doc_id(text: str) -> str:
        return hashlib.md5(text.encode("utf-8")).hexdigest()

    @staticmethod
    def _tokenize(text: str) -> str:
        words = jieba.lcut(text)
        return " ".join(w for w in words if len(w.strip()) > 0)

    @staticmethod
    def _keyword_overlap(query: str, doc: str) -> float:
        q_words = [w for w in jieba.lcut(query) if len(w.strip()) > 1]
        d_words = [w for w in jieba.lcut(doc) if len(w.strip()) > 1]
        if not q_words or not d_words:
            return 0.0
        q_counter = Counter(q_words)
        d_counter = Counter(d_words)
        overlap = sum(min(q_counter[w], d_counter.get(w, 0)) for w in q_counter)
        return min(overlap / max(len(q_words), 1), 1.0)

    # ==================== TF-IDF 索引 ====================

    async def _rebuild_tfidf_index(self):
        async with async_session() as db:
            result = await db.execute(
                select(ScamKnowledge.id, ScamKnowledge.title, ScamKnowledge.content)
                .where(ScamKnowledge.is_active == True)
            )
            rows = result.all()

        if not rows:
            self._vectorizer = None
            self._tfidf_matrix = None
            self._doc_ids = []
            self._dirty = False
            return

        self._doc_ids = [r.id for r in rows]
        corpus = [self._tokenize(f"{r.title} {r.content}") for r in rows]
        self._vectorizer = TfidfVectorizer(max_features=20000, sublinear_tf=True)
        self._tfidf_matrix = self._vectorizer.fit_transform(corpus)
        self._dirty = False
        logger.info(f"TF-IDF 索引已重建，文档数: {len(self._doc_ids)}")

    async def _ensure_index(self):
        if self._dirty or self._vectorizer is None:
            await self._rebuild_tfidf_index()

    # ==================== 检索 ====================

    async def search_similar(self, query: str, top_k: int = 3) -> list[dict]:
        """搜索相似案例，优先 pgvector。"""
        vector_results = await self._search_similar_pgvector(query, top_k=top_k)
        if vector_results:
            return vector_results
        return await self._search_similar_tfidf(query, top_k=top_k)

    async def _search_similar_pgvector(self, query: str, top_k: int = 3) -> list[dict]:
        query_embedding = await embedding_service.embed_text(query)
        if not query_embedding:
            return []

        try:
            async with async_session() as db:
                stmt = (
                    select(
                        ScamKnowledge,
                        (1 - ScamKnowledge.embedding.cosine_distance(query_embedding)).label("similarity"),
                    )
                    .where(
                        ScamKnowledge.is_active == True,
                        ScamKnowledge.embedding.isnot(None),
                    )
                    .order_by(ScamKnowledge.embedding.cosine_distance(query_embedding))
                    .limit(top_k)
                )
                result = await db.execute(stmt)
                rows = result.all()

            formatted = []
            for row, similarity in rows:
                if similarity is None:
                    continue
                sim = float(similarity)
                if sim < 0.01:
                    continue
                formatted.append({
                    "id": row.doc_id,
                    "title": row.title,
                    "content": row.content[:300],
                    "category": row.category,
                    "source": row.source,
                    "scam_type": row.scam_type,
                    "similarity": round(sim, 4),
                })
            return formatted
        except Exception as exc:
            logger.warning(f"pgvector 检索失败，回退 TF-IDF: {exc}")
            return []

    async def _search_similar_tfidf(self, query: str, top_k: int = 3) -> list[dict]:
        await self._ensure_index()
        if self._vectorizer is None or self._tfidf_matrix is None:
            return []

        query_vec = self._vectorizer.transform([self._tokenize(query)])
        scores = cosine_similarity(query_vec, self._tfidf_matrix).flatten()
        indices = np.argsort(scores)[::-1]

        results = []
        async with async_session() as db:
            for idx in indices:
                if len(results) >= top_k:
                    break
                if scores[idx] < 0.01:
                    break

                row_id = self._doc_ids[idx]
                result = await db.execute(
                    select(ScamKnowledge).where(ScamKnowledge.id == row_id, ScamKnowledge.is_active == True)
                )
                row = result.scalar_one_or_none()
                if not row:
                    continue

                hybrid_score = (
                    0.75 * float(scores[idx])
                    + 0.25 * self._keyword_overlap(query, f"{row.title} {row.content}")
                )
                results.append({
                    "id": row.doc_id,
                    "title": row.title,
                    "content": row.content[:300],
                    "category": row.category,
                    "source": row.source,
                    "scam_type": row.scam_type,
                    "similarity": round(float(hybrid_score), 4),
                })

        return sorted(results, key=lambda x: x["similarity"], reverse=True)

    async def search_knowledge(self, query: str, top_k: int = 5, category: str = None) -> list[dict]:
        """搜索知识库"""
        await self._ensure_index()
        if self._vectorizer is None or self._tfidf_matrix is None:
            return []

        query_vec = self._vectorizer.transform([self._tokenize(query)])
        scores = cosine_similarity(query_vec, self._tfidf_matrix).flatten()
        indices = np.argsort(scores)[::-1]

        results = []
        async with async_session() as db:
            for idx in indices:
                if len(results) >= top_k:
                    break
                if scores[idx] < 0.01:
                    break

                row_id = self._doc_ids[idx]
                result = await db.execute(
                    select(ScamKnowledge).where(ScamKnowledge.id == row_id, ScamKnowledge.is_active == True)
                )
                row = result.scalar_one_or_none()
                if not row:
                    continue
                if category and row.category != category:
                    continue

                hybrid_score = (
                    0.8 * float(scores[idx])
                    + 0.2 * self._keyword_overlap(query, f"{row.title} {row.content}")
                )
                results.append({
                    "id": row.doc_id,
                    "title": row.title,
                    "content": row.content[:500],
                    "category": row.category,
                    "source": row.source,
                    "scam_type": row.scam_type,
                    "similarity": round(float(hybrid_score), 4),
                })

        return sorted(results, key=lambda x: x["similarity"], reverse=True)

    # ==================== 写入 ====================

    async def add_knowledge(
        self, title: str, content: str, category: str = "", source: str = "", scam_type: str = ""
    ) -> str:
        doc_id = self.generate_doc_id(f"{title}_{content[:100]}")
        embedding = await embedding_service.embed_text(f"{title}\n{content[:3000]}")
        async with async_session() as db:
            existing = await db.execute(
                select(ScamKnowledge).where(ScamKnowledge.doc_id == doc_id)
            )
            if existing.scalar_one_or_none():
                return doc_id

            entry = ScamKnowledge(
                doc_id=doc_id,
                title=title,
                content=content,
                category=category,
                source=source,
                scam_type=scam_type,
                embedding=embedding,
            )
            db.add(entry)
            await db.commit()

        self._dirty = True
        logger.info(f"已添加知识条目: {title[:40]}")
        return doc_id

    async def delete_entry(self, doc_id: str) -> bool:
        async with async_session() as db:
            result = await db.execute(
                select(ScamKnowledge).where(ScamKnowledge.doc_id == doc_id)
            )
            entry = result.scalar_one_or_none()
            if entry:
                entry.is_active = False
                await db.commit()
                self._dirty = True
                return True
        return False

    async def get_stats(self) -> dict:
        async with async_session() as db:
            total_result = await db.execute(
                text("SELECT COUNT(*) FROM scam_knowledge_base WHERE is_active = true")
            )
            total = total_result.scalar() or 0
            case_result = await db.execute(
                text("SELECT COUNT(*) FROM scam_knowledge_base WHERE is_active = true AND category = 'case'")
            )
            case_count = case_result.scalar() or 0
        return {"knowledge_count": total - case_count, "case_count": case_count, "total": total}

    async def list_knowledge(self, query: str = "", category: str = "", limit: int = 500) -> list[dict]:
        async with async_session() as db:
            stmt = (
                select(ScamKnowledge)
                .where(ScamKnowledge.is_active == True)
                .order_by(ScamKnowledge.created_at.desc())
                .limit(limit)
            )
            result = await db.execute(stmt)
            rows = result.scalars().all()

        q = (query or "").strip().lower()
        c = (category or "").strip()

        filtered: list[dict] = []
        for row in rows:
            if c and row.category != c:
                continue

            if q:
                haystack = f"{row.title} {row.content} {row.category} {row.scam_type}".lower()
                if q not in haystack:
                    continue

            filtered.append({
                "id": row.doc_id,
                "title": row.title,
                "content": row.content,
                "category": row.category,
                "source": row.source,
                "scam_type": row.scam_type,
                "similarity": None,
            })

        return filtered

    async def bootstrap_builtin_knowledge(self) -> int:
        """从内置 data_source 导入知识，返回新增条目数。"""
        base_dir = Path(__file__).resolve().parents[2]
        data_dir = base_dir / "data_source"

        source_files = [
            ("百度反诈.json", "百度反诈", "prevention"),
            ("搜狗反诈.json", "搜狗反诈", "case"),
            ("搜狗诈骗预警.json", "搜狗诈骗预警", "warning"),
            ("搜狗-诈骗套路.json", "搜狗诈骗套路", "case"),
        ]

        added = 0
        for filename, source, default_category in source_files:
            file_path = data_dir / filename
            if not file_path.exists():
                continue

            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    payload = json.load(f)
            except Exception as exc:
                logger.warning(f"读取知识源失败 {file_path.name}: {exc}")
                continue

            items = payload if isinstance(payload, list) else payload.get("data", payload.get("items", []))
            for item in items:
                title = item.get("title", item.get("name", "")).strip()
                content = item.get("content", item.get("description", item.get("text", ""))).strip()
                if not title or not content:
                    continue

                doc_key = self.generate_doc_id(f"{title}_{content[:100]}")
                async with async_session() as db:
                    exists = await db.execute(select(ScamKnowledge).where(ScamKnowledge.doc_id == doc_key))
                    if exists.scalar_one_or_none():
                        continue

                await self.add_knowledge(
                    title=title,
                    content=content,
                    category=item.get("category", default_category),
                    source=source,
                    scam_type=item.get("scam_type", item.get("fraud_type", item.get("type", ""))),
                )
                added += 1

        if added > 0:
            logger.info(f"内置知识库导入完成，新增 {added} 条")
        return added

    def mark_dirty(self):
        self._dirty = True


rag_service = RAGService()
