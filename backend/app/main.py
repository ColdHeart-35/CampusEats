import importlib
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import redis.asyncio as aioredis

from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("campuseats.main")


# ---------------------------------------------------------------------------
# Application Lifespan (Startup & Shutdown)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application lifecycle:
    - Initialize Redis connection pool
    - Gracefully close connections on shutdown
    """
    logger.info("Starting CampusEats backend...")

    # Initialize Redis client in application state
    try:
        app.state.redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
        )
        await app.state.redis.ping()
        logger.info("Successfully connected to Redis at %s", settings.REDIS_URL)
    except Exception as exc:
        logger.warning("Could not establish immediate connection to Redis: %s", exc)

    yield

    # Teardown Redis client
    logger.info("Shutting down CampusEats backend...")
    redis_client = getattr(app.state, "redis", None)
    if redis_client is not None:
        try:
            await redis_client.close()
            logger.info("Redis connection pool closed.")
        except Exception as exc:
            logger.error("Error closing Redis connection: %s", exc)


# ---------------------------------------------------------------------------
# FastAPI Application Factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Real-Time Canteen Pre-Ordering and Intelligent Inventory Management System API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global Exception Handlers
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Format HTTPExceptions into standard JSON error response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "status_code": exc.status_code,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Format request validation errors with field details."""
    errors = []
    for err in exc.errors():
        field = ".".join(str(loc) for loc in err.get("loc", []))
        errors.append({
            "field": field,
            "message": err.get("msg"),
            "type": err.get("type"),
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Request validation failed",
            "details": errors,
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions."""
    logger.exception("Unhandled server exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error occurred. Please try again later.",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        },
    )


# ---------------------------------------------------------------------------
# Core Base Routes
# ---------------------------------------------------------------------------
@app.get("/", tags=["system"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["system"])
async def health_check():
    """System health check endpoint verifying Redis connectivity."""
    redis_status = "unavailable"
    redis_client = getattr(app.state, "redis", None)
    if redis_client is not None:
        try:
            pong = await redis_client.ping()
            if pong:
                redis_status = "connected"
        except Exception:
            redis_status = "error"

    return {
        "status": "healthy",
        "redis": redis_status,
        "version": settings.APP_VERSION,
    }


# ---------------------------------------------------------------------------
# Dynamic Router Registration
# ---------------------------------------------------------------------------
ROUTER_CONFIGS = [
    ("app.routers.auth", "/api/auth", ["auth"]),
    ("app.routers.users", "/api/users", ["users"]),
    ("app.routers.food", "/api/food", ["food"]),
    ("app.routers.cart", "/api/cart", ["cart"]),
    ("app.routers.orders", "/api/orders", ["orders"]),
    ("app.routers.staff", "/api/staff", ["staff"]),
    ("app.routers.pickup_slots", "/api/pickup-slots", ["pickup-slots"]),
    ("app.routers.payments", "/api/payments", ["payments"]),
    ("app.routers.qr", "/api/qr", ["qr"]),
    ("app.routers.inventory", "/api/inventory", ["inventory"]),
    ("app.routers.analytics", "/api/analytics", ["analytics"]),
    ("app.routers.search", "/api/search", ["search"]),
    ("app.routers.graph", "/api/graph", ["graph"]),
    ("app.routers.admin", "/api/admin", ["admin"]),
    ("app.routers.ws", "/api/ws", ["websocket"]),
]


def register_discovered_routers(application: FastAPI) -> None:
    """Dynamically register router modules if they are present."""
    for module_name, prefix, tags in ROUTER_CONFIGS:
        try:
            mod = importlib.import_module(module_name)
            router = getattr(mod, "router", None)
            if router is not None:
                application.include_router(router, prefix=prefix, tags=tags)
                logger.info("Registered router: %s with prefix %s", module_name, prefix)
        except ModuleNotFoundError:
            # Module not created yet in this stage; skip silently
            pass
        except Exception as exc:
            logger.warning("Could not register router %s: %s", module_name, exc)


# Attempt initial registration of any available routers
register_discovered_routers(app)
