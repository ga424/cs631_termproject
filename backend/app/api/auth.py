"""Authentication endpoints for staff and customer personas."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    StaffPrincipal,
    authenticate_staff,
    create_access_token,
    hash_password,
    normalize_username,
    verify_password,
)
from app.db.session import get_db
from app.models.models import Customer, CustomerAccount, RentalAgreement, Reservation
from app.schemas import CustomerDemoAccount, CustomerSignupRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    principal = authenticate_staff(credentials.username, credentials.password)
    if principal is None:
        username = normalize_username(credentials.username)
        account = (
            db.query(CustomerAccount)
            .filter(CustomerAccount.username == username, CustomerAccount.is_active.is_(True))
            .first()
        )
        if account and verify_password(credentials.password, account.password_hash):
            account.last_login_at = datetime.utcnow()
            db.commit()
            principal = StaffPrincipal(
                username=account.username,
                role="customer",
                customer_id=account.customer_id,
                account_id=account.account_id,
            )

    if not principal:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return TokenResponse(
        access_token=create_access_token(principal),
        username=principal.username,
        role=principal.role,
        customer_id=principal.customer_id,
        account_id=principal.account_id,
    )


@router.post("/customer-signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup_customer(payload: CustomerSignupRequest, db: Session = Depends(get_db)):
    username = normalize_username(payload.username)
    if db.query(CustomerAccount).filter(CustomerAccount.username == username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already taken")
    if db.query(Customer).filter(Customer.license_number == payload.license_number).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License number already belongs to a customer")

    customer_data = payload.model_dump(exclude={"username", "password"})
    customer = Customer(**customer_data)
    db.add(customer)
    db.flush()

    account = CustomerAccount(
        customer_id=customer.customer_id,
        username=username,
        password_hash=hash_password(payload.password),
        is_active=True,
        last_login_at=datetime.utcnow(),
    )
    db.add(account)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer account could not be created") from exc

    db.refresh(account)
    principal = StaffPrincipal(
        username=account.username,
        role="customer",
        customer_id=account.customer_id,
        account_id=account.account_id,
    )
    return TokenResponse(
        access_token=create_access_token(principal),
        username=principal.username,
        role=principal.role,
        customer_id=principal.customer_id,
        account_id=principal.account_id,
    )


@router.get("/demo-customers", response_model=list[CustomerDemoAccount])
def list_demo_customers(db: Session = Depends(get_db)):
    accounts = (
        db.query(CustomerAccount)
        .join(Customer, CustomerAccount.customer_id == Customer.customer_id)
        .filter(CustomerAccount.is_active.is_(True))
        .order_by(Customer.last_name.asc(), Customer.first_name.asc())
        .all()
    )

    demo_accounts: list[CustomerDemoAccount] = []
    for account in accounts:
        customer = account.customer
        reservations = db.query(Reservation).filter(Reservation.customer_id == customer.customer_id).all()
        active_rentals = (
            db.query(RentalAgreement)
            .join(Reservation, RentalAgreement.reservation_id == Reservation.reservation_id)
            .filter(Reservation.customer_id == customer.customer_id, RentalAgreement.rental_end_date_time.is_(None))
            .all()
        )
        active_reservations = [item for item in reservations if item.reservation_status == "ACTIVE"]
        trip_status = "Active rental" if active_rentals else "Upcoming reservation" if active_reservations else "Ready to book"
        demo_accounts.append(
            CustomerDemoAccount(
                customer_id=customer.customer_id,
                username=account.username,
                display_name=f"{customer.first_name} {customer.last_name}",
                home_branch=f"{customer.city}, {customer.state}",
                trip_status=trip_status,
                reservation_count=len(reservations),
                active_rental_count=len(active_rentals),
            )
        )

    return demo_accounts
