"""Inventory Ingredient, Restock, Deduction, and Low-Stock Alert Tests."""

from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ingredient import Ingredient


@pytest.mark.asyncio
async def test_create_ingredient(client: AsyncClient, staff_headers: dict):
    """Verify kitchen staff can register a new raw ingredient in inventory."""
    payload = {
        "name": "Paneer",
        "unit": "kg",
        "current_stock": 10.00,
        "min_stock_level": 2.00,
        "cost_per_unit": 280.00,
    }
    response = await client.post("/api/inventory/ingredients", json=payload, headers=staff_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Paneer"
    assert data["unit"] == "kg"
    assert float(data["current_stock"]) == 10.00


@pytest.mark.asyncio
async def test_restock_ingredient(
    client: AsyncClient,
    staff_headers: dict,
    sample_menu: dict,
    db_session: AsyncSession,
):
    """Verify restocking increases available stock and creates audit transaction."""
    batter = sample_menu["ingredients"][0]
    initial_stock = batter.current_stock  # 20.00

    payload = {
        "ingredient_id": batter.id,
        "quantity": 10.50,
        "notes": "Morning fresh delivery from local vendor",
    }
    response = await client.post("/api/inventory/restock", json=payload, headers=staff_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["transaction_type"] == "restock"
    assert float(data["quantity"]) == 10.50

    # Verify ingredient updated in DB
    db_session.expire_all()
    res = await db_session.execute(select(Ingredient).where(Ingredient.id == batter.id))
    updated = res.scalar_one()
    assert updated.current_stock == initial_stock + Decimal("10.50")


@pytest.mark.asyncio
async def test_stock_deduction_on_order(
    client: AsyncClient,
    student_headers: dict,
    sample_menu: dict,
    db_session: AsyncSession,
):
    """Verify placing an order deducts exact recipe quantities atomically."""
    food = sample_menu["item"]
    potato = sample_menu["ingredients"][1]  # 15.00kg initial, recipe requires 0.10kg

    payload = {
        "items": [{"food_item_id": food.id, "quantity": 10}],  # 10 * 0.10 = 1.00kg
    }
    res = await client.post("/api/orders/", json=payload, headers=student_headers)
    assert res.status_code == 201

    db_session.expire_all()
    res_db = await db_session.execute(select(Ingredient).where(Ingredient.id == potato.id))
    assert res_db.scalar_one().current_stock == Decimal("14.00")


@pytest.mark.asyncio
async def test_low_stock_alert(
    client: AsyncClient,
    staff_headers: dict,
    sample_menu: dict,
    db_session: AsyncSession,
):
    """Verify that an ingredient below minimum threshold is returned in low-stock alerts."""
    batter = sample_menu["ingredients"][0]
    # Artificially deplete below min_stock_level (min is 5.00)
    batter.current_stock = Decimal("2.00")
    db_session.add(batter)
    await db_session.commit()

    response = await client.get("/api/inventory/low-stock", headers=staff_headers)
    assert response.status_code == 200
    alerts = response.json()
    assert any(a["ingredient_id"] == batter.id for a in alerts)
    alert = next(a for a in alerts if a["ingredient_id"] == batter.id)
    assert float(alert["current_stock"]) == 2.00
    assert float(alert["deficit"]) == 3.00


@pytest.mark.asyncio
async def test_restore_inventory_on_order_cancel(
    client: AsyncClient,
    student_headers: dict,
    sample_menu: dict,
    db_session: AsyncSession,
):
    """Verify that cancelling an order restores all recipe ingredient deductions."""
    food = sample_menu["item"]
    batter = sample_menu["ingredients"][0]  # initial 20.00kg

    # 1. Place order for 4 dosas -> 0.80kg deducted
    order_res = await client.post(
        "/api/orders/",
        json={"items": [{"food_item_id": food.id, "quantity": 4}]},
        headers=student_headers,
    )
    order_id = order_res.json()["id"]

    db_session.expire_all()
    res_deducted = await db_session.execute(select(Ingredient).where(Ingredient.id == batter.id))
    assert res_deducted.scalar_one().current_stock == Decimal("19.20")

    # 2. Cancel order
    await client.post(f"/api/orders/{order_id}/cancel", headers=student_headers)

    # 3. Verify stock restored to original 20.00kg
    db_session.expire_all()
    res_restored = await db_session.execute(select(Ingredient).where(Ingredient.id == batter.id))
    assert res_restored.scalar_one().current_stock == Decimal("20.00")
