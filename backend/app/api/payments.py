"""Payment Gateway API Router.

Endpoints for Razorpay payment initiation, signature verification, and inventory restoration on payment failure.
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.order import Order
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentVerify,
    PaymentResponse,
)
from app.services import payment_service, inventory_service
from app.services.websocket_manager import manager

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post(
    "/create-order",
    response_model=PaymentOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate Razorpay payment order",
    description="Creates a Razorpay gateway order for an existing pending order and persists a payment intent record."
)
async def create_payment_order(
    payment_in: PaymentOrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Create gateway payment order."""
    # Find order
    stmt = select(Order).where(Order.id == payment_in.order_id)
    result = await db.execute(stmt)
    order = result.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {payment_in.order_id} not found.",
        )

    # Validate ownership
    if order.user_id != current_user.id and current_user.role not in ("staff", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to pay for this order.",
        )

    if order.status not in ("pending",):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is in '{order.status}' status and cannot be paid.",
        )

    # Call Razorpay payment service
    try:
        rzp_order = await payment_service.create_razorpay_order(
            amount=float(order.total_amount),
            order_id=str(order.id),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Razorpay order creation failed: {str(e)}",
        )

    razorpay_order_id = rzp_order.get("id") or f"order_{str(order.id)[:8]}"

    # Check for existing payment record or create new
    pay_stmt = select(Payment).where(Payment.order_id == order.id)
    existing_payment = (await db.execute(pay_stmt)).scalars().first()

    if existing_payment:
        existing_payment.razorpay_order_id = razorpay_order_id
        existing_payment.amount = order.total_amount
        existing_payment.status = "created"
        payment_record = existing_payment
    else:
        payment_record = Payment(
            order_id=order.id,
            razorpay_order_id=razorpay_order_id,
            amount=order.total_amount,
            currency="INR",
            status="created",
        )
        db.add(payment_record)

    await db.commit()
    await db.refresh(payment_record)

    return PaymentOrderResponse(
        order_id=order.id,
        razorpay_order_id=razorpay_order_id,
        amount=float(order.total_amount),
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID,
    )


@router.post(
    "/verify",
    response_model=PaymentResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify payment signature",
    description="Validates HMAC SHA256 signature from Razorpay checkout. Confirms order on success, or reverses inventory on failure."
)
async def verify_payment(
    verify_in: PaymentVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Verify cryptographic signature and confirm order."""
    # Find payment record by razorpay_order_id or order_id
    if verify_in.order_id:
        stmt = select(Payment).where(Payment.order_id == verify_in.order_id)
    else:
        stmt = select(Payment).where(Payment.razorpay_order_id == verify_in.razorpay_order_id)

    result = await db.execute(stmt)
    payment = result.scalars().first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matching payment transaction record not found.",
        )

    # Fetch corresponding order
    order_stmt = select(Order).where(Order.id == payment.order_id)
    order = (await db.execute(order_stmt)).scalars().first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order associated with payment does not exist.",
        )

    # Verify cryptographic signature
    is_valid = payment_service.verify_payment_signature(
        razorpay_order_id=verify_in.razorpay_order_id,
        razorpay_payment_id=verify_in.razorpay_payment_id,
        razorpay_signature=verify_in.razorpay_signature,
    )

    if not is_valid:
        # Signature mismatch -> Mark payment failed and rollback inventory
        payment.status = "failed"
        payment.razorpay_payment_id = verify_in.razorpay_payment_id
        payment.razorpay_signature = verify_in.razorpay_signature
        order.status = "cancelled"

        # Restore inventory deduction
        try:
            await inventory_service.restore_stock(db, order.id)
        except Exception:
            pass

        await db.commit()
        await db.refresh(payment)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed: Signature mismatch or tampering detected.",
        )

    # Successful payment verification -> Confirm order
    payment.status = "captured"
    payment.razorpay_payment_id = verify_in.razorpay_payment_id
    payment.razorpay_signature = verify_in.razorpay_signature
    order.status = "confirmed"

    await db.commit()
    await db.refresh(payment)
    await db.refresh(order)

    # Broadcast WebSocket confirmation
    try:
        await manager.broadcast_order_update({
            "action": "payment_successful",
            "order_id": str(order.id),
            "status": "confirmed",
            "amount": float(payment.amount),
        })
        await manager.send_to_user(str(order.user_id), {
            "type": "payment_confirmed",
            "order_id": str(order.id),
            "amount": float(payment.amount),
        })
    except Exception:
        pass

    return payment
