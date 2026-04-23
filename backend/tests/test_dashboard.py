from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.db.session import get_db
from app.main import app
from app.models.models import Car, CarClass, Location, Model, RentalAgreement, Reservation
from conftest import auth_headers


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def options(self, *_args, **_kwargs):
        return self

    def outerjoin(self, *_args, **_kwargs):
        return self

    def filter(self, *_args, **_kwargs):
        return self

    def all(self):
        return self.rows


class FakeDashboardDB:
    def __init__(self):
        now = datetime.utcnow().replace(microsecond=0)

        newark = Location(
            location_id=uuid4(),
            street="1 Branch Way",
            city="Newark",
            state="NJ",
            zip="07102",
            created_at=now,
            updated_at=now,
        )
        hoboken = Location(
            location_id=uuid4(),
            street="2 Fleet Ave",
            city="Hoboken",
            state="NJ",
            zip="07030",
            created_at=now,
            updated_at=now,
        )

        economy = CarClass(
            class_id=uuid4(),
            class_name="Economy",
            daily_rate=35.0,
            weekly_rate=200.0,
            created_at=now,
            updated_at=now,
        )
        suv = CarClass(
            class_id=uuid4(),
            class_name="SUV",
            daily_rate=95.0,
            weekly_rate=500.0,
            created_at=now,
            updated_at=now,
        )

        corolla = Model(
            model_name="Toyota Corolla",
            make_name="Toyota",
            model_year=2024,
            class_id=economy.class_id,
            created_at=now,
            updated_at=now,
        )
        explorer = Model(
            model_name="Ford Explorer",
            make_name="Ford",
            model_year=2024,
            class_id=suv.class_id,
            created_at=now,
            updated_at=now,
        )
        corolla.car_class = economy
        explorer.car_class = suv
        economy.models = [corolla]
        suv.models = [explorer]

        cars = [
            Car(vin="1HGCM82633A001001", current_odometer_reading=12000, location_id=newark.location_id, model_name=corolla.model_name, created_at=now, updated_at=now),
            Car(vin="1HGCM82633A001002", current_odometer_reading=15000, location_id=newark.location_id, model_name=explorer.model_name, created_at=now, updated_at=now),
            Car(vin="1HGCM82633A001003", current_odometer_reading=18000, location_id=hoboken.location_id, model_name=explorer.model_name, created_at=now, updated_at=now),
            Car(vin="1HGCM82633A001004", current_odometer_reading=19000, location_id=hoboken.location_id, model_name=explorer.model_name, created_at=now, updated_at=now),
        ]
        for car in cars:
            car.location = newark if car.location_id == newark.location_id else hoboken
            car.model = corolla if car.model_name == corolla.model_name else explorer
        corolla.cars = [cars[0]]
        explorer.cars = cars[1:]

        open_reservation = Reservation(
            reservation_id=uuid4(),
            customer_id=uuid4(),
            location_id=newark.location_id,
            class_id=suv.class_id,
            pickup_date_time=now - timedelta(hours=2),
            return_date_time_requested=now + timedelta(days=2),
            reservation_status="COMPLETED",
            created_at=now,
            updated_at=now,
        )
        open_reservation.location = newark
        open_reservation.car_class = suv

        upcoming_reservation = Reservation(
            reservation_id=uuid4(),
            customer_id=uuid4(),
            location_id=hoboken.location_id,
            class_id=economy.class_id,
            pickup_date_time=now + timedelta(hours=4),
            return_date_time_requested=now + timedelta(days=1),
            reservation_status="ACTIVE",
            created_at=now,
            updated_at=now,
        )
        upcoming_reservation.location = hoboken
        upcoming_reservation.car_class = economy

        active_rental = RentalAgreement(
            contract_no=uuid4(),
            reservation_id=open_reservation.reservation_id,
            vin=cars[1].vin,
            rental_start_date_time=now - timedelta(hours=2),
            start_odometer_reading=15000,
            created_at=now,
            updated_at=now,
        )
        active_rental.reservation = open_reservation
        active_rental.car = cars[1]

        self.rows_by_model = {
            Location: [newark, hoboken],
            Car: cars,
            CarClass: [economy, suv],
            RentalAgreement: [active_rental],
            Reservation: [upcoming_reservation],
        }

    def query(self, model):
        return FakeQuery(self.rows_by_model.get(model, []))


@pytest.fixture(autouse=True)
def use_fake_dashboard_db():
    app.dependency_overrides[get_db] = lambda: FakeDashboardDB()
    try:
        yield
    finally:
        app.dependency_overrides.clear()


def test_dashboard_overview_returns_expected_top_level_shape():
    client = TestClient(app)
    headers = auth_headers(client)

    response = client.get("/api/v1/dashboard/overview", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert "generated_at" in payload
    assert "totals" in payload
    assert "rates" in payload
    assert "locations" in payload
    assert "fleet" in payload
    assert "active_rentals" in payload
    assert "upcoming_pickups" in payload


def test_dashboard_rates_include_seeded_classes():
    client = TestClient(app)
    headers = auth_headers(client)

    payload = client.get("/api/v1/dashboard/overview", headers=headers).json()
    rates = {rate["class_name"]: rate for rate in payload["rates"]}

    assert rates["Economy"]["daily_rate"] == 35.0
    assert rates["Economy"]["weekly_rate"] == 200.0
    assert rates["SUV"]["vehicle_count"] == 3


def test_dashboard_totals_are_internally_consistent():
    client = TestClient(app)
    headers = auth_headers(client)

    payload = client.get("/api/v1/dashboard/overview", headers=headers).json()
    totals = payload["totals"]

    assert totals["total_cars"] == totals["available_cars"] + totals["rented_cars"]

    location_total_cars = sum(location["total_cars"] for location in payload["locations"])
    location_available = sum(location["available_cars"] for location in payload["locations"])
    location_rented = sum(location["rented_cars"] for location in payload["locations"])

    assert totals["total_cars"] == location_total_cars
    assert totals["available_cars"] == location_available
    assert totals["rented_cars"] == location_rented


def test_dashboard_fleet_status_and_active_rentals_align():
    client = TestClient(app)
    headers = auth_headers(client)

    payload = client.get("/api/v1/dashboard/overview", headers=headers).json()
    fleet = payload["fleet"]
    active_rentals = payload["active_rentals"]

    rented_fleet_items = [item for item in fleet if item["status"] == "RENTED"]
    available_fleet_items = [item for item in fleet if item["status"] == "AVAILABLE"]

    assert all(item["active_contract_no"] for item in rented_fleet_items)
    assert all(item["active_contract_no"] is None for item in available_fleet_items)

    rented_vins = {item["vin"] for item in rented_fleet_items}
    active_rental_vins = {rental["vin"] for rental in active_rentals}

    assert active_rental_vins.issubset(rented_vins)
