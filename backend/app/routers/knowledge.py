"""
知识库路由 - 知识检索与管理
提供反诈知识的查询、添加和管理功能
"""
from fastapi import APIRouter, Depends, HTTPException

from app.models import User
from app.schemas import (
    KnowledgeQuery, KnowledgeResult, KnowledgeAddRequest, MessageResponse
)
from app.services.knowledge_service import knowledge_service
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/knowledge", tags=["知识库"])


@router.post("/search", response_model=list[KnowledgeResult], summary="知识检索")
async def search_knowledge(request: KnowledgeQuery):
    """
    基于语义相似度的知识库检索
    在反诈法律法规、典型案例、预防指南中搜索相关内容
    """
    results = knowledge_service.search_knowledge(
        query=request.query,
        top_k=request.top_k,
        category=request.category
    )
    return [KnowledgeResult(**r) for r in results]


@router.post("/add", response_model=MessageResponse, summary="添加知识条目")
async def add_knowledge(
    request: KnowledgeAddRequest,
    current_user: User = Depends(get_current_user)
):
    """向知识库中添加新的反诈知识条目"""
    doc_id = knowledge_service.add_knowledge(
        title=request.title,
        content=request.content,
        category=request.category,
        source=request.source,
        fraud_type=request.fraud_type
    )
    return MessageResponse(
        message=f"知识条目已添加成功 (ID: {doc_id})",
        success=True
    )


@router.get("/stats", summary="知识库统计")
async def get_knowledge_stats():
    """获取知识库条目统计信息"""
    return knowledge_service.get_stats()


@router.delete("/{doc_id}", response_model=MessageResponse, summary="删除知识条目")
async def delete_knowledge(
    doc_id: str,
    current_user: User = Depends(get_current_user)
):
    """删除指定的知识条目"""
    success = knowledge_service.delete_entry(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="知识条目不存在或删除失败")
    return MessageResponse(message="已删除", success=True)
