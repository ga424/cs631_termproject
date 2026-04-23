"""CRUD endpoints for rental agreements created from reservations."""

import math

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.models.models import Car, RentalAgreement, Reservation
from app.schemas import RentalAgreement as RentalAgreementSchema, RentalAgreementCreate, RentalAgreementUpdate

router = APIRouter(prefix="/api/v1/rental-agreements", tags=["rental-agreements"])


def _normalize_status(status_value: str | None) -> str:
    if not status_value:
        return ""

    status_upper = status_value.strip().upper()
    if status_upper == "PENDING":
        return "ACTIVE"
    if status_upper == "CONFIRMED":
        return "COMPLETED"
    return status_upper


def _calculate_rental_cost(total_days: int, daily_rate: float, weekly_rate: float) -> float:
    if total_days <= 0:
        return float(daily_rate)

    # Find the cheapest mix of weekly + daily pricing blocks.
    max_weeks = math.ceil(total_days / 7)
    best_cost = float("inf")
    for weeks in range(max_weeks + 1):
        remaining_days = max(0, total_days - (weeks * 7))
        candidate_cost = (weeks * weekly_rate) + (remaining_days * daily_rate)
        if candidate_cost < best_cost:
            best_cost = candidate_cost

    return round(best_cost, 2)


@router.get("", response_model=list[RentalAgreementSchema])
def list_rental_agreements(db: Session = Depends(get_db)):
    """List all rental agreements"""
    agreements = db.query(RentalAgreement).all()
    return agreements


@router.get("/{contract_no}", response_model=RentalAgreementSchema)
def get_rental_agreement(contract_no: UUID, db: Session = Depends(get_db)):
    """Get a specific rental agreement"""
    agreement = db.query(RentalAgreement).filter(RentalAgreement.contract_no == contract_no).first()
    if not agreement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental agreement not found")
    return agreement


@router.post("", response_model=RentalAgreementSchema, status_code=status.HTTP_201_CREATED)
def create_rental_agreement(agreement: RentalAgreementCreate, db: Session = Depends(get_db)):
    """Create a new rental agreement"""
    reservation = (
        db.query(Reservation)
        .filter(Reservation.reservation_id == agreement.reservation_id)
        .first()
    )
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    status_value = _normalize_status(reservation.reservation_status)
    if status_value != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rental agreement can only be created from an ACTIVE reservation",
        )

    existing_rental = (
        db.query(RentalAgreement)
        .filter(RentalAgreement.reservation_id == agreement.reservation_id)
        .first()
    )
    if existing_rental:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reservation already has a rental agreement",
        )

    car = db.query(Car).filter(Car.vin == agreement.vin).first()
    if not car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")

    if agreement.start_odometer_reading < car.current_odometer_reading:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_odometer_reading cannot be below current car odometer",
        )

    db_agreement = RentalAgreement(**agreement.dict())
    reservation.reservation_status = "COMPLETED"
    db.add(db_agreement)
    db.commit()
    db.refresh(db_agreement)
    return db_agreement


@router.put("/{contract_no}", response_model=RentalAgreementSchema)
def update_rental_agreement(contract_no: UUID, agreement: RentalAgreementUpdate, db: Session = Depends(get_db)):
    """Update a rental agreement"""
    db_agreement = db.query(RentalAgreement).filter(RentalAgreement.contract_no == contract_no).first()
    if not db_agreement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental agreement not found")
    
    update_data = agreement.dict(exclude_unset=True)

    rental_end = update_data.get("rental_end_date_time", db_agreement.rental_end_date_time)
    end_odometer = update_data.get("end_odometer_reading", db_agreement.end_odometer_reading)

    if rental_end and rental_end < db_agreement.rental_start_date_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="rental_end_date_time must be after rental_start_date_time",
        )

    if end_odometer is not None and end_odometer < db_agreement.start_odometer_reading:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_odometer_reading must be >= start_odometer_reading",
        )

    if "actual_cost" not in update_data and rental_end:
        reservation = (
            db.query(Reservation)
            .filter(Reservation.reservation_id == db_agreement.reservation_id)
            .first()
        )
        if reservation and reservation.car_class:
            duration_seconds = (rental_end - db_agreement.rental_start_date_time).total_seconds()
            total_days = max(1, math.ceil(duration_seconds / 86400))
            update_data["actual_cost"] = _calculate_rental_cost(
                total_days=total_days,
                daily_rate=float(reservation.car_class.daily_rate),
                weekly_rate=float(reservation.car_class.weekly_rate),
            )

    for field, value in update_data.items():
        setattr(db_agreement, field, value)

    if end_odometer is not None:
        car = db.query(Car).filter(Car.vin == db_agreement.vin).first()
        if car:
            car.current_odometer_reading = end_odometer
    
    db.commit()
    db.refresh(db_agreement)
    return db_agreement


@router.delete("/{contract_no}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rental_agreement(contract_no: UUID, db: Session = Depends(get_db)):
    """Delete a rental agreement"""
    db_agreement = db.query(RentalAgreement).filter(RentalAgreement.contract_no == contract_no).first()
    if not db_agreement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental agreement not found")
    
    db.delete(db_agreement)
    db.commit()
    return None

