"""
CYBERDOME — Realtime Authenticated WebSocket Infrastructure.
Enforces multi-tenant company isolation.
A company user will receive ONLY their authenticated company's events.
"""
import json
import logging
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket

logger = logging.getLogger("cyberdome.websocket")

class ConnectionManager:
    def __init__(self):
        # Maps company_id -> set of active WebSockets
        self._company_connections: Dict[str, Set[WebSocket]] = {}
        # Maps websocket -> (company_id, user_id)
        self._socket_metadata: Dict[WebSocket, tuple[str, str]] = {}

    async def connect(self, websocket: WebSocket, company_id: str, user_id: str):
        """Register authenticated websocket connection under company isolation."""
        await websocket.accept()
        if company_id not in self._company_connections:
            self._company_connections[company_id] = set()
        self._company_connections[company_id].add(websocket)
        self._socket_metadata[websocket] = (company_id, user_id)
        logger.info(f"WebSocket connected: user={user_id} company={company_id}")

    def disconnect(self, websocket: WebSocket):
        """Unregister websocket connection."""
        if websocket in self._socket_metadata:
            company_id, user_id = self._socket_metadata.pop(websocket)
            if company_id in self._company_connections:
                self._company_connections[company_id].discard(websocket)
                if not self._company_connections[company_id]:
                    del self._company_connections[company_id]
            logger.info(f"WebSocket disconnected: user={user_id} company={company_id}")

    async def broadcast_to_company(self, company_id: str, event_type: str, data: Dict[str, Any]):
        """
        Broadcast message strictly to subscribers of the specified company.
        Guarantees zero cross-tenant event leakage.
        """
        if not company_id or company_id not in self._company_connections:
            return

        payload = {
            "type": event_type,
            "company_id": company_id,
            "data": data,
        }
        raw_msg = json.dumps(payload, default=str)

        dead_sockets = set()
        for ws in self._company_connections[company_id]:
            try:
                await ws.send_text(raw_msg)
            except Exception as e:
                logger.warning(f"Failed sending WebSocket message to client: {e}")
                dead_sockets.add(ws)

        for dead_ws in dead_sockets:
            self.disconnect(dead_ws)

    def get_active_count(self, company_id: Optional[str] = None) -> int:
        if company_id:
            return len(self._company_connections.get(company_id, set()))
        return sum(len(conns) for conns in self._company_connections.values())


# Global singleton instance
ws_manager = ConnectionManager()
