import asyncio
import runpy
import sys
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.db.session import get_db 
from app.main import app
import app.main as main_module


class HealthyDB:
    # Minimal stub to simulate a successful DB ping.
    def execute(self, _query):
        return 1


class BrokenDB:
    # Minimal stub to simulate DB outage behavior.
    def execute(self, _query):
        raise RuntimeError("database unavailable")


def _override_db(db_obj):
    # Helper used by FastAPI dependency overrides in health tests.
    def _dependency_override():
        return db_obj

    return _dependency_override


def test_root_returns_metadata():
    client = TestClient(app)

    response = client.get("/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["docs"] == "/docs"
    assert payload["health"] == "/health"


def test_api_version_lists_expected_endpoints():
    client = TestClient(app)

    response = client.get("/api/v1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["version"] == "v1"
    assert "/api/v1/customers" == payload["endpoints"]["customers"]
    assert "/api/v1/rental-agreements" == payload["endpoints"]["rental_agreements"]
    assert "/api/v1/auth/login" == payload["endpoints"]["auth_login"]
    assert "/api/v1/customer-portal" == payload["endpoints"]["customer_portal"]


def test_login_returns_bearer_token_for_staff_user():
    client = TestClient(app)

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["username"] == "admin"
    assert payload["role"] == "admin"
    assert payload["access_token"].count(".") == 2


def test_protected_operational_endpoints_require_jwt():
    client = TestClient(app)

    response = client.get("/api/v1/dashboard/overview")

    assert response.status_code == 401


def test_openapi_exposes_http_bearer_auth_scheme():
    client = TestClient(app)

    response = client.get("/openapi.json")

    assert response.status_code == 200
    payload = response.json()
    scheme = payload["components"]["securitySchemes"]["HTTPBearer"]
    assert scheme["type"] == "http"
    assert scheme["scheme"] == "bearer"


def test_health_returns_healthy_when_db_is_reachable():
    app.dependency_overrides[get_db] = _override_db(HealthyDB())
    try:
        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "healthy", "database": "connected"}
    finally:
        app.dependency_overrides.clear()


def test_health_returns_unhealthy_when_db_fails():
    app.dependency_overrides[get_db] = _override_db(BrokenDB())
    try:
        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 503
        payload = response.json()
        assert payload["status"] == "unhealthy"
        assert "database unavailable" in payload["error"]
    finally:
        app.dependency_overrides.clear()


def test_docs_endpoint_available():
    client = TestClient(app)

    response = client.get("/docs")

    assert response.status_code == 200


def test_startup_logs_application_metadata(monkeypatch):
    captured = {}

    def fake_info(message, *args):
        captured["message"] = message
        captured["args"] = args

    monkeypatch.setattr(main_module.logger, "info", fake_info)

    asyncio.run(main_module.on_startup())

    assert captured["message"] == "Application started: name=%s version=%s env=%s"
    assert len(captured["args"]) == 3


def test_middleware_reraises_unhandled_exception():
    request = SimpleNamespace(method="GET", url=SimpleNamespace(path="/boom"))

    async def failing_call_next(_request):
        raise RuntimeError("boom")

    with pytest.raises(RuntimeError, match="boom"):
        asyncio.run(main_module.log_requests(request, failing_call_next))


def test_request_area_groups_stable_api_paths():
    assert main_module.request_area("/") == "root"
    assert main_module.request_area("/health") == "health"
    assert main_module.request_area("/api/v1/customers") == "customers"
    assert main_module.request_area("/api/v1/customers/123") == "customers"


def test_main_block_invokes_uvicorn_run(monkeypatch):
    captured = {}

    def fake_run(app_obj, host, port):
        captured["app"] = app_obj
        captured["host"] = host
        captured["port"] = port

    monkeypatch.setitem(sys.modules, "uvicorn", SimpleNamespace(run=fake_run))

    runpy.run_module("app.main", run_name="__main__")

    assert captured["host"] == main_module.settings.api_host
    assert captured["port"] == main_module.settings.api_port
