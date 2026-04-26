"""Centralized runtime settings loaded from environment variables and .env."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration shared across API, DB, and scripts."""
    
    # Database
    database_url: str = "postgresql://rental_user:rental_password@postgres:5432/rental_db"
    database_host: str = "postgres"
    database_port: int = 5432
    database_name: str = "rental_db"
    database_user: str = "rental_user"
    database_password: str = "rental_password"
    
    # API
    api_port: int = 8000
    api_host: str = "0.0.0.0"
    fastapi_env: str = "development"
    
    # App
    app_name: str = "Rental Car Management System"
    app_version: str = "0.1.0"
    log_level: str = "DEBUG"
    log_json: bool = False
    jwt_secret_key: str = "dev-rentacar-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_token_minutes: int = 480
    staff_users: str = (
        "agent:agent123:agent,"
        "manager:manager123:manager,"
        "admin:admin123:admin"
    )
    
    class Config:
        # Local development defaults come from .env if present.
        env_file = ".env"
        env_file_encoding = "utf-8"


# Import this singleton anywhere configuration values are needed.
settings = Settings()
