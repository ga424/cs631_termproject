"""CRUD endpoints for reservation lifecycle records."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.models.models import Reservation
from app.schemas import Reservation as ReservationSchema, ReservationCreate, ReservationUpdate

router = APIRouter(prefix="/api/v1/reservations", tags=["reservations"])


@router.get("", response_model=list[ReservationSchema])
def list_reservations(db: Session = Depends(get_db)):
    """List all reservations"""
    reservations = db.query(Reservation).all()
    return reservations


@router.get("/{reservation_id}", response_model=ReservationSchema)
def get_reservation(reservation_id: UUID, db: Session = Depends(get_db)):
    """Get a specific reservation"""
    reservation = db.query(Reservation).filter(Reservation.reservation_id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    return reservation


@router.post("", response_model=ReservationSchema, status_code=status.HTTP_201_CREATED)
def create_reservation(reservation: ReservationCreate, db: Session = Depends(get_db)):
    """Create a new reservation"""
    db_reservation = Reservation(**reservation.dict())
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)
    return db_reservation


@router.put("/{reservation_id}", response_model=ReservationSchema)
def update_reservation(reservation_id: UUID, reservation: ReservationUpdate, db: Session = Depends(get_db)):
    """Update a reservation"""
    db_reservation = db.query(Reservation).filter(Reservation.reservation_id == reservation_id).first()
    if not db_reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    
    # Apply only fields provided in the request payload.
    update_data = reservation.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_reservation, field, value)
    
    db.commit()
    db.refresh(db_reservation)
    return db_reservation


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reservation(reservation_id: UUID, db: Session = Depends(get_db)):
    """Delete a reservation"""
    db_reservation = db.query(Reservation).filter(Reservation.reservation_id == reservation_id).first()
    if not db_reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    
    db.delete(db_reservation)
    db.commit()
    return None
