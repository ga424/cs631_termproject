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
from app.api import auth, locations, customers, car_classes, models, vehicles, reservations, rentals, dashboard

setup_logging(log_level=settings.log_level, use_json=settings.log_json)
logger = logging.getLogger("app.main")

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="A rental car management system API"
)

# Register resource routers under /api/v1/*.
app.include_router(auth.router)
app.include_router(locations.router)
app.include_router(customers.router)
app.include_router(car_classes.router)
app.include_router(models.router)
app.include_router(vehicles.router)
app.include_router(reservations.router)
app.include_router(rentals.router)
app.include_router(dashboard.router)


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
    """Log each incoming request with status code, duration, and service context."""
    start_time = time.perf_counter()
    client = getattr(request, "client", None)
    client_host = client.host if client else "unknown"
    path = request.url.path
    method = request.method
    
    # Extract service name from path (e.g., /api/v1/customers -> customers)
    path_parts = path.split('/')
    service = path_parts[-1] if len(path_parts) > 1 else "root"
    
    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception as e:
        logger.exception(
            "[%s] %s %s %s -> ERROR (unhandled exception)",
            client_host,
            method,
            path,
            service,
        )
        raise

    duration_ms = (time.perf_counter() - start_time) * 1000
    
    # Log with more context
    log_level = "info" if 200 <= status_code < 400 else "warning" if 400 <= status_code < 500 else "error"
    log_func = getattr(logger, log_level)
    
    log_func(
        "[%s] %s %s (%s) -> %d (%.2f ms)",
        client_host,
        method,
        path,
        service,
        status_code,
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
            "rental_agreements": "/api/v1/rental-agreements",
            "dashboard_overview": "/api/v1/dashboard/overview",
            "auth_login": "/api/v1/auth/login",
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port
    )
