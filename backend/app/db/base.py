"""Base SQLAlchemy metadata object used by all ORM models."""

from sqlalchemy.orm import declarative_base

# All model classes inherit from Base so they share one metadata registry.
Base = declarative_base()
