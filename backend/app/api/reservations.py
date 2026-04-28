"""CRUD endpoints for reservation lifecycle records."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.availability import has_capacity, to_naive_utc
from app.core.db_errors import conflict_from_integrity_error
from app.core.entity_audit import record_entity_event
from app.core.lifecycle import record_lifecycle_event
from app.core.security import StaffPrincipal, require_staff
from app.db.session import get_db
from app.models.models import RentalAgreement, Reservation
from app.schemas import Reservation as ReservationSchema, ReservationCreate, ReservationUpdate

router = APIRouter(prefix="/api/v1/reservations", tags=["reservations"], dependencies=[Depends(require_staff)])


def _normalize_status(status_value: str | None) -> str:
    if not status_value:
        return ""

    status_upper = status_value.strip().upper()
    if status_upper == "PENDING":
        return "ACTIVE"
    if status_upper == "CONFIRMED":
        return "FULFILLED"
    return status_upper


@router.get("", response_model=list[ReservationSchema])
def list_reservations(db: Session = Depends(get_db)):
    """List all reservations"""
    reservations = db.query(Reservation).all()
    return reservations


@router.get("/{reservation_id}", response_model=ReservationSchema)
def get_reservation(reservation_id: UUID, db: Session = Depends(get_db)):
    """Get a specific reservation"""
    reservation = db.query(Reservation).filter(Reservation.reservation_id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    return reservation


@router.post("", response_model=ReservationSchema, status_code=status.HTTP_201_CREATED)
def create_reservation(
    reservation: ReservationCreate,
    current_user: StaffPrincipal = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """Create a new reservation"""
    reservation_data = reservation.dict()
    reservation_data["return_location_id"] = reservation_data.get("return_location_id") or reservation_data["location_id"]
    reservation_data["pickup_date_time"] = to_naive_utc(reservation_data["pickup_date_time"])
    reservation_data["return_date_time_requested"] = to_naive_utc(reservation_data["return_date_time_requested"])
    if _normalize_status(reservation_data.get("reservation_status")) == "ACTIVE" and not has_capacity(
        db,
        location_id=reservation_data["location_id"],
        class_id=reservation_data["class_id"],
        pickup=reservation_data["pickup_date_time"],
        requested_return=reservation_data["return_date_time_requested"],
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No available cars for the requested branch, class, and time window",
        )

    db_reservation = Reservation(**reservation_data)
    db.add(db_reservation)
    try:
        db.flush()
        record_entity_event(
            db,
            actor=current_user,
            action="CREATED",
            entity_type="reservation",
            entity_id=db_reservation.reservation_id,
            notes="Created reservation.",
        )
        record_lifecycle_event(
            db,
            reservation=db_reservation,
            event_type="RESERVED",
            actor=current_user,
            notes="Reservation created by staff.",
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise conflict_from_integrity_error(exc, "Reservation could not be created") from exc
    db.refresh(db_reservation)
    return db_reservation


@router.put("/{reservation_id}", response_model=ReservationSchema)
def update_reservation(
    reservation_id: UUID,
    reservation: ReservationUpdate,
    current_user: StaffPrincipal = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """Update a reservation"""
    db_reservation = db.query(Reservation).filter(Reservation.reservation_id == reservation_id).first()
    if not db_reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    
    # Apply only fields provided in the request payload.
    update_data = reservation.dict(exclude_unset=True)

    current_status = _normalize_status(db_reservation.reservation_status)
    requested_status = _normalize_status(update_data.get("reservation_status"))

    existing_rental = (
        db.query(RentalAgreement)
        .filter(RentalAgreement.reservation_id == reservation_id)
        .first()
    )
    if existing_rental:
        protected_fields = {
            "customer_id",
            "location_id",
            "return_location_id",
            "class_id",
            "pickup_date_time",
            "return_date_time_requested",
        }
        changed_protected_fields = protected_fields.intersection(update_data)
        status_change = "reservation_status" in update_data and requested_status != current_status
        if changed_protected_fields or status_change:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Reservations with a rental agreement cannot change customer, branch, class, dates, or status",
            )

    if current_status in {"FULFILLED", "COMPLETED"} and requested_status in {"CANCELED", "NO_SHOW"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fulfilled reservations cannot be canceled or marked no-show",
        )

    pickup = update_data.get("pickup_date_time", db_reservation.pickup_date_time)
    requested_return = update_data.get(
        "return_date_time_requested",
        db_reservation.return_date_time_requested,
    )
    pickup = to_naive_utc(pickup)
    requested_return = to_naive_utc(requested_return)
    if requested_return <= pickup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="return_date_time_requested must be after pickup_date_time",
        )

    if "pickup_date_time" in update_data:
        update_data["pickup_date_time"] = pickup
        pickup = update_data["pickup_date_time"]
    if "return_date_time_requested" in update_data:
        update_data["return_date_time_requested"] = requested_return
        requested_return = update_data["return_date_time_requested"]

    effective_status = requested_status or current_status
    if effective_status == "ACTIVE" and any(
        field in update_data
        for field in {"location_id", "class_id", "pickup_date_time", "return_date_time_requested", "reservation_status"}
    ):
        effective_location_id = update_data.get("location_id", db_reservation.location_id)
        effective_class_id = update_data.get("class_id", db_reservation.class_id)
        if not has_capacity(
            db,
            location_id=effective_location_id,
            class_id=effective_class_id,
            pickup=pickup,
            requested_return=requested_return,
            exclude_reservation_id=reservation_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No available cars for the requested branch, class, and time window",
            )

    for field, value in update_data.items():
        setattr(db_reservation, field, value)

    if "location_id" in update_data and db_reservation.return_location_id is None:
        db_reservation.return_location_id = db_reservation.location_id

    record_entity_event(
        db,
        actor=current_user,
        action="UPDATED",
        entity_type="reservation",
        entity_id=reservation_id,
        notes=f"Updated reservation fields: {', '.join(update_data.keys()) or 'none'}.",
    )

    if requested_status in {"CANCELED", "NO_SHOW"} and requested_status != current_status:
        record_lifecycle_event(
            db,
            reservation=db_reservation,
            event_type=requested_status,
            actor=current_user,
            notes=f"Reservation marked {requested_status.lower().replace('_', '-')}.",
        )
    
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise conflict_from_integrity_error(exc, "Reservation could not be updated") from exc
    db.refresh(db_reservation)
    return db_reservation


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reservation(
    reservation_id: UUID,
    current_user: StaffPrincipal = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """Delete a reservation"""
    db_reservation = db.query(Reservation).filter(Reservation.reservation_id == reservation_id).first()
    if not db_reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    existing_rental = (
        db.query(RentalAgreement)
        .filter(RentalAgreement.reservation_id == reservation_id)
        .first()
    )
    if existing_rental:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reservation has a rental agreement and cannot be deleted",
        )
    
    record_entity_event(
        db,
        actor=current_user,
        action="DELETED",
        entity_type="reservation",
        entity_id=reservation_id,
        notes="Deleted reservation.",
    )
    db.delete(db_reservation)
    db.commit()
    return None
