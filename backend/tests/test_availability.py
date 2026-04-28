from datetime import datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.models import Car, CarClass, Customer, CustomerAccount, Location, Model
from conftest import auth_headers


def _override_availability_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
    session = TestingSessionLocal()

    primary = Location(street="1 Fleet Way", city="Newark", state="NJ", zip="07102")
    secondary = Location(street="2 Empty Way", city="Hoboken", state="NJ", zip="07030")
    car_class = CarClass(class_name="Economy", daily_rate=35, weekly_rate=200)
    customer = Customer(
        first_name="Capacity",
        last_name="Customer",
        street="20 Market St",
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
    session.add_all([primary, secondary, car_class, customer])
    session.flush()

    model = Model(model_name="Toyota Capacity", make_name="Toyota", model_year=2024, class_id=car_class.class_id)
    car = Car(
        vin="1HGCM82633A009991",
        current_odometer_reading=12000,
        location_id=primary.location_id,
        model_name=model.model_name,
    )
    account = CustomerAccount(
        customer_id=customer.customer_id,
        username="capacity.customer",
        password_hash=hash_password("customer123"),
        is_active=True,
    )
    session.add_all([model, car, account])
    session.commit()
    ids = {
        "customer_id": customer.customer_id,
        "primary_location_id": primary.location_id,
        "secondary_location_id": secondary.location_id,
        "class_id": car_class.class_id,
    }
    session.close()

    def _dependency_override():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    return _dependency_override, ids


def _booking_payload(ids, *, location_id, pickup, dropoff):
    return {
        "first_name": "Capacity",
        "last_name": "Customer",
        "street": "20 Market St",
        "city": "Newark",
        "state": "NJ",
        "zip": "07102",
        "license_number": f"NJ-{uuid4()}",
        "license_state": "NJ",
        "credit_card_type": "Visa",
        "credit_card_number": "4111111111111111",
        "exp_month": 12,
        "exp_year": 2028,
        "location_id": str(location_id),
        "return_location_id": str(location_id),
        "class_id": str(ids["class_id"]),
        "pickup_date_time": pickup.isoformat(),
        "return_date_time_requested": dropoff.isoformat(),
    }


def _reservation_payload(ids, *, pickup, dropoff):
    return {
        "customer_id": str(ids["customer_id"]),
        "location_id": str(ids["primary_location_id"]),
        "return_location_id": str(ids["primary_location_id"]),
        "class_id": str(ids["class_id"]),
        "pickup_date_time": pickup.isoformat(),
        "return_date_time_requested": dropoff.isoformat(),
        "reservation_status": "ACTIVE",
    }


def test_customer_booking_rejects_branch_without_matching_capacity():
    override, ids = _override_availability_db()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        headers = auth_headers(client, username="capacity.customer", password="customer123")
        pickup = datetime.utcnow().replace(microsecond=0) + timedelta(days=10)
        dropoff = pickup + timedelta(days=2)

        response = client.post(
            "/api/v1/customer-portal/bookings",
            json=_booking_payload(ids, location_id=ids["secondary_location_id"], pickup=pickup, dropoff=dropoff),
            headers=headers,
        )

        assert response.status_code == 409
        assert "No available cars" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_customer_catalog_exposes_branch_level_availability_metadata():
    override, ids = _override_availability_db()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        headers = auth_headers(client, username="capacity.customer", password="customer123")
        response = client.get("/api/v1/customer-portal/catalog", headers=headers)

        assert response.status_code == 200
        option = next(item for item in response.json()["vehicle_options"] if item["class_id"] == str(ids["class_id"]))
        assert str(ids["primary_location_id"]) in option["available_location_ids"]
        assert str(ids["secondary_location_id"]) not in option["available_location_ids"]
    finally:
        app.dependency_overrides.clear()


def test_staff_reservation_rejects_overlapping_capacity_but_allows_later_window():
    override, ids = _override_availability_db()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        headers = auth_headers(client, username="agent", password="agent123")
        pickup = datetime.utcnow().replace(microsecond=0) + timedelta(days=15)
        dropoff = pickup + timedelta(days=2)

        first = client.post(
            "/api/v1/reservations",
            json=_reservation_payload(ids, pickup=pickup, dropoff=dropoff),
            headers=headers,
        )
        assert first.status_code == 201

        overlapping = client.post(
            "/api/v1/reservations",
            json=_reservation_payload(ids, pickup=pickup + timedelta(hours=12), dropoff=dropoff + timedelta(days=1)),
            headers=headers,
        )
        assert overlapping.status_code == 409
        assert "No available cars" in overlapping.json()["detail"]

        later = client.post(
            "/api/v1/reservations",
            json=_reservation_payload(ids, pickup=dropoff + timedelta(days=1), dropoff=dropoff + timedelta(days=3)),
            headers=headers,
        )
        assert later.status_code == 201
    finally:
        app.dependency_overrides.clear()
