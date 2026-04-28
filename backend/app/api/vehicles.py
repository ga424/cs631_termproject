"""CRUD endpoints for physical cars (identified by VIN)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.entity_audit import record_entity_event
from app.core.security import StaffPrincipal, require_admin, require_staff
from app.db.session import get_db
from app.models.models import Car
from app.schemas import Car as CarSchema, CarCreate, CarUpdate

router = APIRouter(prefix="/api/v1/cars", tags=["cars"], dependencies=[Depends(require_staff)])


@router.get("", response_model=list[CarSchema])
def list_cars(db: Session = Depends(get_db)):
    """List all cars"""
    cars = db.query(Car).all()
    return cars


@router.get("/{vin}", response_model=CarSchema)
def get_car(vin: str, db: Session = Depends(get_db)):
    """Get a specific car by VIN"""
    car = db.query(Car).filter(Car.vin == vin).first()
    if not car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")
    return car


@router.post("", response_model=CarSchema, status_code=status.HTTP_201_CREATED)
def create_car(
    car: CarCreate,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new car"""
    db_car = Car(**car.dict())
    db.add(db_car)
    try:
        db.flush()
        record_entity_event(
            db,
            actor=current_user,
            action="CREATED",
            entity_type="car",
            entity_id=db_car.vin,
            notes=f"Registered car {db_car.vin}.",
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="VIN must be unique and location_id/model_name must reference existing records",
        ) from exc
    db.refresh(db_car)
    return db_car


@router.put("/{vin}", response_model=CarSchema)
def update_car(
    vin: str,
    car: CarUpdate,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a car"""
    db_car = db.query(Car).filter(Car.vin == vin).first()
    if not db_car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")
    
    # Apply only fields provided in the request payload.
    update_data = car.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_car, field, value)
    record_entity_event(
        db,
        actor=current_user,
        action="UPDATED",
        entity_type="car",
        entity_id=vin,
        notes=f"Updated car fields: {', '.join(update_data.keys()) or 'none'}.",
    )
    
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="location_id and model_name must reference existing records",
        ) from exc
    db.refresh(db_car)
    return db_car


@router.delete("/{vin}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car(
    vin: str,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a car"""
    db_car = db.query(Car).filter(Car.vin == vin).first()
    if not db_car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")
    
    try:
        record_entity_event(
            db,
            actor=current_user,
            action="DELETED",
            entity_type="car",
            entity_id=vin,
            notes=f"Deleted car {vin}.",
        )
        db.delete(db_car)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Car has rental agreements and cannot be deleted",
        ) from exc
    return None
