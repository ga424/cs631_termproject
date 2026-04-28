"""Reservation availability rules shared by staff and customer flows."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.models import Car, RentalAgreement, Reservation


def to_naive_utc(value: datetime | None) -> datetime | None:
    """Normalize timezone-aware datetimes before comparing with DB values."""
    if value is None or value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def ranges_overlap(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> bool:
    """Return true when two reservation/rental windows overlap."""
    return start_a < end_b and end_a > start_b


def matching_fleet_count(db: Session, *, location_id: UUID, class_id: UUID) -> int:
    """Count physical cars at a branch whose model belongs to a requested class."""
    return (
        db.query(Car)
        .join(Car.model)
        .filter(Car.location_id == location_id, Car.model.has(class_id=class_id))
        .count()
    )


def overlapping_active_reservation_count(
    db: Session,
    *,
    location_id: UUID,
    class_id: UUID,
    pickup: datetime,
    requested_return: datetime,
    exclude_reservation_id: UUID | None = None,
) -> int:
    """Count active, unfulfilled reservations consuming class capacity."""
    query = (
        db.query(Reservation)
        .outerjoin(RentalAgreement, Reservation.reservation_id == RentalAgreement.reservation_id)
        .filter(
            Reservation.location_id == location_id,
            Reservation.class_id == class_id,
            Reservation.reservation_status == "ACTIVE",
            RentalAgreement.contract_no.is_(None),
            Reservation.pickup_date_time < requested_return,
            Reservation.return_date_time_requested > pickup,
        )
    )
    if exclude_reservation_id is not None:
        query = query.filter(Reservation.reservation_id != exclude_reservation_id)
    return query.count()


def overlapping_open_rental_count(
    db: Session,
    *,
    location_id: UUID,
    class_id: UUID,
    pickup: datetime,
    requested_return: datetime,
) -> int:
    """Count open rentals whose expected return window conflicts with a request."""
    return (
        db.query(RentalAgreement)
        .join(RentalAgreement.reservation)
        .join(RentalAgreement.car)
        .join(Car.model)
        .filter(
            RentalAgreement.rental_end_date_time.is_(None),
            Car.location_id == location_id,
            Car.model.has(class_id=class_id),
            RentalAgreement.rental_start_date_time < requested_return,
            Reservation.return_date_time_requested > pickup,
        )
        .count()
    )


def available_capacity(
    db: Session,
    *,
    location_id: UUID,
    class_id: UUID,
    pickup: datetime,
    requested_return: datetime,
    exclude_reservation_id: UUID | None = None,
) -> int:
    """Return remaining branch/class capacity for a date window."""
    pickup_utc = to_naive_utc(pickup)
    return_utc = to_naive_utc(requested_return)
    if pickup_utc is None or return_utc is None:
        return 0

    fleet_count = matching_fleet_count(db, location_id=location_id, class_id=class_id)
    reserved_count = overlapping_active_reservation_count(
        db,
        location_id=location_id,
        class_id=class_id,
        pickup=pickup_utc,
        requested_return=return_utc,
        exclude_reservation_id=exclude_reservation_id,
    )
    open_rental_count = overlapping_open_rental_count(
        db,
        location_id=location_id,
        class_id=class_id,
        pickup=pickup_utc,
        requested_return=return_utc,
    )
    return fleet_count - reserved_count - open_rental_count


def has_capacity(
    db: Session,
    *,
    location_id: UUID,
    class_id: UUID,
    pickup: datetime,
    requested_return: datetime,
    exclude_reservation_id: UUID | None = None,
) -> bool:
    """Return whether at least one vehicle remains for the requested window."""
    return available_capacity(
        db,
        location_id=location_id,
        class_id=class_id,
        pickup=pickup,
        requested_return=requested_return,
        exclude_reservation_id=exclude_reservation_id,
    ) > 0
