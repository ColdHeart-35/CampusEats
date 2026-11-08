"""Analytics & Business Intelligence API Router.

Endpoints for administration dashboards, SQL aggregation metrics, sales trend charts, and demand forecasting.
"""

from datetime import date
from typing import Any, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.models.food import FoodItem
from app.models.order import Order, OrderItem
from app.models.user import User
from app.schemas.analytics import DashboardStats, ForecastData, PopularItem, SalesData
from app.services import forecast_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get(
    "/dashboard",
    response_model=DashboardStats,
    status_code=status.HTTP_200_OK,
    summary="Get analytics dashboard metrics (admin)",
    description="Aggregates system-wide key performance indicators including revenue, active orders, and popular items using PostgreSQL aggregate functions."
)
async def get_dashboard_metrics(
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Fetch high-level business intelligence aggregates."""
    # 1. Total lifetime orders
    total_orders_stmt = select(func.count(Order.id))
    total_orders = (await db.execute(total_orders_stmt)).scalar() or 0

    # 2. Today's confirmed revenue (excluding cancelled)
    today_revenue_stmt = (
        select(func.coalesce(func.sum(Order.total_amount), 0.0))
        .where(
            Order.status != "cancelled",
            func.date(Order.created_at) == date.today(),
        )
    )
    today_revenue = float((await db.execute(today_revenue_stmt)).scalar() or 0.0)

    # 3. Active pending orders in queue
    pending_orders_stmt = select(func.count(Order.id)).where(
        Order.status.in_(["pending", "confirmed", "accepted", "preparing", "ready"])
    )
    pending_orders = (await db.execute(pending_orders_stmt)).scalar() or 0

    # 4. Completed pickup orders
    completed_orders_stmt = select(func.count(Order.id)).where(
        Order.status == "picked_up"
    )
    completed_orders = (await db.execute(completed_orders_stmt)).scalar() or 0

    # 5. Top popular items by quantity sold
    popular_items_stmt = (
        select(
            FoodItem.id.label("food_item_id"),
            FoodItem.name.label("name"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label("count"),
            func.coalesce(func.sum(OrderItem.subtotal), 0.0).label("revenue"),
        )
        .join(OrderItem, OrderItem.food_item_id == FoodItem.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status != "cancelled")
        .group_by(FoodItem.id, FoodItem.name)
        .order_by(text("count DESC"))
        .limit(5)
    )
    popular_result = await db.execute(popular_items_stmt)
    popular_rows = popular_result.all()

    popular_items = [
        PopularItem(
            food_item_id=row.food_item_id,
            name=row.name,
            count=int(row.count),
            revenue=float(row.revenue),
        )
        for row in popular_rows
    ]

    return DashboardStats(
        total_orders=total_orders,
        today_revenue=today_revenue,
        pending_orders=pending_orders,
        completed_orders=completed_orders,
        popular_items=popular_items,
    )


@router.get(
    "/sales",
    response_model=SalesData,
    status_code=status.HTTP_200_OK,
    summary="Get time-series sales trends (admin)",
    description="Groups historical order revenue into chronological intervals (daily, weekly, or monthly) for charts."
)
async def get_sales_trends(
    period: str = Query("daily", regex="^(daily|weekly|monthly)$", description="Aggregation bucket period"),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Aggregate sales revenue over time."""
    # Determine PostgreSQL date_trunc interval
    trunc_interval = "day"
    limit = 30
    if period == "weekly":
        trunc_interval = "week"
        limit = 12
    elif period == "monthly":
        trunc_interval = "month"
        limit = 12

    # Group by date_trunc
    trunc_expr = func.date_trunc(trunc_interval, Order.created_at).label("bucket")
    sales_stmt = (
        select(
            trunc_expr,
            func.coalesce(func.sum(Order.total_amount), 0.0).label("total"),
        )
        .where(Order.status != "cancelled")
        .group_by(text("bucket"))
        .order_by(text("bucket ASC"))
        .limit(limit)
    )

    result = await db.execute(sales_stmt)
    rows = result.all()

    labels: List[str] = []
    values: List[float] = []

    for row in rows:
        bucket_dt = row.bucket
        if period == "daily":
            formatted_date = bucket_dt.strftime("%b %d") if hasattr(bucket_dt, "strftime") else str(bucket_dt)[:10]
        elif period == "weekly":
            formatted_date = f"Wk {bucket_dt.strftime('%V, %b %d')}" if hasattr(bucket_dt, "strftime") else str(bucket_dt)[:10]
        else:
            formatted_date = bucket_dt.strftime("%b %Y") if hasattr(bucket_dt, "strftime") else str(bucket_dt)[:7]

        labels.append(formatted_date)
        values.append(float(row.total))

    # If no data yet, provide placeholders
    if not labels:
        labels = ["Today"]
        values = [0.0]

    return SalesData(
        labels=labels,
        values=values,
        period=period,
    )


@router.get(
    "/forecast",
    response_model=ForecastData,
    status_code=status.HTTP_200_OK,
    summary="Get demand forecast (admin)",
    description="Generates machine-learning based future order volume predictions using linear regression on order trends."
)
async def get_demand_forecast(
    days: int = Query(7, ge=1, le=30, description="Forecast horizon in days"),
    current_user: User = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Predict future canteen demand."""
    return await forecast_service.forecast_demand(db=db, days=days)
