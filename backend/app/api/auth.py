"""Authentication endpoints for staff and customer personas."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.entity_audit import record_entity_event
from app.core.security import (
    StaffPrincipal,
    authenticate_staff,
    create_access_token,
    hash_password,
    is_staff_username,
    normalize_username,
    require_admin,
    verify_password,
)
from app.db.session import get_db
from app.models.models import Customer, CustomerAccount, RentalAgreement, Reservation
from app.schemas import (
    CustomerAccountAdmin,
    CustomerAccountAdminCreate,
    CustomerAccountAdminUpdate,
    CustomerDemoAccount,
    CustomerSignupRequest,
    LoginRequest,
    TokenResponse,
)

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
    if is_staff_username(username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is reserved for staff login")
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
        fulfilled_reservations = [item for item in reservations if item.reservation_status in {"FULFILLED", "COMPLETED"}]
        trip_status = (
            "Inactive account"
            if not account.is_active
            else "Active rental"
            if active_rentals
            else "Returned / billed"
            if fulfilled_reservations
            else "Upcoming reservation"
            if active_reservations
            else "Ready to book"
        )
        demo_accounts.append(
            CustomerDemoAccount(
                customer_id=customer.customer_id,
                username=account.username,
                display_name=f"{customer.first_name} {customer.last_name}",
                home_branch=f"{customer.city}, {customer.state}",
                is_active=account.is_active,
                trip_status=trip_status,
                reservation_count=len(reservations),
                active_rental_count=len(active_rentals),
            )
        )

    return demo_accounts


@router.get("/customer-accounts", response_model=list[CustomerAccountAdmin], dependencies=[Depends(require_admin)])
def list_customer_accounts(db: Session = Depends(get_db)):
    accounts = (
        db.query(CustomerAccount)
        .join(Customer, CustomerAccount.customer_id == Customer.customer_id)
        .order_by(Customer.last_name.asc(), Customer.first_name.asc())
        .all()
    )
    return [
        CustomerAccountAdmin(
            account_id=account.account_id,
            customer_id=account.customer_id,
            username=account.username,
            is_active=account.is_active,
            last_login_at=account.last_login_at,
            first_name=account.customer.first_name,
            last_name=account.customer.last_name,
            city=account.customer.city,
            state=account.customer.state,
            created_at=account.created_at,
            updated_at=account.updated_at,
        )
        for account in accounts
    ]


@router.post("/customer-accounts", response_model=CustomerAccountAdmin, status_code=status.HTTP_201_CREATED)
def create_customer_account(
    payload: CustomerAccountAdminCreate,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    username = normalize_username(payload.username)
    if is_staff_username(username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is reserved for staff login")
    if db.query(CustomerAccount).filter(CustomerAccount.username == username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already taken")
    if db.query(Customer).filter(Customer.license_number == payload.license_number).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License number already belongs to a customer")

    customer_data = payload.model_dump(exclude={"username", "password", "is_active"})
    customer = Customer(**customer_data)
    db.add(customer)
    db.flush()

    account = CustomerAccount(
        customer_id=customer.customer_id,
        username=username,
        password_hash=hash_password(payload.password),
        is_active=payload.is_active,
        last_login_at=None,
    )
    db.add(account)

    try:
        db.flush()
        record_entity_event(
            db,
            actor=current_user,
            action="CREATED",
            entity_type="customer_account",
            entity_id=account.account_id,
            notes=f"Created customer account {account.username}.",
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer account could not be created") from exc

    db.refresh(account)
    db.refresh(customer)
    return CustomerAccountAdmin(
        account_id=account.account_id,
        customer_id=account.customer_id,
        username=account.username,
        is_active=account.is_active,
        last_login_at=account.last_login_at,
        first_name=customer.first_name,
        last_name=customer.last_name,
        city=customer.city,
        state=customer.state,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.put("/customer-accounts/{account_id}", response_model=CustomerAccountAdmin)
def update_customer_account(
    account_id: UUID,
    payload: CustomerAccountAdminUpdate,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    account = db.query(CustomerAccount).filter(CustomerAccount.account_id == account_id).first()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer account not found")

    customer = db.query(Customer).filter(Customer.customer_id == account.customer_id).first()
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "username" in update_data:
        username = normalize_username(update_data["username"])
        if is_staff_username(username):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is reserved for staff login")
        existing = (
            db.query(CustomerAccount)
            .filter(CustomerAccount.username == username, CustomerAccount.account_id != account.account_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already taken")
        account.username = username

    if "password" in update_data:
        account.password_hash = hash_password(update_data["password"])

    if "is_active" in update_data:
        account.is_active = update_data["is_active"]

    customer_fields = {
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
    }
    for field in customer_fields:
        if field in update_data:
            setattr(customer, field, update_data[field])

    if "license_number" in update_data:
        existing_license = (
            db.query(Customer)
            .filter(Customer.license_number == customer.license_number, Customer.customer_id != customer.customer_id)
            .first()
        )
        if existing_license:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License number already belongs to a customer")

    record_entity_event(
        db,
        actor=current_user,
        action="UPDATED",
        entity_type="customer_account",
        entity_id=account_id,
        notes=f"Updated customer account fields: {', '.join(update_data.keys()) or 'none'}.",
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer account could not be updated") from exc

    db.refresh(account)
    db.refresh(customer)
    return CustomerAccountAdmin(
        account_id=account.account_id,
        customer_id=account.customer_id,
        username=account.username,
        is_active=account.is_active,
        last_login_at=account.last_login_at,
        first_name=customer.first_name,
        last_name=customer.last_name,
        city=customer.city,
        state=customer.state,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.delete("/customer-accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer_account(
    account_id: UUID,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    account = db.query(CustomerAccount).filter(CustomerAccount.account_id == account_id).first()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer account not found")

    record_entity_event(
        db,
        actor=current_user,
        action="DELETED",
        entity_type="customer_account",
        entity_id=account_id,
        notes=f"Deleted customer account {account.username}.",
    )
    db.delete(account)
    db.commit()
    return None
