import json
from functools import lru_cache
from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """CampusEats Backend Application Settings."""

    # Database Configuration (PostgreSQL 16 with pgvector)
    DATABASE_URL: str = "postgresql+asyncpg://campuseats:campuseats_pass@localhost:5432/campuseats_db"
    DATABASE_URL_SYNC: str = "postgresql://campuseats:campuseats_pass@localhost:5432/campuseats_db"

    # Redis Configuration (Cache, shopping cart sessions, rate limiting)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Neo4j Graph Database
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "campuseats_neo4j"

    # JWT Authentication
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = "rzp_test_xxxxxxxxxxxxx"
    RAZORPAY_KEY_SECRET: str = "xxxxxxxxxxxxxxxxxxxxxxxx"

    # Embedding Model
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"

    # CORS Allowed Origins
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Application metadata
    APP_NAME: str = "CampusEats API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Union[str, List[str]]) -> List[str]:
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        return [str(origin).strip() for origin in parsed]
                except json.JSONDecodeError:
                    pass
            # Comma-separated fallback
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        elif isinstance(value, (list, tuple)):
            return [str(origin).strip() for origin in value]
        return ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached instance of application settings."""
    return Settings()


settings: Settings = get_settings()
