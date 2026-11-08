"""Staff Operations API Router.

Endpoints for canteen staff and managers to monitor incoming orders and update preparation status.
"""

from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User
from app.schemas.order import OrderResponse, OrderStatusUpdate
from app.services import order_service
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/staff", tags=["staff"])


@router.get(
    "/orders",
    response_model=List[OrderResponse],
    status_code=status.HTTP_200_OK,
    summary="List all orders (staff/admin)",
    description="Retrieves orders across the system with optional status filtering and pagination."
)
async def list_staff_orders(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (pending, preparing, ready, etc.)"),
    skip: int = Query(0, ge=0, description="Offset"),
    limit: int = Query(50, ge=1, le=100, description="Limit"),
    current_user: User = Depends(require_role(["staff", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Fetch orders for staff view."""
    return await order_service.get_all_orders(
        db=db,
        status=status_filter,
        skip=skip,
        limit=limit,
    )


@router.put(
    "/orders/{order_id}/status",
    response_model=OrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Update order status (staff/admin)",
    description="Updates the kitchen workflow status of an order (e.g., accepted, preparing, ready, picked_up) and broadcasts changes via WebSockets."
)
async def update_order_status(
    order_id: UUID,
    status_update: OrderStatusUpdate,
    current_user: User = Depends(require_role(["staff", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Advance order state in the preparation lifecycle."""
    try:
        updated_order = await order_service.update_order_status(
            db=db,
            order_id=order_id,
            status=status_update.status,
            notes=status_update.notes if hasattr(status_update, "notes") else None,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}",
        )

    # Broadcast WebSocket update to all listeners and target user
    try:
        event_payload = {
            "type": "order_status_update",
            "order_id": str(updated_order.id),
            "status": updated_order.status,
            "user_id": str(updated_order.user_id),
            "updated_by": current_user.full_name,
        }
        await manager.broadcast_order_update(event_payload)
        await manager.send_to_user(str(updated_order.user_id), event_payload)
    except Exception:
        pass

    return updated_order
