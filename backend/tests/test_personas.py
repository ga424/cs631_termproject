from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.models import Customer, CustomerAccount
from app.schemas import CustomerCreate
from conftest import auth_headers


def _override_db_with_customer_account():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
    session = TestingSessionLocal()
    customer = Customer(
        first_name="John",
        last_name="Doe",
        street="100 Oak Lane",
        city="Newark",
        state="NJ",
        zip="07102",
        license_number=f"NJ-{uuid4()}",
        license_state="NJ",
        credit_card_type="Visa",
        credit_card_number="4111111111111111",
        exp_month=12,
        exp_year=2028,
    )
    session.add(customer)
    session.flush()
    session.add(CustomerAccount(
        customer_id=customer.customer_id,
        username="john.doe",
        password_hash=hash_password("customer123"),
        is_active=True,
    ))
    inactive_customer = Customer(
        first_name="Nina",
        last_name="Nohistory",
        street="710 Demo Plaza",
        city="Newark",
        state="NJ",
        zip="07102",
        license_number=f"NJ-{uuid4()}",
        license_state="NJ",
        credit_card_type="Visa",
        credit_card_number="4111111111111111",
        exp_month=11,
        exp_year=2028,
    )
    session.add(inactive_customer)
    session.flush()
    session.add(CustomerAccount(
        customer_id=inactive_customer.customer_id,
        username="nina.nohistory",
        password_hash=hash_password("customer123"),
        is_active=False,
    ))
    customer_id = customer.customer_id
    session.commit()
    session.close()

    def _dependency_override():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    return _dependency_override, customer_id


def test_staff_personas_can_login_with_expected_roles():
    client = TestClient(app)

    for username, password, role in [
        ("agent", "agent123", "agent"),
        ("manager", "manager123", "manager"),
        ("admin", "admin123", "admin"),
    ]:
        response = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["username"] == username
        assert payload["role"] == role
        assert payload["token_type"] == "bearer"


def test_db_customer_account_can_login_with_customer_identity():
    override, customer_id = _override_db_with_customer_account()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "john.doe", "password": "customer123"},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["username"] == "john.doe"
        assert payload["role"] == "customer"
        assert payload["customer_id"] == str(customer_id)
        assert payload["account_id"]
    finally:
        app.dependency_overrides.clear()


def test_inactive_customer_account_cannot_login():
    override, _customer_id = _override_db_with_customer_account()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "nina.nohistory", "password": "customer123"},
        )

        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_demo_customer_list_includes_safe_active_and_inactive_metadata():
    override, _customer_id = _override_db_with_customer_account()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        response = client.get("/api/v1/auth/demo-customers")

        assert response.status_code == 200
        payload = response.json()
        by_username = {item["username"]: item for item in payload}
        assert by_username["john.doe"]["is_active"] is True
        assert by_username["nina.nohistory"]["is_active"] is False
        assert by_username["nina.nohistory"]["reservation_count"] == 0
        assert "credit_card_number" not in by_username["john.doe"]
        assert "license_number" not in by_username["john.doe"]
    finally:
        app.dependency_overrides.clear()


def test_customer_cannot_read_another_customer_portal_summary():
    override, _customer_id = _override_db_with_customer_account()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        headers = auth_headers(client, username="john.doe", password="customer123")
        response = client.get(f"/api/v1/customer-portal/summary/{uuid4()}", headers=headers)

        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_customer_signup_creates_customer_account_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def _dependency_override():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _dependency_override
    try:
        client = TestClient(app)
        payload = {
            "username": "new.customer",
            "password": "customer123",
            "first_name": "New",
            "last_name": "Customer",
            "street": "20 Market St",
            "city": "Newark",
            "state": "NJ",
            "zip": "07102",
            "license_number": "NJ-SIGNUP-1",
            "license_state": "NJ",
            "credit_card_type": "Visa",
            "credit_card_number": "4111111111111111",
            "exp_month": 12,
            "exp_year": 2028,
        }
        response = client.post("/api/v1/auth/customer-signup", json=payload)

        assert response.status_code == 201
        body = response.json()
        assert body["role"] == "customer"
        assert body["username"] == "new.customer"
        assert body["customer_id"]

        duplicate = client.post("/api/v1/auth/customer-signup", json=payload)
        assert duplicate.status_code == 409
    finally:
        app.dependency_overrides.clear()


def test_customer_persona_data_is_captured_as_valid_customer_record():
    customer = CustomerCreate(
        first_name="Avery",
        last_name="Customer",
        street="20 Market St",
        city="Newark",
        state="NJ",
        zip="07102",
        license_number="NJ-CUSTOMER-1",
        license_state="NJ",
        credit_card_type="Visa",
        credit_card_number="4111111111111111",
        exp_month=12,
        exp_year=2028,
    )

    assert customer.first_name == "Avery"
    assert customer.license_state == "NJ"


def test_customer_persona_rejects_invalid_state_codes():
    with pytest.raises(ValidationError):
        CustomerCreate(
            first_name="Avery",
            last_name="Customer",
            street="20 Market St",
            city="Newark",
            state="New Jersey",
            zip="07102",
            license_number="NJ-CUSTOMER-2",
            license_state="NJ",
            credit_card_type="Visa",
            credit_card_number="4111111111111111",
            exp_month=12,
            exp_year=2028,
        )


def test_agent_and_manager_cannot_access_admin_inventory_actions():
    client = TestClient(app)
    payload = {"street": "1 Test Way", "city": "Newark", "state": "NJ", "zip": "07102"}

    for username, password in [("agent", "agent123"), ("manager", "manager123")]:
        response = client.post(
            "/api/v1/locations",
            json=payload,
            headers=auth_headers(client, username=username, password=password),
        )

        assert response.status_code == 403


def test_admin_passes_authorization_for_admin_actions_before_payload_validation():
    client = TestClient(app)

    response = client.post(
        "/api/v1/locations",
        json={"street": "1 Test Way", "city": "Newark", "state": "N", "zip": "07102"},
        headers=auth_headers(client, username="admin", password="admin123"),
    )

    assert response.status_code == 422


def test_database_changelog_contains_business_constraints():
    project_root = Path(__file__).resolve().parents[2]
    changelog_path = project_root / "database/migrations/03-add-business-constraints.xml"
    if not changelog_path.exists():
        pytest.skip("database migrations directory is not mounted in this test container")

    changelog = changelog_path.read_text()

    for constraint in [
        "chk_customer_exp_month",
        "chk_car_class_positive_rates",
        "chk_reservation_status",
        "chk_rental_odometer_order",
    ]:
        assert constraint in changelog


def test_database_changelog_contains_customer_account_linkage():
    project_root = Path(__file__).resolve().parents[2]
    changelog_path = project_root / "database/migrations/04-create-customer-accounts.xml"
    if not changelog_path.exists():
        pytest.skip("database migrations directory is not mounted in this test container")

    changelog = changelog_path.read_text()

    for expected in [
        "customer_account",
        "fk_customer_account_customer",
        "unique=\"true\"",
        "idx_customer_account_username",
        "chk_customer_account_username",
    ]:
        assert expected in changelog
