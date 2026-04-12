"""FastAPI application entrypoint and top-level infrastructure endpoints."""

import logging
import time
from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.session import get_db
from app.api import locations, customers, car_classes, models, vehicles, reservations, rentals

setup_logging(log_level=settings.log_level, use_json=settings.log_json)
logger = logging.getLogger("app.main")

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="A rental car management system API"
)

# Register resource routers under /api/v1/*.
app.include_router(locations.router)
app.include_router(customers.router)
app.include_router(car_classes.router)
app.include_router(models.router)
app.include_router(vehicles.router)
app.include_router(reservations.router)
app.include_router(rentals.router)


@app.on_event("startup")
async def on_startup():
    """Emit startup details for environment visibility in logs."""
    logger.info(
        "Application started: name=%s version=%s env=%s",
        settings.app_name,
        settings.app_version,
        settings.fastapi_env,
    )


@app.middleware("http")
async def log_requests(request, call_next):
    """Log each incoming request with status code and duration."""
    start_time = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled error while processing %s %s", request.method, request.url.path)
        raise

    duration_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        "%s %s -> %s (%.2f ms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Rental Car Management System API",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        logger.exception("Health check failed")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )


@app.get("/api/v1")
async def api_version():
    """API version endpoint"""
    return {
        "version": "v1",
        "endpoints": {
            "locations": "/api/v1/locations",
            "customers": "/api/v1/customers",
            "car_classes": "/api/v1/car-classes",
            "models": "/api/v1/models",
            "cars": "/api/v1/cars",
            "reservations": "/api/v1/reservations",
            "rental_agreements": "/api/v1/rental-agreements"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port
    )
