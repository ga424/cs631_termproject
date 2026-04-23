"""CRUD endpoints for rental branch locations."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.security import require_admin, require_staff
from app.db.session import get_db
from app.models.models import Location
from app.schemas import Location as LocationSchema, LocationCreate, LocationUpdate

router = APIRouter(prefix="/api/v1/locations", tags=["locations"], dependencies=[Depends(require_staff)])


@router.get("", response_model=list[LocationSchema])
def list_locations(db: Session = Depends(get_db)):
    """List all locations"""
    locations = db.query(Location).all()
    return locations


@router.get("/{location_id}", response_model=LocationSchema)
def get_location(location_id: UUID, db: Session = Depends(get_db)):
    """Get a specific location"""
    location = db.query(Location).filter(Location.location_id == location_id).first()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location


@router.post("", response_model=LocationSchema, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_location(location: LocationCreate, db: Session = Depends(get_db)):
    """Create a new location"""
    db_location = Location(**location.dict())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location


@router.put("/{location_id}", response_model=LocationSchema, dependencies=[Depends(require_admin)])
def update_location(location_id: UUID, location: LocationUpdate, db: Session = Depends(get_db)):
    """Update a location"""
    db_location = db.query(Location).filter(Location.location_id == location_id).first()
    if not db_location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    # Apply only fields provided in the request payload.
    update_data = location.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_location, field, value)
    
    db.commit()
    db.refresh(db_location)
    return db_location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_location(location_id: UUID, db: Session = Depends(get_db)):
    """Delete a location"""
    db_location = db.query(Location).filter(Location.location_id == location_id).first()
    if not db_location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    
    try:
        db.delete(db_location)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Location has cars or reservations and cannot be deleted",
        ) from exc
    return None
