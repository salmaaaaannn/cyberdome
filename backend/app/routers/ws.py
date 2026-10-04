"""
CYBERDOME — Realtime Authenticated WebSocket Router.
Provides company-isolated event subscriptions:
- security_event
- detection_created
- incident_created
- incident_updated
- asset_status_changed
- iot_device_updated
- network_event
- simulation_event
"""
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, Query
from sqlalchemy.future import select

from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token
from app.core.websocket import ws_manager
from app.models.models import User, CompanyUser

logger = logging.getLogger("cyberdome.ws")
router = APIRouter(tags=["Realtime WebSocket"])

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT Bearer token for authentication")
):
    """
    Authenticated WebSocket endpoint for real-time security events.
    Verifies JWT token, extracts user and company identity, and attaches connection
    to company-isolated pub/sub channel.
    """
    # 1. Validate JWT token
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired authentication token")
        return

    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing user subject in token")
        return

    # 2. Verify user and company membership
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.id == user_id, User.status == "ACTIVE"))
        user = user_res.scalar_one_or_none()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found or suspended")
            return

        # Personal user without company
        if user.account_type == "USER":
            company_id = f"personal_{user.id}"
        else:
            cu_res = await db.execute(
                select(CompanyUser).where(CompanyUser.user_id == user_id, CompanyUser.status == "ACTIVE")
            )
            membership = cu_res.scalar_one_or_none()
            if not membership:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="No active company membership found")
                return
            company_id = membership.company_id

    # 3. Register connection
    await ws_manager.connect(websocket, company_id=company_id, user_id=user_id)

    # 4. Send initial acknowledgment
    try:
        await websocket.send_json({
            "type": "connection_established",
            "company_id": company_id,
            "user_id": user_id,
            "message": "Connected to CYBERDOME real-time security telemetry feed."
        })

        # 5. Keep alive and message loop
        while True:
            data = await websocket.receive_text()
            # Handle client ping or subscription heartbeat
            if data == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                try:
                    import json
                    msg = json.loads(data)
                    if msg.get("action") == "ping":
                        await websocket.send_json({"type": "pong"})
                except Exception:
                    pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket session error: {e}")
        ws_manager.disconnect(websocket)
