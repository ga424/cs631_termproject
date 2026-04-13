"""Aggregate dashboard endpoints for rental operations visibility."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.models import Car, CarClass, Location, Model, RentalAgreement, Reservation
from app.schemas import (
    DashboardActiveRental,
    DashboardFleetItem,
    DashboardLocationSummary,
    DashboardOverview,
    DashboardRateSummary,
    DashboardTotals,
    DashboardUpcomingReservation,
)

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


def _normalize_status(status: str | None) -> str:
    if not status:
        return ""

    normalized = status.strip().upper()
    if normalized == "PENDING":
        return "ACTIVE"
    if normalized == "CONFIRMED":
        return "COMPLETED"
    return normalized


@router.get("/overview", response_model=DashboardOverview)
def get_dashboard_overview(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    next_24_hours = now + timedelta(hours=24)

    locations = db.query(Location).all()
    cars = db.query(Car).options(joinedload(Car.location), joinedload(Car.model)).all()
    car_classes = (
        db.query(CarClass)
        .options(joinedload(CarClass.models).joinedload(Model.cars))
        .all()
    )

    active_rentals = (
        db.query(RentalAgreement)
        .options(joinedload(RentalAgreement.reservation), joinedload(RentalAgreement.car).joinedload(Car.location))
        .filter(RentalAgreement.rental_end_date_time.is_(None))
        .all()
    )

    unassigned_reservations = (
        db.query(Reservation)
        .options(joinedload(Reservation.location))
        .outerjoin(RentalAgreement, Reservation.reservation_id == RentalAgreement.reservation_id)
        .filter(RentalAgreement.contract_no.is_(None))
        .all()
    )

    active_rental_by_vin = {rental.vin: rental for rental in active_rentals}

    location_name_by_id = {
        location.location_id: f"{location.city}, {location.state}" for location in locations
    }

    reserved_requests_by_location: dict = {}
    upcoming_pickups: list[DashboardUpcomingReservation] = []

    for reservation in unassigned_reservations:
        status = _normalize_status(reservation.reservation_status)
        is_active = status == "ACTIVE"

        if is_active:
            reserved_requests_by_location[reservation.location_id] = (
                reserved_requests_by_location.get(reservation.location_id, 0) + 1
            )

        if is_active and now <= reservation.pickup_date_time <= next_24_hours:
            location_name = location_name_by_id.get(
                reservation.location_id,
                f"Location {reservation.location_id}",
            )
            upcoming_pickups.append(
                DashboardUpcomingReservation(
                    reservation_id=reservation.reservation_id,
                    location_name=location_name,
                    pickup_date_time=reservation.pickup_date_time,
                    return_date_time_requested=reservation.return_date_time_requested,
                    reservation_status=status,
                )
            )

    cars_by_location: dict = {}
    rented_by_location: dict = {}
    fleet_items: list[DashboardFleetItem] = []

    for car in cars:
        location_id = car.location_id
        location_name = location_name_by_id.get(location_id, f"Location {location_id}")
        rental = active_rental_by_vin.get(car.vin)
        status = "RENTED" if rental else "AVAILABLE"

        cars_by_location[location_id] = cars_by_location.get(location_id, 0) + 1
        if rental:
            rented_by_location[location_id] = rented_by_location.get(location_id, 0) + 1

        fleet_items.append(
            DashboardFleetItem(
                vin=car.vin,
                model_name=car.model_name,
                location_id=location_id,
                location_name=location_name,
                current_odometer_reading=car.current_odometer_reading,
                status=status,
                active_contract_no=rental.contract_no if rental else None,
            )
        )

    fleet_items.sort(key=lambda item: (item.location_name, item.status, item.vin))

    location_summaries: list[DashboardLocationSummary] = []
    for location in locations:
        total_cars = cars_by_location.get(location.location_id, 0)
        rented_cars = rented_by_location.get(location.location_id, 0)
        available_cars = total_cars - rented_cars
        reserved_requests = reserved_requests_by_location.get(location.location_id, 0)
        utilization = (rented_cars / total_cars * 100) if total_cars else 0.0

        location_summaries.append(
            DashboardLocationSummary(
                location_id=location.location_id,
                location_name=location_name_by_id.get(location.location_id, "Unknown"),
                total_cars=total_cars,
                available_cars=available_cars,
                rented_cars=rented_cars,
                reserved_requests=reserved_requests,
                utilization_percent=round(utilization, 1),
            )
        )

    location_summaries.sort(key=lambda item: item.location_name)

    active_rental_items = [
        DashboardActiveRental(
            contract_no=rental.contract_no,
            vin=rental.vin,
            location_name=location_name_by_id.get(
                rental.car.location_id,
                f"Location {rental.car.location_id}",
            ),
            rental_start_date_time=rental.rental_start_date_time,
            return_date_time_requested=rental.reservation.return_date_time_requested,
            is_overdue=now > rental.reservation.return_date_time_requested,
        )
        for rental in active_rentals
    ]
    active_rental_items.sort(key=lambda item: item.return_date_time_requested)

    totals = DashboardTotals(
        total_cars=len(cars),
        available_cars=sum(1 for item in fleet_items if item.status == "AVAILABLE"),
        rented_cars=sum(1 for item in fleet_items if item.status == "RENTED"),
        reserved_requests=sum(reserved_requests_by_location.values()),
    )

    rate_summaries: list[DashboardRateSummary] = []
    for car_class in car_classes:
        vehicle_count = sum(len(model.cars) for model in car_class.models)
        rate_summaries.append(
            DashboardRateSummary(
                class_id=car_class.class_id,
                class_name=car_class.class_name,
                daily_rate=float(car_class.daily_rate),
                weekly_rate=float(car_class.weekly_rate),
                model_count=len(car_class.models),
                vehicle_count=vehicle_count,
            )
        )

    rate_summaries.sort(key=lambda item: item.class_name)

    upcoming_pickups.sort(key=lambda item: item.pickup_date_time)

    return DashboardOverview(
        generated_at=now,
        totals=totals,
        rates=rate_summaries,
        locations=location_summaries,
        fleet=fleet_items,
        active_rentals=active_rental_items,
        upcoming_pickups=upcoming_pickups,
    )
