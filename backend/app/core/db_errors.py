"""Translate database integrity failures into API-safe responses."""

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError


def conflict_from_integrity_error(exc: IntegrityError, fallback: str) -> HTTPException:
    """Return a user-safe conflict response for common relational failures."""
    message = str(getattr(exc, "orig", exc)).lower()

    if "license_number" in message:
        detail = "License number already belongs to a customer"
    elif "location" in message and "unique" in message:
        detail = "Location address already exists"
    elif "customer_id" in message and "foreign" in message:
        detail = "customer_id must reference an existing customer"
    elif "location_id" in message and "foreign" in message:
        detail = "location_id must reference an existing location"
    elif "return_location_id" in message and "foreign" in message:
        detail = "return_location_id must reference an existing location"
    elif "class_id" in message and "foreign" in message:
        detail = "class_id must reference an existing car class"
    elif "check" in message:
        detail = "Submitted data violates a database business rule"
    else:
        detail = fallback

    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)
