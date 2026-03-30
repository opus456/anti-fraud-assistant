"""
自适应进化路由 - 管理员提交新型诈骗数据 / 查看待审核条目
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ScamKnowledge, User
from app.schemas import EvolveRequest, MessageResponse
from app.services.evolve_service import evolve_service
from app.utils.security import require_admin

router = APIRouter(prefix="/api/evolve", tags=["自适应进化"])


@router.post("", response_model=MessageResponse, summary="提交新型诈骗数据")
async def submit_scam_data(
    request: EvolveRequest,
    admin_user: User = Depends(require_admin),
):
    """管理员审核确认后提交新型诈骗数据，写入知识库并触发索引更新"""
    doc_id = await evolve_service.add_new_scam_case(
        title=request.title,
        content=request.content,
        scam_type=request.scam_type,
        source=request.source,
    )
    return MessageResponse(message=f"新型诈骗案例已录入，doc_id={doc_id}")


@router.get("/pending", summary="待审核条目列表")
async def list_pending(
    page: int = 1,
    page_size: int = 20,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """获取最近添加的知识库条目（供管理员审核）"""
    query = (
        select(ScamKnowledge)
        .where(ScamKnowledge.is_active == True)
        .order_by(ScamKnowledge.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    entries = result.scalars().all()

    return [
        {
            "id": e.id,
            "doc_id": e.doc_id,
            "title": e.title,
            "content": e.content[:300],
            "scam_type": e.scam_type,
            "category": e.category,
            "source": e.source,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]
