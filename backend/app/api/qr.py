"""QR Code API Router.

Endpoints for generating secure dynamic QR codes for student order pickup and staff scanning/verification.
"""

from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.order import Order
from app.models.user import User
from app.schemas.order import OrderResponse
from app.services import qr_service
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/qr", tags=["qr"])


class QRVerifyRequest(BaseModel):
    """Payload when staff scans order QR code."""
    qr_data: str = Field(..., description="Scanned string or base64 token from QR code")


class QRCodeResponse(BaseModel):
    """Response containing base64 data URI of the generated QR code."""
    order_id: str
    qr_code: str
    status: str


@router.get(
    "/{order_id}",
    response_model=QRCodeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get QR code for order",
    description="Generates or fetches the base64-encoded QR code token for order verification at pickup counter."
)
async def get_order_qr(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Generate dynamic QR code for order."""
    stmt = select(Order).where(Order.id == order_id)
    result = await db.execute(stmt)
    order = result.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found.",
        )

    # Permission check: owner or staff/admin
    if order.user_id != current_user.id and current_user.role not in ("staff", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access QR code for this order.",
        )

    # Check order is not cancelled
    if order.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate pickup QR for a cancelled order.",
        )

    qr_image_data = qr_service.generate_qr_code(str(order.id))

    # Persist in DB if not already stored
    if not order.qr_code:
        order.qr_code = qr_image_data
        db.add(order)
        await db.commit()

    return QRCodeResponse(
        order_id=str(order.id),
        qr_code=qr_image_data,
        status=order.status,
    )


@router.post(
    "/verify",
    response_model=OrderResponse,
    status_code=status.HTTP_200_OK,
    summary="Scan and verify QR code (staff/admin)",
    description="Scans user's QR code at canteen counter, validates authenticity, and marks order as picked_up."
)
async def verify_order_qr(
    verify_in: QRVerifyRequest,
    current_user: User = Depends(require_role(["staff", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Verify QR code scanned by staff and complete handoff."""
    try:
        order = await qr_service.verify_qr_code(verify_in.qr_data, db)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"QR verification error: {str(e)}",
        )

    # Update order status to picked_up and qr_verified to True
    order.status = "picked_up"
    order.qr_verified = True
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # Re-fetch with eager loaded relationships
    stmt = (
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.items))
    )
    order_full = (await db.execute(stmt)).scalars().first()

    # Broadcast pickup completion event
    try:
        event = {
            "type": "order_picked_up",
            "order_id": str(order.id),
            "status": "picked_up",
            "verified_by": current_user.full_name,
        }
        await manager.broadcast_order_update(event)
        await manager.send_to_user(str(order.user_id), event)
    except Exception:
        pass

    return order_full
