"""Customer-facing mobile portal endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.lifecycle import record_lifecycle_event
from app.core.security import StaffPrincipal, require_authenticated, require_customer, require_staff
from app.db.session import get_db
from app.models.models import CarClass, Customer, Location, RentalAgreement, RentalLifecycleEvent, Reservation
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

CATALOG_CAPACITY = {
    "15-Passenger Van": (15, 4, 1),
    "Compact": (5, 4, 1),
    "Economy": (5, 4, 1),
    "Full-Size": (5, 4, 2),
    "Full-Size Pickup": (5, 4, 5),
    "Intermediate": (5, 4, 1),
    "Intermediate Electric": (5, 4, 1),
    "Intermediate SUV": (5, 4, 1),
    "Luxury": (5, 4, 2),
    "Minivan": (7, 4, 2),
    "Passenger Van": (12, 4, 2),
    "Premium": (5, 4, 2),
    "Standard": (5, 4, 1),
    "Standard Elite Electric": (5, 4, 1),
    "Standard Elite SUV": (7, 4, 1),
    "Standard SUV": (5, 4, 1),
}


@router.get("/catalog", response_model=CustomerPortalCatalog)
def get_customer_catalog(db: Session = Depends(get_db)):
    car_classes = db.query(CarClass).all()
    options = []
    for car_class in car_classes:
        seats, doors, bags = CATALOG_CAPACITY.get(car_class.class_name, (5, 4, 1))
        similar_model = car_class.models[0].model_name if car_class.models else car_class.class_name
        options.append(
            CustomerPortalCatalog.CustomerPortalVehicleOption(
                class_id=car_class.class_id,
                class_name=car_class.class_name,
                similar_model=f"{similar_model} or Similar",
                seats=seats,
                doors=doors,
                bags=bags,
                daily_rate=float(car_class.daily_rate),
                weekly_rate=float(car_class.weekly_rate),
                rate_badge="Discounted Rate",
                upgrade_badge="Free Upgrade Eligible" if car_class.class_name in {"Full-Size", "Intermediate", "Standard"} else None,
            )
        )
    options.sort(key=lambda item: (item.daily_rate, item.class_name))

    return CustomerPortalCatalog(
        locations=db.query(Location).all(),
        car_classes=car_classes,
        vehicle_options=options,
        workflow=CUSTOMER_WORKFLOW,
    )


@router.post("/bookings", response_model=CustomerPortalBookingResponse, status_code=status.HTTP_201_CREATED)
def create_customer_booking(
    payload: CustomerPortalBookingRequest,
    current_user: StaffPrincipal = Depends(require_customer),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.customer_id == current_user.customer_id).first()
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    license_owner = (
        db.query(Customer)
        .filter(Customer.license_number == payload.license_number, Customer.customer_id != customer.customer_id)
        .first()
    )
    if license_owner is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License number already belongs to another customer")

    for field in [
        "first_name",
        "last_name",
        "street",
        "city",
        "state",
        "zip",
        "license_number",
        "license_state",
        "credit_card_type",
        "credit_card_number",
        "exp_month",
        "exp_year",
    ]:
        setattr(customer, field, getattr(payload, field))

    reservation = Reservation(
        customer_id=customer.customer_id,
        location_id=payload.location_id,
        return_location_id=payload.return_location_id or payload.location_id,
        class_id=payload.class_id,
        pickup_date_time=payload.pickup_date_time,
        return_date_time_requested=payload.return_date_time_requested,
        reservation_status="ACTIVE",
    )
    db.add(reservation)
    db.flush()
    record_lifecycle_event(
        db,
        reservation=reservation,
        event_type="RESERVED",
        actor=current_user,
        notes="Reservation created from customer portal.",
    )
    db.commit()
    db.refresh(customer)
    db.refresh(reservation)
    return CustomerPortalBookingResponse(customer_id=customer.customer_id, reservation=reservation)


def _build_customer_summary(customer_id: UUID, db: Session) -> CustomerPortalSummary:
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    reservations = (
        db.query(Reservation)
        .filter(Reservation.customer_id == customer_id)
        .order_by(Reservation.pickup_date_time.desc())
        .all()
    )
    rental_agreements = (
        db.query(RentalAgreement)
        .join(Reservation, RentalAgreement.reservation_id == Reservation.reservation_id)
        .filter(Reservation.customer_id == customer_id)
        .order_by(RentalAgreement.rental_start_date_time.desc())
        .all()
    )
    active_rentals = [rental for rental in rental_agreements if rental.rental_end_date_time is None]
    lifecycle_events = (
        db.query(RentalLifecycleEvent)
        .filter(RentalLifecycleEvent.customer_id == customer_id)
        .order_by(RentalLifecycleEvent.event_timestamp.asc(), RentalLifecycleEvent.created_at.asc())
        .all()
    )
    return CustomerPortalSummary(
        customer=customer,
        reservations=reservations,
        rental_agreements=rental_agreements,
        active_rentals=active_rentals,
        lifecycle_events=lifecycle_events,
        workflow=CUSTOMER_WORKFLOW,
    )


@router.get("/me", response_model=CustomerPortalSummary)
def get_my_customer_summary(
    current_user: StaffPrincipal = Depends(require_customer),
    db: Session = Depends(get_db),
):
    return _build_customer_summary(current_user.customer_id, db)


@router.get("/summary/{customer_id}", response_model=CustomerPortalSummary)
def get_customer_summary(
    customer_id: UUID,
    current_user: StaffPrincipal = Depends(require_authenticated),
    db: Session = Depends(get_db),
):
    if current_user.role == "customer" and current_user.customer_id != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access another customer account")
    if current_user.role != "customer":
        require_staff(current_user)
    return _build_customer_summary(customer_id, db)
