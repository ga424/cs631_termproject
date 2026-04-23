from fastapi.testclient import TestClient

from app.main import app
from conftest import auth_headers


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
