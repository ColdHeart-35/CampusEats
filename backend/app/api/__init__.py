"""CampusEats API Routers Package.

Aggregates and exposes all API route handlers across the platform.
"""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.food import router as food_router
from app.api.cart import router as cart_router
from app.api.orders import router as orders_router
from app.api.staff import router as staff_router
from app.api.inventory import router as inventory_router
from app.api.pickup_slots import router as pickup_slots_router
from app.api.payments import router as payments_router
from app.api.qr import router as qr_router
from app.api.analytics import router as analytics_router
from app.api.search import router as search_router
from app.api.neo4j_routes import router as neo4j_router
from app.api.admin import router as admin_router
from app.api.websocket import router as ws_router

api_router = APIRouter()

# Include all modular routers with appropriate prefixes and tags
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(food_router)
api_router.include_router(cart_router)
api_router.include_router(orders_router)
api_router.include_router(staff_router)
api_router.include_router(inventory_router)
api_router.include_router(pickup_slots_router)
api_router.include_router(payments_router)
api_router.include_router(qr_router)
api_router.include_router(analytics_router)
api_router.include_router(search_router)
api_router.include_router(neo4j_router)
api_router.include_router(admin_router)
api_router.include_router(ws_router)

__all__ = [
    "api_router",
    "auth_router",
    "users_router",
    "food_router",
    "cart_router",
    "orders_router",
    "staff_router",
    "inventory_router",
    "pickup_slots_router",
    "payments_router",
    "qr_router",
    "analytics_router",
    "search_router",
    "neo4j_router",
    "admin_router",
    "ws_router",
]
