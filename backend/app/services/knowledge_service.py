"""
知识库服务
基于SQLite + TF-IDF + jieba的纯Python RAG检索服务
实现反诈知识的存储、检索和管理（无需C++编译依赖）
"""
import hashlib
import logging
import sqlite3
from typing import Optional
from pathlib import Path
from collections import Counter

import jieba
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# 知识库SQLite路径（与ORM的asyncio引擎分开，这里用同步连接做全文检索）
_KB_DB_PATH = str(Path(settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "")))


class KnowledgeService:
    """
    反诈知识库服务
    使用 SQLite 存储 + jieba 分词 + TF-IDF 向量化 + 余弦相似度检索
    """

    def __init__(self):
        self._vectorizer: Optional[TfidfVectorizer] = None
        self._tfidf_matrix = None
        self._doc_ids: list[int] = []
        self._dirty = True  # 标记是否需要重建索引
        self._ensure_table()

    def _get_conn(self) -> sqlite3.Connection:
        """获取同步SQLite连接"""
        conn = sqlite3.connect(_KB_DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_table(self):
        """确保知识库表存在"""
        conn = self._get_conn()
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doc_id TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT '',
                    source TEXT DEFAULT '',
                    fraud_type TEXT DEFAULT '',
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ke_category ON knowledge_entries(category)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ke_fraud_type ON knowledge_entries(fraud_type)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ke_doc_id ON knowledge_entries(doc_id)")
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def _generate_id(text: str) -> str:
        return hashlib.md5(text.encode('utf-8')).hexdigest()

    @staticmethod
    def _tokenize(text: str) -> str:
        """使用jieba分词，返回空格分隔的词串"""
        words = jieba.lcut(text)
        return " ".join(w for w in words if len(w.strip()) > 0)

    @staticmethod
    def _keyword_overlap_score(query: str, doc_text: str) -> float:
        """关键词重叠评分，用于混合检索中的稀疏召回补偿。"""
        q_words = [w for w in jieba.lcut(query) if len(w.strip()) > 1]
        d_words = [w for w in jieba.lcut(doc_text) if len(w.strip()) > 1]
        if not q_words or not d_words:
            return 0.0

        q_counter = Counter(q_words)
        d_counter = Counter(d_words)
        overlap = sum(min(q_counter[w], d_counter.get(w, 0)) for w in q_counter)
        return min(overlap / max(len(q_words), 1), 1.0)

    # ===================== 索引构建 =====================

    def _rebuild_index(self):
        """从数据库加载所有文档，构建TF-IDF索引"""
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT id, title, content FROM knowledge_entries WHERE is_active = 1"
            ).fetchall()
        finally:
            conn.close()

        if not rows:
            self._vectorizer = None
            self._tfidf_matrix = None
            self._doc_ids = []
            self._dirty = False
            return

        self._doc_ids = [r["id"] for r in rows]
        corpus = [self._tokenize(f'{r["title"]} {r["content"]}') for r in rows]

        self._vectorizer = TfidfVectorizer(max_features=20000, sublinear_tf=True)
        self._tfidf_matrix = self._vectorizer.fit_transform(corpus)
        self._dirty = False
        logger.info(f"TF-IDF索引已重建，文档数: {len(self._doc_ids)}")

    def _ensure_index(self):
        if self._dirty or self._vectorizer is None:
            self._rebuild_index()

    # ===================== 写入 =====================

    def add_knowledge(
        self,
        title: str,
        content: str,
        category: str,
        source: str = "",
        fraud_type: str = "",
    ) -> str:
        doc_id = self._generate_id(f"{title}_{content[:100]}")
        conn = self._get_conn()
        try:
            conn.execute(
                """INSERT OR REPLACE INTO knowledge_entries
                   (doc_id, title, content, category, source, fraud_type, is_active)
                   VALUES (?, ?, ?, ?, ?, ?, 1)""",
                (doc_id, title, content, category, source, fraud_type)
            )
            conn.commit()
        finally:
            conn.close()

        self._dirty = True
        logger.info(f"已添加知识条目: {title[:40]}")
        return doc_id

    # ===================== 检索 =====================

    def search_knowledge(
        self,
        query: str,
        top_k: int = 5,
        category: Optional[str] = None
    ) -> list[dict]:
        """基于TF-IDF余弦相似度搜索知识"""
        self._ensure_index()
        if self._vectorizer is None or self._tfidf_matrix is None:
            return []

        query_vec = self._vectorizer.transform([self._tokenize(query)])
        scores = cosine_similarity(query_vec, self._tfidf_matrix).flatten()

        conn = self._get_conn()
        try:
            indices = np.argsort(scores)[::-1]
            results = []
            for idx in indices:
                if len(results) >= top_k:
                    break
                if scores[idx] < 0.01:
                    break

                row_id = self._doc_ids[idx]
                row = conn.execute(
                    "SELECT * FROM knowledge_entries WHERE id = ? AND is_active = 1", (row_id,)
                ).fetchone()
                if not row:
                    continue
                if category and row["category"] != category:
                    continue

                hybrid_score = 0.8 * float(scores[idx]) + 0.2 * self._keyword_overlap_score(
                    query, f"{row['title']} {row['content']}"
                )

                results.append({
                    "id": row["doc_id"],
                    "title": row["title"],
                    "content": row["content"][:500],
                    "category": row["category"],
                    "source": row["source"],
                    "fraud_type": row["fraud_type"],
                    "similarity": round(float(hybrid_score), 4)
                })
            return sorted(results, key=lambda x: x["similarity"], reverse=True)
        finally:
            conn.close()

    def search_similar_cases(self, content: str, top_k: int = 3) -> list[dict]:
        """搜索相似诈骗案例"""
        self._ensure_index()
        if self._vectorizer is None or self._tfidf_matrix is None:
            return []

        query_vec = self._vectorizer.transform([self._tokenize(content)])
        scores = cosine_similarity(query_vec, self._tfidf_matrix).flatten()

        conn = self._get_conn()
        try:
            indices = np.argsort(scores)[::-1]
            results = []
            for idx in indices:
                if len(results) >= top_k:
                    break
                if scores[idx] < 0.01:
                    break

                row_id = self._doc_ids[idx]
                row = conn.execute(
                    "SELECT * FROM knowledge_entries WHERE id = ? AND is_active = 1", (row_id,)
                ).fetchone()
                if not row:
                    continue

                hybrid_score = 0.75 * float(scores[idx]) + 0.25 * self._keyword_overlap_score(
                    content, f"{row['title']} {row['content']}"
                )

                results.append({
                    "id": row["doc_id"],
                    "title": row["title"],
                    "content": row["content"][:300],
                    "category": row["category"],
                    "source": row["source"],
                    "fraud_type": row["fraud_type"],
                    "similarity": round(float(hybrid_score), 4)
                })
            return sorted(results, key=lambda x: x["similarity"], reverse=True)
        finally:
            conn.close()

    # ===================== 管理 =====================

    def get_stats(self) -> dict:
        conn = self._get_conn()
        try:
            total = conn.execute("SELECT COUNT(*) FROM knowledge_entries WHERE is_active=1").fetchone()[0]
            case_count = conn.execute(
                "SELECT COUNT(*) FROM knowledge_entries WHERE is_active=1 AND category='case'"
            ).fetchone()[0]
            return {
                "knowledge_count": total - case_count,
                "case_count": case_count,
                "total": total
            }
        finally:
            conn.close()

    def delete_entry(self, doc_id: str) -> bool:
        conn = self._get_conn()
        try:
            cur = conn.execute(
                "UPDATE knowledge_entries SET is_active=0 WHERE doc_id=?", (doc_id,)
            )
            conn.commit()
            if cur.rowcount > 0:
                self._dirty = True
                return True
            return False
        finally:
            conn.close()


# 全局知识库服务单例
knowledge_service = KnowledgeService()
