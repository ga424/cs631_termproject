from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas import (
    CarClassCreate,
    CarCreate,
    CustomerCreate,
    ReservationCreate,
    RentalAgreement,
)


def test_customer_exp_month_must_be_1_to_12():
    with pytest.raises(ValidationError):
        CustomerCreate(
            first_name="A",
            last_name="B",
            street="1 Main",
            city="Newark",
            state="NJ",
            zip="07101",
            license_number="NJ100",
            license_state="NJ",
            credit_card_type="Visa",
            credit_card_number="4111111111111111",
            exp_month=13,
            exp_year=2027,
        )


def test_car_class_rates_must_be_positive():
    with pytest.raises(ValidationError):
        CarClassCreate(class_name="Economy", daily_rate=0, weekly_rate=200)


def test_car_vin_length_and_odometer_constraints():
    with pytest.raises(ValidationError):
        CarCreate(
            vin="SHORTVIN",
            current_odometer_reading=10,
            location_id=uuid4(),
            model_name="Model",
        )

    with pytest.raises(ValidationError):
        CarCreate(
            vin="1HGCM82633A001001",
            current_odometer_reading=-1,
            location_id=uuid4(),
            model_name="Model",
        )


def test_reservation_status_and_date_order_constraints():
    pickup = datetime.utcnow()
    with pytest.raises(ValidationError):
        ReservationCreate(
            customer_id=uuid4(),
            location_id=uuid4(),
            class_id=uuid4(),
            pickup_date_time=pickup,
            return_date_time_requested=pickup - timedelta(hours=1),
            reservation_status="ACTIVE",
        )

    with pytest.raises(ValidationError):
        ReservationCreate(
            customer_id=uuid4(),
            location_id=uuid4(),
            class_id=uuid4(),
            pickup_date_time=pickup,
            return_date_time_requested=pickup + timedelta(hours=1),
            reservation_status="PENDING",
        )


def test_rental_agreement_closeout_constraints():
    start = datetime.utcnow()
    with pytest.raises(ValidationError):
        RentalAgreement(
            contract_no=uuid4(),
            reservation_id=uuid4(),
            vin="1HGCM82633A001001",
            rental_start_date_time=start,
            start_odometer_reading=100,
            rental_end_date_time=start - timedelta(minutes=1),
            end_odometer_reading=150,
            actual_cost=100.0,
            created_at=start,
            updated_at=start,
        )

    with pytest.raises(ValidationError):
        RentalAgreement(
            contract_no=uuid4(),
            reservation_id=uuid4(),
            vin="1HGCM82633A001001",
            rental_start_date_time=start,
            start_odometer_reading=100,
            rental_end_date_time=start + timedelta(minutes=1),
            end_odometer_reading=99,
            actual_cost=100.0,
            created_at=start,
            updated_at=start,
        )


def test_api_rejects_invalid_reservation_payloads():
    client = TestClient(app)
    pickup = datetime.utcnow().replace(microsecond=0)

    invalid_status_payload = {
        "customer_id": str(uuid4()),
        "location_id": str(uuid4()),
        "class_id": str(uuid4()),
        "pickup_date_time": pickup.isoformat(),
        "return_date_time_requested": (pickup + timedelta(hours=2)).isoformat(),
        "reservation_status": "PENDING",
    }
    response = client.post("/api/v1/reservations", json=invalid_status_payload)
    assert response.status_code == 422

    invalid_dates_payload = {
        "customer_id": str(uuid4()),
        "location_id": str(uuid4()),
        "class_id": str(uuid4()),
        "pickup_date_time": pickup.isoformat(),
        "return_date_time_requested": (pickup - timedelta(hours=2)).isoformat(),
        "reservation_status": "ACTIVE",
    }
    response = client.post("/api/v1/reservations", json=invalid_dates_payload)
    assert response.status_code == 422


def test_api_rejects_invalid_customer_expiration_month():
    client = TestClient(app)
    payload = {
        "first_name": "James",
        "last_name": "Carter",
        "street": "12 Oak St",
        "city": "Newark",
        "state": "NJ",
        "zip": "07101",
        "license_number": "NJ12345678",
        "license_state": "NJ",
        "credit_card_type": "Visa",
        "credit_card_number": "4111111111111111",
        "exp_month": 13,
        "exp_year": 2027,
    }
    response = client.post("/api/v1/customers", json=payload)
    assert response.status_code == 422


def test_api_rejects_invalid_car_vin_and_odometer():
    client = TestClient(app)
    payload = {
        "vin": "SHORTVIN",
        "current_odometer_reading": -10,
        "location_id": str(uuid4()),
        "model_name": "Toyota Corolla",
    }
    response = client.post("/api/v1/cars", json=payload)
    assert response.status_code == 422


def test_api_rejects_invalid_rental_start_odometer():
    client = TestClient(app)
    payload = {
        "reservation_id": str(uuid4()),
        "vin": "1HGCM82633A001001",
        "rental_start_date_time": datetime.utcnow().replace(microsecond=0).isoformat(),
        "start_odometer_reading": -1,
    }
    response = client.post("/api/v1/rental-agreements", json=payload)
    assert response.status_code == 422
