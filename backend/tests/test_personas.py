from pathlib import Path

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.main import app
from app.schemas import CustomerCreate
from conftest import auth_headers


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
    changelog = (project_root / "database/migrations/03-add-business-constraints.xml").read_text()

    for constraint in [
        "chk_customer_exp_month",
        "chk_car_class_positive_rates",
        "chk_reservation_status",
        "chk_rental_odometer_order",
    ]:
        assert constraint in changelog
