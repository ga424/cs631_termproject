from sqlalchemy import Column, String, Integer, DateTime, Numeric, ForeignKey, CheckConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from uuid import uuid4
from datetime import datetime
from app.db.base import Base
import uuid as uuid_module


class Location(Base):
    __tablename__ = "location"

    location_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    street = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(2), nullable=False)
    zip = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    cars = relationship("Car", back_populates="location")
    reservations = relationship("Reservation", back_populates="location")

    def __repr__(self):
        return f"<Location(id={self.location_id}, city={self.city}, state={self.state})>"


class Customer(Base):
    __tablename__ = "customer"

    customer_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    street = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(2), nullable=False)
    zip = Column(String(10), nullable=False)
    license_number = Column(String(50), unique=True, nullable=False, index=True)
    license_state = Column(String(2), nullable=False)
    credit_card_type = Column(String(50), nullable=False)
    credit_card_number = Column(String(20), nullable=False)
    exp_month = Column(Integer, nullable=False)
    exp_year = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    reservations = relationship("Reservation", back_populates="customer")

    def __repr__(self):
        return f"<Customer(id={self.customer_id}, name={self.first_name} {self.last_name})>"


class CarClass(Base):
    __tablename__ = "car_class"

    class_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    class_name = Column(String(100), unique=True, nullable=False)
    daily_rate = Column(Numeric(10, 2), nullable=False)
    weekly_rate = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    models = relationship("Model", back_populates="car_class")
    reservations = relationship("Reservation", back_populates="car_class")

    def __repr__(self):
        return f"<CarClass(id={self.class_id}, name={self.class_name})>"


class Model(Base):
    __tablename__ = "model"

    model_name = Column(String(255), primary_key=True)
    make_name = Column(String(100), nullable=False)
    model_year = Column(Integer, nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("car_class.class_id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    car_class = relationship("CarClass", back_populates="models")
    cars = relationship("Car", back_populates="model")

    def __repr__(self):
        return f"<Model(name={self.model_name}, make={self.make_name}, year={self.model_year})>"


class Car(Base):
    __tablename__ = "car"

    vin = Column(String(50), primary_key=True)
    current_odometer_reading = Column(Integer, nullable=False)
    location_id = Column(UUID(as_uuid=True), ForeignKey("location.location_id"), nullable=False, index=True)
    model_name = Column(String(255), ForeignKey("model.model_name"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    location = relationship("Location", back_populates="cars")
    model = relationship("Model", back_populates="cars")
    rental_agreements = relationship("RentalAgreement", back_populates="car")

    def __repr__(self):
        return f"<Car(vin={self.vin}, model={self.model_name}, location={self.location_id})>"


class Reservation(Base):
    __tablename__ = "reservation"

    reservation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customer.customer_id"), nullable=False, index=True)
    location_id = Column(UUID(as_uuid=True), ForeignKey("location.location_id"), nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey("car_class.class_id"), nullable=False, index=True)
    pickup_date_time = Column(DateTime, nullable=False)
    return_date_time_requested = Column(DateTime, nullable=False)
    reservation_status = Column(String(50), default="ACTIVE", nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="reservations")
    location = relationship("Location", back_populates="reservations")
    car_class = relationship("CarClass", back_populates="reservations")
    rental_agreement = relationship("RentalAgreement", back_populates="reservation", uselist=False)

    def __repr__(self):
        return f"<Reservation(id={self.reservation_id}, customer={self.customer_id}, status={self.reservation_status})>"


class RentalAgreement(Base):
    __tablename__ = "rental_agreement"

    contract_no = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    reservation_id = Column(UUID(as_uuid=True), ForeignKey("reservation.reservation_id"), nullable=False, unique=True, index=True)
    vin = Column(String(50), ForeignKey("car.vin"), nullable=False, index=True)
    rental_start_date_time = Column(DateTime, nullable=False)
    rental_end_date_time = Column(DateTime)
    start_odometer_reading = Column(Integer, nullable=False)
    end_odometer_reading = Column(Integer)
    actual_cost = Column(Numeric(10, 2))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    reservation = relationship("Reservation", back_populates="rental_agreement")
    car = relationship("Car", back_populates="rental_agreements")

    def __repr__(self):
        return f"<RentalAgreement(id={self.contract_no}, car={self.vin}, status=active)>"
