"""CRUD endpoints for physical cars (identified by VIN)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import Car
from app.schemas import Car as CarSchema, CarCreate, CarUpdate

router = APIRouter(prefix="/api/v1/cars", tags=["cars"])


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
def create_car(car: CarCreate, db: Session = Depends(get_db)):
    """Create a new car"""
    db_car = Car(**car.dict())
    db.add(db_car)
    db.commit()
    db.refresh(db_car)
    return db_car


@router.put("/{vin}", response_model=CarSchema)
def update_car(vin: str, car: CarUpdate, db: Session = Depends(get_db)):
    """Update a car"""
    db_car = db.query(Car).filter(Car.vin == vin).first()
    if not db_car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")
    
    # Apply only fields provided in the request payload.
    update_data = car.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_car, field, value)
    
    db.commit()
    db.refresh(db_car)
    return db_car


@router.delete("/{vin}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car(vin: str, db: Session = Depends(get_db)):
    """Delete a car"""
    db_car = db.query(Car).filter(Car.vin == vin).first()
    if not db_car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")
    
    db.delete(db_car)
    db.commit()
    return None
