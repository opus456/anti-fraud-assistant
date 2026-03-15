"""
实时通信路由
提供监护人联动的 WebSocket 通道
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from jose import JWTError, jwt

from app.config import settings
from app.services.realtime_hub import realtime_hub

router = APIRouter(prefix="/api/realtime", tags=["实时联动"])


def _parse_user_id_from_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_raw = payload.get("sub")
        if user_id_raw is None:
            raise ValueError("token missing sub")
        return int(user_id_raw)
    except (JWTError, ValueError, TypeError) as e:
        raise HTTPException(status_code=401, detail="无效的身份令牌") from e


@router.get("/status", summary="实时通道状态")
async def realtime_status():
    return realtime_hub.stats()


@router.websocket("/ws/guardian")
async def guardian_ws(websocket: WebSocket):
    """
    监护人端实时通道
    连接方式: /api/realtime/ws/guardian?token=xxx
    """
    token = websocket.query_params.get("token", "")
    try:
        user_id = _parse_user_id_from_token(token)
    except HTTPException:
        await websocket.close(code=1008)
        return

    await realtime_hub.connect(user_id, websocket)
    try:
        # 握手确认
        await realtime_hub.publish(user_id, "ws_connected", {"user_id": user_id})
        while True:
            # 仅用于保持连接与心跳
            _ = await websocket.receive_text()
            await websocket.send_text('{"event":"pong","payload":{}}')
    except WebSocketDisconnect:
        await realtime_hub.disconnect(user_id, websocket)
    except Exception:
        await realtime_hub.disconnect(user_id, websocket)
