from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.models import Car, CarClass, Customer, CustomerAccount, Location, Model, RentalLifecycleEvent, Reservation
from conftest import auth_headers


def _override_lifecycle_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
    session = TestingSessionLocal()

    location = Location(street="1 Main", city="Newark", state="NJ", zip="07102")
    car_class = CarClass(class_name="Economy", daily_rate=35, weekly_rate=200)
    customer = Customer(
        first_name="Lifecycle",
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
    session.add_all([location, car_class, customer])
    session.flush()
    model = Model(model_name="Toyota Test", make_name="Toyota", model_year=2024, class_id=car_class.class_id)
    car = Car(
        vin="1HGCM82633A001001",
        current_odometer_reading=43210,
        location_id=location.location_id,
        model_name=model.model_name,
    )
    reservation = Reservation(
        customer_id=customer.customer_id,
        location_id=location.location_id,
        class_id=car_class.class_id,
        pickup_date_time=datetime.utcnow().replace(microsecond=0) + timedelta(hours=1),
        return_date_time_requested=datetime.utcnow().replace(microsecond=0) + timedelta(days=2),
        reservation_status="ACTIVE",
    )
    account = CustomerAccount(
        customer_id=customer.customer_id,
        username="lifecycle.customer",
        password_hash=hash_password("customer123"),
        is_active=True,
    )
    session.add_all([model, car, reservation, account])
    session.commit()
    ids = {
        "customer_id": customer.customer_id,
        "reservation_id": reservation.reservation_id,
        "vin": car.vin,
        "start_odometer": car.current_odometer_reading,
    }
    session.close()

    def _dependency_override():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    return _dependency_override, TestingSessionLocal, ids


def test_pickup_derives_odometer_sets_fulfilled_and_writes_audit_events():
    override, SessionLocal, ids = _override_lifecycle_db()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        headers = auth_headers(client, username="agent", password="agent123")
        payload = {
            "reservation_id": str(ids["reservation_id"]),
            "vin": ids["vin"],
            "rental_start_date_time": datetime.utcnow().replace(microsecond=0).isoformat(),
        }
        response = client.post("/api/v1/rental-agreements", json=payload, headers=headers)

        assert response.status_code == 201
        body = response.json()
        assert body["start_odometer_reading"] == ids["start_odometer"]

        db = SessionLocal()
        try:
            reservation = db.query(Reservation).filter(Reservation.reservation_id == ids["reservation_id"]).one()
            assert reservation.reservation_status == "FULFILLED"
            event_types = {
                event.event_type
                for event in db.query(RentalLifecycleEvent).filter(RentalLifecycleEvent.reservation_id == ids["reservation_id"]).all()
            }
            assert {"PICKED_UP", "RENTAL_OPENED"}.issubset(event_types)
        finally:
            db.close()
    finally:
        app.dependency_overrides.clear()


def test_pickup_rejects_stale_start_odometer():
    override, _SessionLocal, ids = _override_lifecycle_db()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        headers = auth_headers(client, username="agent", password="agent123")
        payload = {
            "reservation_id": str(ids["reservation_id"]),
            "vin": ids["vin"],
            "rental_start_date_time": datetime.utcnow().replace(microsecond=0).isoformat(),
            "start_odometer_reading": ids["start_odometer"] - 1,
        }
        response = client.post("/api/v1/rental-agreements", json=payload, headers=headers)

        assert response.status_code == 400
        assert "must match" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_return_updates_car_odometer_and_exposes_customer_lifecycle_history():
    override, SessionLocal, ids = _override_lifecycle_db()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        agent_headers = auth_headers(client, username="agent", password="agent123")
        start_response = client.post(
            "/api/v1/rental-agreements",
            json={
                "reservation_id": str(ids["reservation_id"]),
                "vin": ids["vin"],
                "rental_start_date_time": datetime.utcnow().replace(microsecond=0).isoformat(),
            },
            headers=agent_headers,
        )
        assert start_response.status_code == 201
        contract_no = start_response.json()["contract_no"]

        close_response = client.put(
            f"/api/v1/rental-agreements/{contract_no}",
            json={
                "rental_end_date_time": (datetime.utcnow().replace(microsecond=0) + timedelta(hours=4)).isoformat(),
                "end_odometer_reading": ids["start_odometer"] + 125,
            },
            headers=agent_headers,
        )
        assert close_response.status_code == 200
        assert close_response.json()["actual_cost"] is not None

        db = SessionLocal()
        try:
            car = db.query(Car).filter(Car.vin == ids["vin"]).one()
            assert car.current_odometer_reading == ids["start_odometer"] + 125
        finally:
            db.close()

        customer_headers = auth_headers(client, username="lifecycle.customer", password="customer123")
        summary = client.get("/api/v1/customer-portal/me", headers=customer_headers)
        assert summary.status_code == 200
        payload = summary.json()
        assert payload["active_rentals"] == []
        assert payload["rental_agreements"][0]["contract_no"] == contract_no
        event_types = [event["event_type"] for event in payload["lifecycle_events"]]
        assert "RETURNED" in event_types
        assert "BILLED" in event_types
    finally:
        app.dependency_overrides.clear()


def test_return_requires_end_odometer_when_closing_rental():
    override, _SessionLocal, ids = _override_lifecycle_db()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        agent_headers = auth_headers(client, username="agent", password="agent123")
        start_response = client.post(
            "/api/v1/rental-agreements",
            json={
                "reservation_id": str(ids["reservation_id"]),
                "vin": ids["vin"],
                "rental_start_date_time": datetime.utcnow().replace(microsecond=0).isoformat(),
            },
            headers=agent_headers,
        )
        assert start_response.status_code == 201

        response = client.put(
            f"/api/v1/rental-agreements/{start_response.json()['contract_no']}",
            json={
                "rental_end_date_time": (datetime.utcnow().replace(microsecond=0) + timedelta(hours=4)).isoformat(),
            },
            headers=agent_headers,
        )

        assert response.status_code == 400
        assert "end_odometer_reading is required" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_return_accepts_timezone_aware_closeout_datetime():
    override, _SessionLocal, ids = _override_lifecycle_db()
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        agent_headers = auth_headers(client, username="agent", password="agent123")
        start_response = client.post(
            "/api/v1/rental-agreements",
            json={
                "reservation_id": str(ids["reservation_id"]),
                "vin": ids["vin"],
                "rental_start_date_time": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            },
            headers=agent_headers,
        )
        assert start_response.status_code == 201

        response = client.put(
            f"/api/v1/rental-agreements/{start_response.json()['contract_no']}",
            json={
                "rental_end_date_time": (datetime.now(timezone.utc).replace(microsecond=0) + timedelta(hours=4)).isoformat(),
                "end_odometer_reading": ids["start_odometer"] + 25,
            },
            headers=agent_headers,
        )

        assert response.status_code == 200
        assert response.json()["rental_end_date_time"]
    finally:
        app.dependency_overrides.clear()
