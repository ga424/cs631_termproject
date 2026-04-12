"""CRUD endpoints for car-class pricing tiers."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.models.models import CarClass
from app.schemas import CarClass as CarClassSchema, CarClassCreate, CarClassUpdate

router = APIRouter(prefix="/api/v1/car-classes", tags=["car-classes"])


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
def create_car_class(car_class: CarClassCreate, db: Session = Depends(get_db)):
    """Create a new car class"""
    db_class = CarClass(**car_class.dict())
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class


@router.put("/{class_id}", response_model=CarClassSchema)
def update_car_class(class_id: UUID, car_class: CarClassUpdate, db: Session = Depends(get_db)):
    """Update a car class"""
    db_class = db.query(CarClass).filter(CarClass.class_id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car class not found")
    
    # Apply only fields provided in the request payload.
    update_data = car_class.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_class, field, value)
    
    db.commit()
    db.refresh(db_class)
    return db_class


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car_class(class_id: UUID, db: Session = Depends(get_db)):
    """Delete a car class"""
    db_class = db.query(CarClass).filter(CarClass.class_id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car class not found")
    
    db.delete(db_class)
    db.commit()
    return None
