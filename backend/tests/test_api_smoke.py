from fastapi.testclient import TestClient

from app.db.session import get_db
from app.main import app


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
