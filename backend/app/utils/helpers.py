"""Shared Helper Functions and Utility Routines.

Includes financial formatting, unique tracking ID generators, state machine validators, and query paginators.
"""

import uuid
from decimal import Decimal
from typing import Any, Dict, List, Union

from sqlalchemy.sql import Select

# Canonical state transitions for order workflow
VALID_STATUS_TRANSITIONS: Dict[str, List[str]] = {
    "pending": ["confirmed", "accepted", "cancelled"],
    "confirmed": ["accepted", "preparing", "cancelled"],
    "accepted": ["preparing", "cancelled"],
    "preparing": ["ready", "cancelled"],
    "ready": ["picked_up", "cancelled"],
    "picked_up": [],
    "cancelled": [],
}


def format_currency(
    amount: Union[float, Decimal, int, str],
    currency: str = "INR",
) -> str:
    """Format numeric value into localized currency string (e.g. '₹60.00')."""
    try:
        val = float(amount)
    except (ValueError, TypeError):
        val = 0.0

    symbol = "₹" if currency.upper() in ("INR", "RUPEES") else f"{currency.upper()} "
    return f"{symbol}{val:,.2f}"


def generate_unique_id(prefix: str = "") -> str:
    """Generate a compact collision-resistant identifier with optional domain prefix."""
    raw_id = uuid.uuid4().hex[:12]
    if prefix:
        clean_prefix = prefix.strip().rstrip("_")
        return f"{clean_prefix}_{raw_id}"
    return raw_id


def validate_status_transition(current_status: str, new_status: str) -> bool:
    """Validate whether an order state machine progression is logically permissible."""
    curr = (current_status or "").strip().lower()
    nxt = (new_status or "").strip().lower()

    if curr == nxt:
        return True

    allowed = VALID_STATUS_TRANSITIONS.get(curr, [])
    return nxt in allowed


def paginate_query(
    query: Select,
    skip: int = 0,
    limit: int = 50,
) -> Select:
    """Apply standard offset and limit clauses to a SQLAlchemy 2.0 select construct."""
    safe_skip = max(0, skip)
    safe_limit = max(1, min(100, limit))
    return query.offset(safe_skip).limit(safe_limit)
