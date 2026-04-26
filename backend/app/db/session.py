"""Database engine and request-scoped session dependency helpers."""

import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import Pool
from app.core.config import settings

logger = logging.getLogger("app.db")

database_url = settings.database_url
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

# pool_pre_ping avoids stale connection errors after DB/network idle periods.
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
    echo=False,
)

@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log successful database connections at DEBUG level."""
    logger.debug("Database connection established to rental_db")

@event.listens_for(Pool, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Track connection pool checkout events."""
    logger.debug("Database connection retrieved from pool")

# Factory for short-lived sessions (typically one per request).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """Yield a DB session and always close it after request processing."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
