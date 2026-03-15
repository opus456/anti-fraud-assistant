"""
实时事件中心
用于双端系统中的监护人联动推送
"""
import asyncio
import json
from collections import defaultdict
from datetime import datetime

from fastapi import WebSocket


class RealtimeHub:
    def __init__(self):
        # user_id -> set(WebSocket)
        self._channels: dict[int, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._channels[user_id].add(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket):
        async with self._lock:
            if user_id in self._channels and websocket in self._channels[user_id]:
                self._channels[user_id].remove(websocket)
            if user_id in self._channels and not self._channels[user_id]:
                del self._channels[user_id]

    async def publish(self, user_id: int, event_type: str, payload: dict):
        message = {
            "event": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "payload": payload,
        }
        text = json.dumps(message, ensure_ascii=False)

        async with self._lock:
            sockets = list(self._channels.get(user_id, set()))

        broken = []
        for ws in sockets:
            try:
                await ws.send_text(text)
            except Exception:
                broken.append(ws)

        if broken:
            async with self._lock:
                for ws in broken:
                    if user_id in self._channels and ws in self._channels[user_id]:
                        self._channels[user_id].remove(ws)

    def stats(self) -> dict:
        total_channels = len(self._channels)
        total_connections = sum(len(v) for v in self._channels.values())
        return {
            "channels": total_channels,
            "connections": total_connections,
        }


realtime_hub = RealtimeHub()
