"""WebSocket API Endpoint.

Real-time bi-directional communication channel for order updates, inventory depletion alerts, and notifications.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.services import auth_service
from app.services.websocket_manager import manager

logger = logging.getLogger("campuseats.websocket")
router = APIRouter(tags=["websocket"])


async def handle_ws_connection(websocket: WebSocket, token: Optional[str]):
    """Internal connection handler for authenticated WebSocket clients."""
    if not token:
        logger.warning("WebSocket connection rejected: Missing authentication token.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = auth_service.decode_token(token)
        user_id = payload.get("sub")
        role = payload.get("role", "student")
        if not user_id:
            raise ValueError("Token missing subject identifier.")
    except Exception as exc:
        logger.warning("WebSocket authentication failed: %s", exc)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Accept and register connection
    await manager.connect(websocket=websocket, user_id=str(user_id), role=str(role))
    logger.info("WebSocket connected for user %s with role %s", user_id, role)

    try:
        # Send initial connection acknowledgment
        await websocket.send_text(
            json.dumps({
                "type": "connection_established",
                "user_id": str(user_id),
                "role": str(role),
                "message": "Connected to CampusEats real-time event stream.",
            })
        )

        while True:
            raw_data = await websocket.receive_text()
            try:
                message = json.loads(raw_data)
            except Exception:
                message = {"type": raw_data.strip()}

            msg_type = message.get("type", "").lower() if isinstance(message, dict) else str(message)

            if msg_type in ("ping", "heartbeat"):
                await websocket.send_text(json.dumps({"type": "pong"}))
            else:
                # Echo receipt or process client event
                await websocket.send_text(
                    json.dumps({
                        "type": "ack",
                        "received": message,
                    })
                )
    except WebSocketDisconnect:
        manager.disconnect(user_id=str(user_id), websocket=websocket)
        logger.info("WebSocket disconnected gracefully for user %s", user_id)
    except Exception as exc:
        manager.disconnect(user_id=str(user_id), websocket=websocket)
        logger.warning("WebSocket exception for user %s: %s", user_id, exc)


@router.websocket("/api/ws")
async def websocket_endpoint_prefixed(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """WebSocket endpoint at /api/ws."""
    await handle_ws_connection(websocket, token)


@router.websocket("/ws")
async def websocket_endpoint_root(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """WebSocket endpoint at /ws."""
    await handle_ws_connection(websocket, token)
