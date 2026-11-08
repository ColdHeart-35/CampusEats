"""Test configuration and shared fixtures for pytest-asyncio."""

import asyncio
from datetime import date, datetime, time, timedelta
from typing import AsyncGenerator, Dict
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool
from pgvector.sqlalchemy import Vector

from app.database import Base, get_db
from app.dependencies import get_redis
from app.main import app
from app.models.food import FoodCategory, FoodItem
from app.models.ingredient import Ingredient, Recipe
from app.models.pickup_slot import PickupSlot
from app.models.user import User
from app.services.auth_service import create_access_token, hash_password

# Teach SQLite how to compile pgvector Vector and PostgreSQL UUID types during tests
@compiles(Vector, "sqlite")
def compile_vector_sqlite(type_, compiler, **kw):
    return "TEXT"


@compiles(PG_UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"


# In-memory SQLite async test database
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# Register SQLite mock functions for PostgreSQL server_default compatibility
@event.listens_for(test_engine.sync_engine, "connect")
def setup_sqlite_functions(dbapi_connection, connection_record):
    dbapi_connection.create_function("gen_random_uuid", 0, lambda: str(uuid.uuid4()))
    dbapi_connection.create_function("NOW", 0, lambda: datetime.utcnow().isoformat())


class MockRedis:
    """In-memory Redis mock for test isolation without requiring live Redis daemon."""

    def __init__(self):
        self.store: Dict[str, str] = {}

    async def get(self, key: str):
        return self.store.get(key)

    async def set(self, key: str, value: str, ex: int = None):
        self.store[key] = str(value)
        return True

    async def delete(self, *keys):
        count = 0
        for k in keys:
            if k in self.store:
                del self.store[k]
                count += 1
        return count

    async def scan_iter(self, match: str = None):
        for k in list(self.store.keys()):
            if match is None or match.strip("*") in k:
                yield k

    async def ping(self):
        return True

    async def close(self):
        pass


mock_redis_client = MockRedis()


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


async def override_get_redis() -> AsyncGenerator[MockRedis, None]:
    yield mock_redis_client


# Apply dependency overrides
app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_redis] = override_get_redis


@pytest_asyncio.fixture(scope="session", autouse=True)
def event_loop():
    """Create session-wide event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def init_test_database():
    """Create fresh schema tables before test and drop afterwards."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide isolated transactional session for test setups."""
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Provide async HTTP client bound to FastAPI test app via ASGITransport."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest_asyncio.fixture
async def student_user(db_session: AsyncSession) -> User:
    """Fixture providing an active student user."""
    user = User(
        id=uuid.uuid4(),
        email="student@campuseats.edu",
        password_hash=hash_password("StudentPass123!"),
        full_name="Test Student",
        phone="9876543210",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def staff_user(db_session: AsyncSession) -> User:
    """Fixture providing an active staff user."""
    user = User(
        id=uuid.uuid4(),
        email="staff@campuseats.edu",
        password_hash=hash_password("StaffPass123!"),
        full_name="Kitchen Staff",
        phone="9876543211",
        role="staff",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Fixture providing an active administrator user."""
    user = User(
        id=uuid.uuid4(),
        email="admin@campuseats.edu",
        password_hash=hash_password("AdminPass123!"),
        full_name="System Admin",
        phone="9876543212",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def student_token(student_user: User) -> str:
    """Generate bearer JWT token for student user."""
    return create_access_token({
        "sub": str(student_user.id),
        "email": student_user.email,
        "role": student_user.role,
    })


@pytest.fixture
def staff_token(staff_user: User) -> str:
    """Generate bearer JWT token for staff user."""
    return create_access_token({
        "sub": str(staff_user.id),
        "email": staff_user.email,
        "role": staff_user.role,
    })


@pytest.fixture
def admin_token(admin_user: User) -> str:
    """Generate bearer JWT token for admin user."""
    return create_access_token({
        "sub": str(admin_user.id),
        "email": admin_user.email,
        "role": admin_user.role,
    })


@pytest.fixture
def student_headers(student_token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {student_token}"}


@pytest.fixture
def staff_headers(staff_token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {staff_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture
async def sample_menu(db_session: AsyncSession) -> Dict[str, Any]:
    """Seed test category, items, ingredients, and recipes."""
    # 1. Category
    cat = FoodCategory(name="South Indian", description="Authentic tiffins")
    db_session.add(cat)
    await db_session.flush()

    # 2. Food Item
    dosa = FoodItem(
        category_id=cat.id,
        name="Masala Dosa",
        description="Crispy rice crepe with potato filling",
        price=60.00,
        is_available=True,
        is_vegetarian=True,
        preparation_time=10,
    )
    db_session.add(dosa)
    await db_session.flush()

    # 3. Ingredients
    batter = Ingredient(name="Dosa Batter", unit="kg", current_stock=20.00, min_stock_level=5.00)
    potato = Ingredient(name="Potatoes", unit="kg", current_stock=15.00, min_stock_level=3.00)
    db_session.add_all([batter, potato])
    await db_session.flush()

    # 4. Recipe
    r1 = Recipe(food_item_id=dosa.id, ingredient_id=batter.id, quantity_required=0.20)
    r2 = Recipe(food_item_id=dosa.id, ingredient_id=potato.id, quantity_required=0.10)
    db_session.add_all([r1, r2])

    # 5. Pickup Slot
    slot = PickupSlot(
        slot_date=date.today(),
        start_time=time(12, 0),
        end_time=time(12, 30),
        max_capacity=20,
        current_count=0,
        is_active=True,
    )
    db_session.add(slot)

    await db_session.commit()

    return {
        "category": cat,
        "item": dosa,
        "ingredients": [batter, potato],
        "slot": slot,
    }
