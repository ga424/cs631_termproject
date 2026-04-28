"""Pydantic schemas for request validation and response serialization."""

from typing import Optional, Literal
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, model_validator, field_validator, ConfigDict


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
    customer_id: Optional[UUID] = None
    account_id: Optional[UUID] = None


class CustomerDemoAccount(BaseModel):
    customer_id: UUID
    username: str
    display_name: str
    home_branch: Optional[str] = None
    is_active: bool
    trip_status: str
    reservation_count: int
    active_rental_count: int


# Location schemas
class LocationBase(BaseModel):
    street: str
    city: str
    state: str = Field(min_length=2, max_length=2)
    zip: str


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = Field(default=None, min_length=2, max_length=2)
    zip: Optional[str] = None


class Location(LocationBase):
    location_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Customer schemas
class CustomerBase(BaseModel):
    first_name: str
    last_name: str
    street: str
    city: str
    state: str = Field(min_length=2, max_length=2)
    zip: str
    license_number: str
    license_state: str = Field(min_length=2, max_length=2)
    credit_card_type: str
    credit_card_number: str
    exp_month: int = Field(ge=1, le=12)
    exp_year: int


class CustomerCreate(CustomerBase):
    pass


class CustomerSignupRequest(CustomerBase):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8, max_length=128)


class CustomerAccountAdminBase(BaseModel):
    customer_id: UUID
    username: str
    is_active: bool
    last_login_at: Optional[datetime] = None


class CustomerAccountAdmin(CustomerAccountAdminBase):
    account_id: UUID
    first_name: str
    last_name: str
    city: str
    state: str
    created_at: datetime
    updated_at: datetime


class CustomerAccountAdminCreate(CustomerSignupRequest):
    is_active: bool = True


class CustomerAccountAdminUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=80)
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    is_active: Optional[bool] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = Field(default=None, min_length=2, max_length=2)
    zip: Optional[str] = None
    license_number: Optional[str] = None
    license_state: Optional[str] = Field(default=None, min_length=2, max_length=2)
    credit_card_type: Optional[str] = None
    credit_card_number: Optional[str] = None
    exp_month: Optional[int] = Field(default=None, ge=1, le=12)
    exp_year: Optional[int] = None


class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = Field(default=None, min_length=2, max_length=2)
    zip: Optional[str] = None
    license_number: Optional[str] = None
    license_state: Optional[str] = Field(default=None, min_length=2, max_length=2)
    credit_card_type: Optional[str] = None
    credit_card_number: Optional[str] = None
    exp_month: Optional[int] = Field(default=None, ge=1, le=12)
    exp_year: Optional[int] = None


class Customer(CustomerBase):
    customer_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# CarClass schemas
class CarClassBase(BaseModel):
    class_name: str
    daily_rate: float = Field(gt=0)
    weekly_rate: float = Field(gt=0)


class CarClassCreate(CarClassBase):
    pass


class CarClassUpdate(BaseModel):
    class_name: Optional[str] = None
    daily_rate: Optional[float] = Field(default=None, gt=0)
    weekly_rate: Optional[float] = Field(default=None, gt=0)


class CarClass(CarClassBase):
    class_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Model schemas
class ModelBase(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    model_name: str
    make_name: str
    model_year: int = Field(ge=1980, le=2100)
    class_id: UUID


class ModelCreate(ModelBase):
    pass


class ModelUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    make_name: Optional[str] = None
    model_year: Optional[int] = Field(default=None, ge=1980, le=2100)
    class_id: Optional[UUID] = None


class Model(ModelBase):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
    
    created_at: datetime
    updated_at: datetime


# Car schemas
class CarBase(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    vin: str = Field(min_length=17, max_length=17)
    current_odometer_reading: int = Field(ge=0)
    location_id: UUID
    model_name: str


class CarCreate(CarBase):
    pass


class CarUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    current_odometer_reading: Optional[int] = Field(default=None, ge=0)
    location_id: Optional[UUID] = None
    model_name: Optional[str] = None


class Car(CarBase):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
    
    created_at: datetime
    updated_at: datetime


# Reservation schemas
ReservationStatus = Literal["ACTIVE", "CANCELED", "FULFILLED", "COMPLETED", "NO_SHOW"]


class ReservationBase(BaseModel):
    customer_id: UUID
    location_id: UUID
    return_location_id: Optional[UUID] = None
    class_id: UUID
    pickup_date_time: datetime
    return_date_time_requested: datetime
    reservation_status: ReservationStatus = "ACTIVE"

    @model_validator(mode="after")
    def validate_dates(self):
        if self.return_date_time_requested <= self.pickup_date_time:
            raise ValueError("return_date_time_requested must be after pickup_date_time")
        return self


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(BaseModel):
    customer_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    return_location_id: Optional[UUID] = None
    class_id: Optional[UUID] = None
    pickup_date_time: Optional[datetime] = None
    return_date_time_requested: Optional[datetime] = None
    reservation_status: Optional[ReservationStatus] = None

    @model_validator(mode="after")
    def validate_dates_when_both_provided(self):
        if (
            self.pickup_date_time
            and self.return_date_time_requested
            and self.return_date_time_requested <= self.pickup_date_time
        ):
            raise ValueError("return_date_time_requested must be after pickup_date_time")
        return self


class Reservation(ReservationBase):
    reservation_id: UUID
    reservation_status: str
    created_at: datetime
    updated_at: datetime

    @field_validator("reservation_status", mode="before")
    @classmethod
    def normalize_legacy_statuses(cls, value: str) -> str:
        if not isinstance(value, str):
            return value

        status = value.strip().upper()
        # Backward compatibility with older seeded values.
        if status == "CONFIRMED":
            return "FULFILLED"
        if status == "PENDING":
            return "ACTIVE"
        return status

    class Config:
        from_attributes = True


# RentalAgreement schemas
class RentalAgreementBase(BaseModel):
    reservation_id: UUID
    vin: str
    rental_start_date_time: datetime
    start_odometer_reading: int = Field(ge=0)


class RentalAgreementCreate(BaseModel):
    reservation_id: UUID
    vin: str
    rental_start_date_time: datetime
    start_odometer_reading: Optional[int] = Field(default=None, ge=0)


class RentalAgreementUpdate(BaseModel):
    rental_end_date_time: Optional[datetime] = None
    end_odometer_reading: Optional[int] = Field(default=None, ge=0)
    actual_cost: Optional[float] = Field(default=None, ge=0)


class RentalAgreement(RentalAgreementBase):
    contract_no: UUID
    rental_end_date_time: Optional[datetime] = None
    end_odometer_reading: Optional[int] = None
    actual_cost: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def validate_end_state(self):
        if self.rental_end_date_time and self.rental_end_date_time < self.rental_start_date_time:
            raise ValueError("rental_end_date_time must be after rental_start_date_time")
        if self.end_odometer_reading is not None and self.end_odometer_reading < self.start_odometer_reading:
            raise ValueError("end_odometer_reading must be >= start_odometer_reading")
        return self

    class Config:
        from_attributes = True


class RentalLifecycleEvent(BaseModel):
    event_id: UUID
    reservation_id: UUID
    contract_no: Optional[UUID] = None
    customer_id: UUID
    event_type: Literal["RESERVED", "CANCELED", "NO_SHOW", "PICKED_UP", "RENTAL_OPENED", "RETURNED", "BILLED"]
    actor_role: str
    actor_username: str
    event_timestamp: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class EntityAuditEvent(BaseModel):
    event_id: UUID
    entity_type: str
    entity_id: str
    action: Literal["CREATED", "UPDATED", "DELETED"]
    actor_role: str
    actor_username: str
    event_timestamp: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# Dashboard schemas
class DashboardTotals(BaseModel):
    total_cars: int
    available_cars: int
    rented_cars: int
    reserved_requests: int


class DashboardRateSummary(BaseModel):
    class_id: UUID
    class_name: str
    daily_rate: float
    weekly_rate: float
    model_count: int
    vehicle_count: int


class DashboardLocationSummary(BaseModel):
    location_id: UUID
    location_name: str
    total_cars: int
    available_cars: int
    rented_cars: int
    reserved_requests: int
    utilization_percent: float


class DashboardFleetItem(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    vin: str
    model_name: str
    location_id: UUID
    location_name: str
    current_odometer_reading: int
    status: Literal["AVAILABLE", "RENTED"]
    active_contract_no: Optional[UUID] = None


class DashboardActiveRental(BaseModel):
    contract_no: UUID
    vin: str
    location_name: str
    rental_start_date_time: datetime
    return_date_time_requested: datetime
    is_overdue: bool


class DashboardUpcomingReservation(BaseModel):
    reservation_id: UUID
    location_name: str
    pickup_date_time: datetime
    return_date_time_requested: datetime
    reservation_status: str


class DashboardOverview(BaseModel):
    generated_at: datetime
    totals: DashboardTotals
    rates: list[DashboardRateSummary]
    locations: list[DashboardLocationSummary]
    fleet: list[DashboardFleetItem]
    active_rentals: list[DashboardActiveRental]
    upcoming_pickups: list[DashboardUpcomingReservation]


class WorkflowStage(BaseModel):
    stage_id: str
    label: str
    owner_role: str
    description: str


class CustomerPortalCatalog(BaseModel):
    class CustomerPortalVehicleOption(BaseModel):
        class_id: UUID
        class_name: str
        similar_model: str
        seats: int
        doors: int
        bags: int
        daily_rate: float
        weekly_rate: float
        rate_badge: str
        upgrade_badge: Optional[str] = None
        available_count: int
        is_available: bool
        available_location_ids: list[UUID] = []

    locations: list[Location]
    car_classes: list[CarClass]
    vehicle_options: list[CustomerPortalVehicleOption] = []
    workflow: list[WorkflowStage]


class CustomerPortalBookingRequest(BaseModel):
    first_name: str
    last_name: str
    street: str
    city: str
    state: str = Field(min_length=2, max_length=2)
    zip: str
    license_number: str
    license_state: str = Field(min_length=2, max_length=2)
    credit_card_type: str
    credit_card_number: str
    exp_month: int = Field(ge=1, le=12)
    exp_year: int
    location_id: UUID
    return_location_id: Optional[UUID] = None
    class_id: UUID
    pickup_date_time: datetime
    return_date_time_requested: datetime

    @model_validator(mode="after")
    def validate_dates(self):
        if self.return_date_time_requested <= self.pickup_date_time:
            raise ValueError("return_date_time_requested must be after pickup_date_time")
        return self


class CustomerPortalBookingResponse(BaseModel):
    customer_id: UUID
    reservation: Reservation


class CustomerPortalSummary(BaseModel):
    customer: Customer
    reservations: list[Reservation]
    rental_agreements: list[RentalAgreement]
    active_rentals: list[RentalAgreement]
    lifecycle_events: list[RentalLifecycleEvent]
    workflow: list[WorkflowStage]
