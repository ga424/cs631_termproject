"""Read endpoints for durable staff/admin entity audit events."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.session import get_db
from app.models.models import EntityAuditEvent
from app.schemas import EntityAuditEvent as EntityAuditEventSchema

router = APIRouter(prefix="/api/v1/audit-events", tags=["audit-events"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[EntityAuditEventSchema])
def list_entity_audit_events(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """List recent staff/admin entity changes."""
    return (
        db.query(EntityAuditEvent)
        .order_by(EntityAuditEvent.event_timestamp.desc())
        .limit(limit)
        .all()
    )
