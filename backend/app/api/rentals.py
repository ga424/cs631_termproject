"""CRUD endpoints for rental agreements created from reservations."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.models.models import RentalAgreement
from app.schemas import RentalAgreement as RentalAgreementSchema, RentalAgreementCreate, RentalAgreementUpdate

router = APIRouter(prefix="/api/v1/rental-agreements", tags=["rental-agreements"])


@router.get("", response_model=list[RentalAgreementSchema])
def list_rental_agreements(db: Session = Depends(get_db)):
    """List all rental agreements"""
    agreements = db.query(RentalAgreement).all()
    return agreements


@router.get("/{contract_no}", response_model=RentalAgreementSchema)
def get_rental_agreement(contract_no: UUID, db: Session = Depends(get_db)):
    """Get a specific rental agreement"""
    agreement = db.query(RentalAgreement).filter(RentalAgreement.contract_no == contract_no).first()
    if not agreement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental agreement not found")
    return agreement


@router.post("", response_model=RentalAgreementSchema, status_code=status.HTTP_201_CREATED)
def create_rental_agreement(agreement: RentalAgreementCreate, db: Session = Depends(get_db)):
    """Create a new rental agreement"""
    db_agreement = RentalAgreement(**agreement.dict())
    db.add(db_agreement)
    db.commit()
    db.refresh(db_agreement)
    return db_agreement


@router.put("/{contract_no}", response_model=RentalAgreementSchema)
def update_rental_agreement(contract_no: UUID, agreement: RentalAgreementUpdate, db: Session = Depends(get_db)):
    """Update a rental agreement"""
    db_agreement = db.query(RentalAgreement).filter(RentalAgreement.contract_no == contract_no).first()
    if not db_agreement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental agreement not found")
    
    # Apply only fields provided in the request payload.
    update_data = agreement.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_agreement, field, value)
    
    db.commit()
    db.refresh(db_agreement)
    return db_agreement


@router.delete("/{contract_no}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rental_agreement(contract_no: UUID, db: Session = Depends(get_db)):
    """Delete a rental agreement"""
    db_agreement = db.query(RentalAgreement).filter(RentalAgreement.contract_no == contract_no).first()
    if not db_agreement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental agreement not found")
    
    db.delete(db_agreement)
    db.commit()
    return None

