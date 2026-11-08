"""WebSocket Connection Manager Service.

Maintains live active socket connections, supports direct targeting by user UUID,
role-filtered broadcasting (e.g. staff kitchen displays), and event channel multiplexing.
"""

import json
import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket

logger = logging.getLogger("campuseats.websocket")


class ConnectionManager:
    """Manages active WebSocket connections across students, kitchen staff, and managers."""

    def __init__(self):
        # Maps user_id string to a set of active WebSockets (supports multiple device tabs)
        self.active_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        # Maps user_id to their authenticated role
        self.user_roles: Dict[str, str] = {}
        # Flat set of all active sockets
        self.all_sockets: Set[WebSocket] = set()

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        role: str = "student",
    ) -> None:
        """Accept new socket connection and register in active connection pool."""
        await websocket.accept()
        self.active_connections[str(user_id)].add(websocket)
        self.user_roles[str(user_id)] = role
        self.all_sockets.add(websocket)
        logger.debug("Socket registered for user %s (role: %s). Total active: %d", user_id, role, len(self.all_sockets))

    def disconnect(
        self,
        user_id: str,
        websocket: Optional[WebSocket] = None,
    ) -> None:
        """Remove disconnected socket from active registries."""
        uid = str(user_id)
        if websocket and websocket in self.active_connections[uid]:
            self.active_connections[uid].remove(websocket)
            self.all_sockets.discard(websocket)

        if not self.active_connections[uid]:
            self.active_connections.pop(uid, None)
            self.user_roles.pop(uid, None)

        if websocket:
            self.all_sockets.discard(websocket)

        logger.debug("Socket removed for user %s. Remaining active: %d", user_id, len(self.all_sockets))

    async def send_to_user(self, user_id: str, message: Any) -> None:
        """Send message directly to all active sockets belonging to a specific user."""
        uid = str(user_id)
        sockets = list(self.active_connections.get(uid, []))
        if not sockets:
            return

        payload = json.dumps(message) if not isinstance(message, str) else message
        dead_sockets = []

        for ws in sockets:
            try:
                await ws.send_text(payload)
            except Exception as exc:
                logger.debug("Failed sending message to user %s socket: %s", uid, exc)
                dead_sockets.append(ws)

        for dead in dead_sockets:
            self.disconnect(uid, dead)

    async def broadcast(self, message: Any, role: Optional[str] = None) -> None:
        """Broadcast message to all connected clients, optionally filtered by role."""
        payload = json.dumps(message) if not isinstance(message, str) else message

        target_sockets: List[WebSocket] = []
        if role is not None:
            for uid, user_role in self.user_roles.items():
                if user_role == role or (role == "staff" and user_role == "admin"):
                    target_sockets.extend(list(self.active_connections.get(uid, [])))
        else:
            target_sockets = list(self.all_sockets)

        dead_sockets = []
        for ws in target_sockets:
            try:
                await ws.send_text(payload)
            except Exception as exc:
                logger.debug("Broadcast error: %s", exc)
                dead_sockets.append(ws)

        # Cleanup dead sockets
        for dead in dead_sockets:
            self.all_sockets.discard(dead)
            for uid, sock_set in list(self.active_connections.items()):
                sock_set.discard(dead)

    async def broadcast_order_update(self, message: Any) -> None:
        """Broadcast order status changes to staff/admin and target student."""
        payload = {
            "channel": "orders",
            "event": message.get("action") or message.get("type") or "order_updated",
            "data": message,
        }
        # Send to all kitchen staff and admins
        await self.broadcast(payload, role="staff")
        await self.broadcast(payload, role="admin")

        # If a specific user_id is in the message, push directly to their device
        user_id = message.get("user_id") if isinstance(message, dict) else None
        if user_id:
            await self.send_to_user(str(user_id), payload)

    async def broadcast_menu_update(self, message: Any) -> None:
        """Broadcast live menu item price or availability change to all active users."""
        payload = {
            "channel": "menu",
            "event": "menu_updated",
            "data": message,
        }
        await self.broadcast(payload)

    async def broadcast_inventory_update(self, message: Any) -> None:
        """Broadcast inventory stock or threshold alerts exclusively to canteen staff/managers."""
        payload = {
            "channel": "inventory",
            "event": "inventory_updated",
            "data": message,
        }
        await self.broadcast(payload, role="staff")
        await self.broadcast(payload, role="admin")


# Global singleton WebSocket connection manager
manager = ConnectionManager()
