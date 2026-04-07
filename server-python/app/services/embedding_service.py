"""
Embedding 服务
- 优先使用 LangChain OpenAIEmbeddings 生成 1024 维向量
- 失败时回退到基于哈希 + NumPy 的稳定向量，保证流程不中断
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
from typing import List

import numpy as np
from langchain_openai import OpenAIEmbeddings

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        self._client = None

    def _get_client(self) -> OpenAIEmbeddings | None:
        if self._client is not None:
            return self._client

        if not settings.LLM_API_KEY:
            return None

        # 兼容 OpenAI 风格 embedding 端点
        embedding_endpoint = settings.EMBEDDING_API_URL.rstrip("/")
        if embedding_endpoint.endswith("/chat/completions"):
            embedding_endpoint = embedding_endpoint[: -len("/chat/completions")] + "/embeddings"

        try:
            self._client = OpenAIEmbeddings(
                model=settings.EMBEDDING_MODEL,
                openai_api_key=settings.LLM_API_KEY,
                openai_api_base=embedding_endpoint,
            )
        except Exception as exc:
            logger.warning(f"初始化 Embedding 客户端失败，将使用本地回退向量: {exc}")
            self._client = None
        return self._client

    @staticmethod
    def _local_fallback_embedding(text: str, dim: int = 1024) -> List[float]:
        # 使用文本哈希作为种子，生成稳定随机向量，并做 L2 归一化
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        seed = int.from_bytes(digest[:8], byteorder="big", signed=False) % (2**32)
        rng = np.random.default_rng(seed)
        vec = rng.standard_normal(dim).astype(np.float32)
        vec = vec / np.linalg.norm(vec)  # L2 归一化
        return vec.tolist()

    async def embed_text(self, text: str) -> List[float]:
        text = (text or "").strip()
        if not text:
            return self._local_fallback_embedding("empty")

        client = self._get_client()
        if client is None:
            return self._local_fallback_embedding(text)

        try:
            # LangChain embed_query 是同步调用，放到线程池避免阻塞事件循环
            vec = await asyncio.to_thread(client.embed_query, text)
            if len(vec) != 1024:
                logger.warning(f"Embedding 维度异常({len(vec)}), 使用本地回退 1024 维")
                return self._local_fallback_embedding(text)
            return [float(v) for v in vec]
        except Exception as exc:
            logger.warning(f"远程 Embedding 失败，回退本地向量: {exc}")
            return self._local_fallback_embedding(text)


embedding_service = EmbeddingService()
