"""
知识库路由 - 搜索 / 添加 / 统计 / 删除
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas import (
    KnowledgeQuery, KnowledgeResult, KnowledgeAddRequest, MessageResponse,
)
from app.services.rag_service import rag_service
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/knowledge", tags=["知识库"])


@router.post("/bootstrap", response_model=MessageResponse, summary="初始化内置知识库")
async def bootstrap_knowledge(
    current_user: User = Depends(get_current_user),
):
    """手动触发内置知识导入"""
    added = await rag_service.bootstrap_builtin_knowledge()
    return MessageResponse(message=f"知识库初始化完成，新增 {added} 条")


@router.get("/all", response_model=list[KnowledgeResult], summary="知识库全量列表")
async def list_knowledge(
    q: str = "",
    category: str = "",
    limit: int = 500,
    current_user: User = Depends(get_current_user),
):
    """获取知识库全量内容，支持按关键词和分类过滤"""
    stats = await rag_service.get_stats()
    if stats.get("total", 0) == 0:
        await rag_service.bootstrap_builtin_knowledge()

    items = await rag_service.list_knowledge(query=q, category=category, limit=limit)
    if not items:
        # 兜底再尝试一次导入，避免首次访问时仍为空。
        await rag_service.bootstrap_builtin_knowledge()
        items = await rag_service.list_knowledge(query=q, category=category, limit=limit)

    return [KnowledgeResult(**item) for item in items]


@router.post("/search", response_model=list[KnowledgeResult], summary="知识库搜索")
async def search_knowledge(
    request: KnowledgeQuery,
    current_user: User = Depends(get_current_user),
):
    """在反诈知识库中搜索相关内容"""
    results = await rag_service.search_knowledge(
        query=request.query,
        top_k=request.top_k,
        category=request.category,
    )
    return [KnowledgeResult(**r) for r in results]


@router.post("/add", response_model=MessageResponse, summary="添加知识条目")
async def add_knowledge(
    request: KnowledgeAddRequest,
    current_user: User = Depends(get_current_user),
):
    """向知识库添加新条目（管理员或普通用户均可提交）"""
    doc_id = await rag_service.add_knowledge(
        title=request.title,
        content=request.content,
        category=request.category,
        source=request.source,
        scam_type=request.scam_type,
    )
    return MessageResponse(message=f"知识条目已添加，doc_id={doc_id}")


@router.get("/stats", summary="知识库统计")
async def get_knowledge_stats(
    current_user: User = Depends(get_current_user),
):
    """获取知识库的统计信息（总条目数 / 案例数等）"""
    stats = await rag_service.get_stats()
    return stats


@router.delete("/{doc_id}", response_model=MessageResponse, summary="删除知识条目")
async def delete_knowledge(
    doc_id: str,
    current_user: User = Depends(get_current_user),
):
    """软删除指定的知识库条目"""
    deleted = await rag_service.delete_entry(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="知识条目不存在")
    return MessageResponse(message="知识条目已删除")
