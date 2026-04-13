"""Pydantic schemas for request validation and response serialization."""

from typing import Optional, Literal
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, model_validator


# Location schemas
class LocationBase(BaseModel):
    street: str
    city: str
    state: str
    zip: str


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
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
    state: str
    zip: str
    license_number: str
    license_state: str
    credit_card_type: str
    credit_card_number: str
    exp_month: int = Field(ge=1, le=12)
    exp_year: int


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    license_number: Optional[str] = None
    license_state: Optional[str] = None
    credit_card_type: Optional[str] = None
    credit_card_number: Optional[str] = None
    exp_month: Optional[int] = None
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
    daily_rate: Optional[float] = None
    weekly_rate: Optional[float] = None


class CarClass(CarClassBase):
    class_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Model schemas
class ModelBase(BaseModel):
    model_name: str
    make_name: str
    model_year: int
    class_id: UUID


class ModelCreate(ModelBase):
    pass


class ModelUpdate(BaseModel):
    make_name: Optional[str] = None
    model_year: Optional[int] = None
    class_id: Optional[UUID] = None


class Model(ModelBase):
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Car schemas
class CarBase(BaseModel):
    vin: str = Field(min_length=17, max_length=17)
    current_odometer_reading: int = Field(ge=0)
    location_id: UUID
    model_name: str


class CarCreate(CarBase):
    pass


class CarUpdate(BaseModel):
    current_odometer_reading: Optional[int] = None
    location_id: Optional[UUID] = None
    model_name: Optional[str] = None


class Car(CarBase):
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Reservation schemas
ReservationStatus = Literal["ACTIVE", "CANCELED", "COMPLETED", "NO_SHOW"]


class ReservationBase(BaseModel):
    customer_id: UUID
    location_id: UUID
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
    class_id: Optional[UUID] = None
    pickup_date_time: Optional[datetime] = None
    return_date_time_requested: Optional[datetime] = None
    reservation_status: Optional[ReservationStatus] = None


class Reservation(ReservationBase):
    reservation_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# RentalAgreement schemas
class RentalAgreementBase(BaseModel):
    reservation_id: UUID
    vin: str
    rental_start_date_time: datetime
    start_odometer_reading: int = Field(ge=0)


class RentalAgreementCreate(RentalAgreementBase):
    pass


class RentalAgreementUpdate(BaseModel):
    rental_end_date_time: Optional[datetime] = None
    end_odometer_reading: Optional[int] = Field(default=None, ge=0)
    actual_cost: Optional[float] = None


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
