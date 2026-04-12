"""Database engine and request-scoped session dependency helpers."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# pool_pre_ping avoids stale connection errors after DB/network idle periods.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

# Factory for short-lived sessions (typically one per request).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """Yield a DB session and always close it after request processing."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
