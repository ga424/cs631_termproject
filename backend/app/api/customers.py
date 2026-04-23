"""CRUD endpoints for customer records."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.security import require_staff
from app.db.session import get_db
from app.models.models import Customer
from app.schemas import Customer as CustomerSchema, CustomerCreate, CustomerUpdate

router = APIRouter(prefix="/api/v1/customers", tags=["customers"], dependencies=[Depends(require_staff)])


@router.get("", response_model=list[CustomerSchema])
def list_customers(db: Session = Depends(get_db)):
    """List all customers"""
    customers = db.query(Customer).all()
    return customers


@router.get("/{customer_id}", response_model=CustomerSchema)
def get_customer(customer_id: UUID, db: Session = Depends(get_db)):
    """Get a specific customer"""
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.post("", response_model=CustomerSchema, status_code=status.HTTP_201_CREATED)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer"""
    db_customer = Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


@router.put("/{customer_id}", response_model=CustomerSchema)
def update_customer(customer_id: UUID, customer: CustomerUpdate, db: Session = Depends(get_db)):
    """Update a customer"""
    db_customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    # Apply only fields provided in the request payload.
    update_data = customer.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_customer, field, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: UUID, db: Session = Depends(get_db)):
    """Delete a customer"""
    db_customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    try:
        db.delete(db_customer)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer has reservations and cannot be deleted",
        ) from exc
    return None
