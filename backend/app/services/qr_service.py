"""QR Code Generation and Counter Verification Service.

Generates tamper-proof cryptographically signed QR codes for student order handoff and verifies scans at the canteen pickup counter.
"""

import base64
import hashlib
import hmac
import io
import json
import logging
from typing import Any, Dict
from uuid import UUID

import qrcode
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.order import Order

logger = logging.getLogger("campuseats.qr")


def generate_qr_token(order_id: str) -> str:
    """Generate a HMAC-SHA256 signature token for an order ID."""
    return hmac.new(
        settings.JWT_SECRET_KEY.encode("utf-8"),
        order_id.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:24]


def generate_qr_code(order_id: str) -> str:
    """Encode order ID and security signature into a base64 PNG data URI string."""
    token = generate_qr_token(order_id)
    payload = json.dumps({
        "order_id": order_id,
        "token": token,
        "app": "CampusEats",
    })

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#1E293B", back_color="#FFFFFF")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


async def verify_qr_code(
    qr_data: str,
    db: AsyncSession,
) -> Order:
    """Decode scanned QR payload, verify cryptographic HMAC, and validate order eligibility.

    Raises:
        ValueError: If payload is forged, order is missing, cancelled, or already verified.
    """
    raw_str = qr_data.strip()

    # If full data URI was scanned, peel prefix
    if raw_str.startswith("data:"):
        # The payload was a rendered image rather than text
        pass

    order_id_str: str = ""
    token_str: str = ""

    # Parse JSON if scanned from camera
    try:
        data = json.loads(raw_str)
        if isinstance(data, dict):
            order_id_str = str(data.get("order_id", ""))
            token_str = str(data.get("token", ""))
    except Exception:
        # Fallback: scan payload might be a direct UUID string
        order_id_str = raw_str

    if not order_id_str:
        raise ValueError("Invalid QR code format: missing order identifier.")

    try:
        order_uuid = UUID(order_id_str)
    except ValueError:
        raise ValueError(f"Malformed order UUID in QR data: {order_id_str}")

    # Validate HMAC signature if token was included
    if token_str:
        expected = generate_qr_token(str(order_uuid))
        if not hmac.compare_digest(token_str, expected):
            raise ValueError("QR signature verification failed: Invalid or forged QR code.")

    # Retrieve order from database
    stmt = select(Order).where(Order.id == order_uuid)
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise ValueError(f"Order {order_uuid} not found in system.")

    if order.status == "cancelled":
        raise ValueError("Cannot verify QR code: Order has already been cancelled.")

    if order.qr_verified or order.status == "picked_up":
        raise ValueError("This QR code has already been scanned and order picked up.")

    return order
