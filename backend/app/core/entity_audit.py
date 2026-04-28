"""Generic audit helpers for staff/admin data changes."""

from sqlalchemy.orm import Session

from app.core.security import StaffPrincipal
from app.models.models import EntityAuditEvent


def record_entity_event(
    db: Session,
    *,
    actor: StaffPrincipal,
    action: str,
    entity_type: str,
    entity_id: object,
    notes: str | None = None,
) -> None:
    """Queue a durable audit event in the caller's active transaction."""
    db.add(
        EntityAuditEvent(
            entity_type=entity_type,
            entity_id=str(entity_id),
            action=action.upper(),
            actor_role=actor.role,
            actor_username=actor.username,
            notes=notes,
        )
    )
