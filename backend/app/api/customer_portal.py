"""Customer-facing mobile portal endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.security import require_authenticated
from app.db.session import get_db
from app.models.models import CarClass, Customer, Location, RentalAgreement, Reservation
from app.schemas import (
    CustomerPortalBookingRequest,
    CustomerPortalBookingResponse,
    CustomerPortalCatalog,
    CustomerPortalSummary,
    WorkflowStage,
)

router = APIRouter(
    prefix="/api/v1/customer-portal",
    tags=["customer-portal"],
    dependencies=[Depends(require_authenticated)],
)

CUSTOMER_WORKFLOW = [
    WorkflowStage(
        stage_id="book",
        label="Book Reservation",
        owner_role="customer",
        description="Select a branch, dates, and vehicle class for the trip.",
    ),
    WorkflowStage(
        stage_id="confirm",
        label="Reservation Confirmed",
        owner_role="system",
        description="The reservation is active and ready for pickup preparation.",
    ),
    WorkflowStage(
        stage_id="pickup",
        label="Agent Pickup",
        owner_role="agent",
        description="An agent verifies the customer, assigns a matching car, and opens the rental.",
    ),
    WorkflowStage(
        stage_id="active",
        label="Rental Active",
        owner_role="customer",
        description="The customer is currently using the assigned vehicle.",
    ),
    WorkflowStage(
        stage_id="return",
        label="Return And Billing",
        owner_role="agent",
        description="The vehicle is returned, mileage is closed out, and billing is finalized.",
    ),
]


@router.get("/catalog", response_model=CustomerPortalCatalog)
def get_customer_catalog(db: Session = Depends(get_db)):
    return CustomerPortalCatalog(
        locations=db.query(Location).all(),
        car_classes=db.query(CarClass).all(),
        workflow=CUSTOMER_WORKFLOW,
    )


@router.post("/bookings", response_model=CustomerPortalBookingResponse, status_code=status.HTTP_201_CREATED)
def create_customer_booking(payload: CustomerPortalBookingRequest, db: Session = Depends(get_db)):
    customer = (
        db.query(Customer)
        .filter(Customer.license_number == payload.license_number)
        .first()
    )
    if customer is None:
        customer = Customer(
            first_name=payload.first_name,
            last_name=payload.last_name,
            street=payload.street,
            city=payload.city,
            state=payload.state,
            zip=payload.zip,
            license_number=payload.license_number,
            license_state=payload.license_state,
            credit_card_type=payload.credit_card_type,
            credit_card_number=payload.credit_card_number,
            exp_month=payload.exp_month,
            exp_year=payload.exp_year,
        )
        db.add(customer)
        db.flush()

    reservation = Reservation(
        customer_id=customer.customer_id,
        location_id=payload.location_id,
        class_id=payload.class_id,
        pickup_date_time=payload.pickup_date_time,
        return_date_time_requested=payload.return_date_time_requested,
        reservation_status="ACTIVE",
    )
    db.add(reservation)
    db.commit()
    db.refresh(customer)
    db.refresh(reservation)
    return CustomerPortalBookingResponse(customer_id=customer.customer_id, reservation=reservation)


@router.get("/summary/{customer_id}", response_model=CustomerPortalSummary)
def get_customer_summary(customer_id: UUID, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    reservations = (
        db.query(Reservation)
        .filter(Reservation.customer_id == customer_id)
        .order_by(Reservation.pickup_date_time.desc())
        .all()
    )
    active_rentals = (
        db.query(RentalAgreement)
        .join(Reservation, RentalAgreement.reservation_id == Reservation.reservation_id)
        .filter(Reservation.customer_id == customer_id, RentalAgreement.rental_end_date_time.is_(None))
        .all()
    )
    return CustomerPortalSummary(
        customer=customer,
        reservations=reservations,
        active_rentals=active_rentals,
        workflow=CUSTOMER_WORKFLOW,
    )
