"""Rental lifecycle audit helpers."""

from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.security import StaffPrincipal
from app.models.models import RentalLifecycleEvent, Reservation


def record_lifecycle_event(
    db: Session,
    *,
    reservation: Reservation,
    event_type: str,
    actor: StaffPrincipal | None = None,
    contract_no: UUID | None = None,
    notes: str | None = None,
    event_timestamp: datetime | None = None,
) -> RentalLifecycleEvent:
    """Create an audit event for a reservation/rental lifecycle transition."""
    event = RentalLifecycleEvent(
        reservation_id=reservation.reservation_id,
        contract_no=contract_no,
        customer_id=reservation.customer_id,
        event_type=event_type,
        actor_role=actor.role if actor else "system",
        actor_username=actor.username if actor else "system",
        event_timestamp=event_timestamp or datetime.utcnow(),
        notes=notes,
    )
    db.add(event)
    return event
