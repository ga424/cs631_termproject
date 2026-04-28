"""CRUD endpoints for car-class pricing tiers."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.entity_audit import record_entity_event
from app.core.security import StaffPrincipal, require_admin, require_staff
from app.db.session import get_db
from app.models.models import CarClass
from app.schemas import CarClass as CarClassSchema, CarClassCreate, CarClassUpdate

router = APIRouter(prefix="/api/v1/car-classes", tags=["car-classes"], dependencies=[Depends(require_staff)])


@router.get("", response_model=list[CarClassSchema])
def list_car_classes(db: Session = Depends(get_db)):
    """List all car classes"""
    classes = db.query(CarClass).all()
    return classes


@router.get("/{class_id}", response_model=CarClassSchema)
def get_car_class(class_id: UUID, db: Session = Depends(get_db)):
    """Get a specific car class"""
    car_class = db.query(CarClass).filter(CarClass.class_id == class_id).first()
    if not car_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car class not found")
    return car_class


@router.post("", response_model=CarClassSchema, status_code=status.HTTP_201_CREATED)
def create_car_class(
    car_class: CarClassCreate,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new car class"""
    db_class = CarClass(**car_class.dict())
    db.add(db_class)
    try:
        db.flush()
        record_entity_event(
            db,
            actor=current_user,
            action="CREATED",
            entity_type="car_class",
            entity_id=db_class.class_id,
            notes=f"Created class {db_class.class_name}.",
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Car class name must be unique",
        ) from exc
    db.refresh(db_class)
    return db_class


@router.put("/{class_id}", response_model=CarClassSchema)
def update_car_class(
    class_id: UUID,
    car_class: CarClassUpdate,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a car class"""
    db_class = db.query(CarClass).filter(CarClass.class_id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car class not found")
    
    # Apply only fields provided in the request payload.
    update_data = car_class.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_class, field, value)
    record_entity_event(
        db,
        actor=current_user,
        action="UPDATED",
        entity_type="car_class",
        entity_id=class_id,
        notes=f"Updated class fields: {', '.join(update_data.keys()) or 'none'}.",
    )
    
    db.commit()
    db.refresh(db_class)
    return db_class


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car_class(
    class_id: UUID,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a car class"""
    db_class = db.query(CarClass).filter(CarClass.class_id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car class not found")
    
    try:
        record_entity_event(
            db,
            actor=current_user,
            action="DELETED",
            entity_type="car_class",
            entity_id=class_id,
            notes=f"Deleted class {db_class.class_name}.",
        )
        db.delete(db_class)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Car class has models or reservations and cannot be deleted",
        ) from exc
    return None
