"""Order Processing, Retrieval, Cancellation, and State Transition Tests."""

from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ingredient import Ingredient


@pytest.mark.asyncio
async def test_create_order_success(
    client: AsyncClient,
    student_headers: dict,
    sample_menu: dict,
    db_session: AsyncSession,
):
    """Verify order placement deducts stock and returns created OrderResponse with QR code."""
    food_item = sample_menu["item"]
    slot = sample_menu["slot"]

    payload = {
        "pickup_slot_id": slot.id,
        "special_instructions": "Extra spicy please",
        "items": [
            {"food_item_id": food_item.id, "quantity": 2},
        ],
    }

    response = await client.post("/api/orders/", json=payload, headers=student_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert float(data["total_amount"]) == 120.00  # 2 * 60.00
    assert data["qr_code"] is not None
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity"] == 2

    # Verify inventory was deducted: 2 * 0.20 = 0.40kg batter deducted from 20.00
    res = await db_session.execute(select(Ingredient).where(Ingredient.name == "Dosa Batter"))
    batter = res.scalar_one()
    assert batter.current_stock == Decimal("19.60")


@pytest.mark.asyncio
async def test_get_user_orders(
    client: AsyncClient,
    student_headers: dict,
    sample_menu: dict,
):
    """Verify student can retrieve list of their own placed orders."""
    food_item = sample_menu["item"]
    payload = {
        "items": [{"food_item_id": food_item.id, "quantity": 1}],
    }
    await client.post("/api/orders/", json=payload, headers=student_headers)

    response = await client.get("/api/orders/", headers=student_headers)
    assert response.status_code == 200
    orders = response.json()
    assert isinstance(orders, list)
    assert len(orders) >= 1
    assert orders[0]["status"] == "pending"


@pytest.mark.asyncio
async def test_get_order_detail(
    client: AsyncClient,
    student_headers: dict,
    sample_menu: dict,
):
    """Verify retrieving order by ID returns comprehensive detail."""
    food_item = sample_menu["item"]
    payload = {
        "items": [{"food_item_id": food_item.id, "quantity": 1}],
    }
    create_res = await client.post("/api/orders/", json=payload, headers=student_headers)
    order_id = create_res.json()["id"]

    detail_res = await client.get(f"/api/orders/{order_id}", headers=student_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == order_id
    assert float(detail["total_amount"]) == 60.00


@pytest.mark.asyncio
async def test_cancel_order_restores_inventory(
    client: AsyncClient,
    student_headers: dict,
    sample_menu: dict,
    db_session: AsyncSession,
):
    """Verify cancelling an order updates status and restores deducted ingredients."""
    food_item = sample_menu["item"]
    payload = {
        "items": [{"food_item_id": food_item.id, "quantity": 5}],  # 5 * 0.20 = 1.00kg batter
    }
    create_res = await client.post("/api/orders/", json=payload, headers=student_headers)
    order_id = create_res.json()["id"]

    # Verify initial deduction (20.00 - 1.00 = 19.00)
    res = await db_session.execute(select(Ingredient).where(Ingredient.name == "Dosa Batter"))
    assert res.scalar_one().current_stock == Decimal("19.00")

    # Cancel order
    cancel_res = await client.post(f"/api/orders/{order_id}/cancel", headers=student_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

    # Verify inventory was restored back to 20.00kg
    db_session.expire_all()
    res_restored = await db_session.execute(select(Ingredient).where(Ingredient.name == "Dosa Batter"))
    assert res_restored.scalar_one().current_stock == Decimal("20.00")


@pytest.mark.asyncio
async def test_invalid_order_status_transition(
    client: AsyncClient,
    student_headers: dict,
    staff_headers: dict,
    sample_menu: dict,
):
    """Verify that jumping from 'pending' directly to 'picked_up' without intermediate prep is rejected."""
    food_item = sample_menu["item"]
    create_res = await client.post(
        "/api/orders/",
        json={"items": [{"food_item_id": food_item.id, "quantity": 1}]},
        headers=student_headers,
    )
    order_id = create_res.json()["id"]

    # Kitchen staff tries to jump pending -> picked_up (skipping accepted, preparing, ready)
    update_payload = {"status": "picked_up"}
    res = await client.put(f"/api/staff/orders/{order_id}/status", json=update_payload, headers=staff_headers)
    assert res.status_code == 400
    assert "invalid status transition" in res.text.lower()
