"""Demand Forecasting & Kitchen Peak Load Service.

Applies statistical modeling and scikit-learn LinearRegression on historical order volumes
to predict incoming order traffic and identify peak kitchen hours.
"""

from datetime import date, datetime, timedelta
import logging
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order
from app.schemas.analytics import ForecastData

logger = logging.getLogger("campuseats.forecast")


async def forecast_demand(
    db: AsyncSession,
    days: int = 7,
) -> ForecastData:
    """Forecast future order demand using daily order counts and day-of-week trends.

    Requires at least 7 distinct days of order history to fit a predictive regression model.
    """
    # Query daily historical aggregates
    stmt = (
        select(
            func.date(Order.created_at).label("order_date"),
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.total_amount), 0.0).label("revenue"),
        )
        .where(Order.status != "cancelled")
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at).asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    if len(rows) < 7:
        logger.info("Insufficient order history for machine learning forecast: %d rows found (need >= 7)", len(rows))
        return ForecastData(
            predictions=[],
            confidence=None,
            message=f"Insufficient historical data ({len(rows)}/7 days recorded). Collect at least 7 days of order history to enable demand forecasting.",
        )

    # Convert to pandas DataFrame
    df = pd.DataFrame(
        [{"date": pd.to_datetime(r.order_date), "orders": int(r.order_count), "revenue": float(r.revenue)} for r in rows]
    )

    df["day_index"] = np.arange(len(df))
    df["day_of_week"] = df["date"].dt.dayofweek

    # Feature matrix: day_index (linear trend) and one-hot / day_of_week cyclical features
    X = np.column_stack([
        df["day_index"].values,
        np.sin(2 * np.pi * df["day_of_week"].values / 7.0),
        np.cos(2 * np.pi * df["day_of_week"].values / 7.0),
    ])
    y = df["orders"].values

    # Train linear regression
    model = LinearRegression()
    model.fit(X, y)
    score = model.score(X, y)
    confidence = float(max(0.1, min(0.99, score))) if not np.isnan(score) else 0.5

    # Predict for future horizon
    predictions: List[Dict[str, Any]] = []
    last_date = df["date"].max().date()
    start_index = len(df)

    for i in range(1, days + 1):
        future_date = last_date + timedelta(days=i)
        dow = future_date.weekday()
        idx = start_index + i - 1

        x_future = np.array([[
            idx,
            np.sin(2 * np.pi * dow / 7.0),
            np.cos(2 * np.pi * dow / 7.0),
        ]])
        pred_val = float(model.predict(x_future)[0])
        predicted_orders = max(1, int(round(pred_val)))

        predictions.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "day": future_date.strftime("%a"),
            "predicted_orders": predicted_orders,
            "estimated_peak_time": "12:30 PM - 01:30 PM",
        })

    return ForecastData(
        predictions=predictions,
        confidence=round(confidence, 2),
        message=f"Successfully generated demand forecast for {days} days.",
    )


async def get_peak_hours(db: AsyncSession) -> Dict[str, Any]:
    """Analyze order timestamps to determine peak hourly canteen rushes."""
    try:
        # Group by hour of day
        stmt = (
            select(
                func.extract("hour", Order.created_at).label("hour"),
                func.count(Order.id).label("count"),
            )
            .where(Order.status != "cancelled")
            .group_by("hour")
            .order_by("hour")
        )
        res = await db.execute(stmt)
        rows = res.all()

        peak_hours = []
        for r in rows:
            h = int(r.hour)
            am_pm = "AM" if h < 12 else "PM"
            formatted_hour = f"{(h % 12) or 12}:00 {am_pm}"
            peak_hours.append({
                "hour": h,
                "label": formatted_hour,
                "orders": int(r.count),
            })

        return {"hourly_distribution": peak_hours}
    except Exception as exc:
        logger.warning("Failed to calculate peak hours: %s", exc)
        return {"hourly_distribution": []}
