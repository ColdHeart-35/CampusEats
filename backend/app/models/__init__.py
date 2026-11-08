"""CampusEats SQLAlchemy Models Package.

Re-exports all database models so that Alembic and application modules
can discover and bind them to Base.metadata.
"""

from app.database import Base
from app.models.food import FoodCategory, FoodItem
from app.models.ingredient import Ingredient, Recipe
from app.models.inventory import InventoryTransaction
from app.models.notification import Notification
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.pickup_slot import PickupSlot
from app.models.user import User

__all__ = [
    "Base",
    "User",
    "FoodCategory",
    "FoodItem",
    "Ingredient",
    "Recipe",
    "Order",
    "OrderItem",
    "PickupSlot",
    "Payment",
    "InventoryTransaction",
    "Notification",
]
