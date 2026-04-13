"""
Sample data seeding script for rental car management system.
Run this to populate the database with test data for development and testing.
"""

import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from uuid import uuid4

# Add parent directory to path
sys.path.insert(0, '/app')

from app.core.config import settings
from app.db.base import Base
from app.models.models import (
    Location, Customer, CarClass, Model, Car, 
    Reservation, RentalAgreement
)


def create_engine_and_session():
    """Create database engine and session"""
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine, SessionLocal


def seed_database():
    """Populate database with sample data"""
    engine, SessionLocal = create_engine_and_session()
    session = SessionLocal()
    
    try:
        # Check if data already exists to avoid duplicates
        existing_locations = session.query(Location).count()
        if existing_locations > 0:
            print("Sample data already exists in database. Skipping seed.")
            return
        
        print("Creating sample data...")
        
        # Create Locations
        print("  - Adding locations...")
        locations = [
            Location(street="123 Main St", city="New York", state="NY", zip="10001"),
            Location(street="456 Oak Ave", city="Los Angeles", state="CA", zip="90001"),
            Location(street="789 Elm Blvd", city="Chicago", state="IL", zip="60601"),
            Location(street="321 Pine Rd", city="Houston", state="TX", zip="77001"),
            Location(street="654 Maple Dr", city="Phoenix", state="AZ", zip="85001"),
        ]
        session.add_all(locations)
        session.commit()
        
        # Create Car Classes
        print("  - Adding car classes...")
        car_classes = [
            CarClass(class_name="Economy", daily_rate=35.00, weekly_rate=200.00),
            CarClass(class_name="Compact", daily_rate=45.00, weekly_rate=250.00),
            CarClass(class_name="Mid-size", daily_rate=55.00, weekly_rate=300.00),
            CarClass(class_name="Full-size", daily_rate=75.00, weekly_rate=400.00),
            CarClass(class_name="SUV", daily_rate=95.00, weekly_rate=500.00),
            CarClass(class_name="Luxury", daily_rate=150.00, weekly_rate=800.00),
        ]
        session.add_all(car_classes)
        session.commit()
        
        # Create Models
        print("  - Adding vehicle models...")
        models_data = [
            Model(model_name="Toyota Corolla", make_name="Toyota", model_year=2023, 
                  class_id=car_classes[0].class_id),  # Economy
            Model(model_name="Honda Civic", make_name="Honda", model_year=2023, 
                  class_id=car_classes[1].class_id),  # Compact
            Model(model_name="Ford Fusion", make_name="Ford", model_year=2023, 
                  class_id=car_classes[2].class_id),  # Mid-size
            Model(model_name="Chevrolet Impala", make_name="Chevrolet", model_year=2023, 
                  class_id=car_classes[3].class_id),  # Full-size
            Model(model_name="Ford Explorer", make_name="Ford", model_year=2023, 
                  class_id=car_classes[4].class_id),  # SUV
            Model(model_name="BMW 7 Series", make_name="BMW", model_year=2023, 
                  class_id=car_classes[5].class_id),  # Luxury
            Model(model_name="Toyota Prius", make_name="Toyota", model_year=2023, 
                  class_id=car_classes[0].class_id),  # Economy
            Model(model_name="Honda CR-V", make_name="Honda", model_year=2023, 
                  class_id=car_classes[4].class_id),  # SUV
        ]
        session.add_all(models_data)
        session.commit()
        
        # Create Cars
        print("  - Adding vehicles...")
        cars = [
            Car(vin="WBADT43452G942186", current_odometer_reading=15000, 
                location_id=locations[0].location_id, model_name="Toyota Corolla"),
            Car(vin="WBADT43452G942187", current_odometer_reading=22000, 
                location_id=locations[0].location_id, model_name="Honda Civic"),
            Car(vin="WBADT43452G942188", current_odometer_reading=8500, 
                location_id=locations[1].location_id, model_name="Ford Fusion"),
            Car(vin="WBADT43452G942189", current_odometer_reading=31000, 
                location_id=locations[1].location_id, model_name="Chevrolet Impala"),
            Car(vin="WBADT43452G942190", current_odometer_reading=12000, 
                location_id=locations[2].location_id, model_name="Ford Explorer"),
            Car(vin="WBADT43452G942191", current_odometer_reading=5000, 
                location_id=locations[2].location_id, model_name="BMW 7 Series"),
            Car(vin="WBADT43452G942192", current_odometer_reading=18000, 
                location_id=locations[3].location_id, model_name="Toyota Prius"),
            Car(vin="WBADT43452G942193", current_odometer_reading=9500, 
                location_id=locations[3].location_id, model_name="Honda CR-V"),
            Car(vin="WBADT43452G942194", current_odometer_reading=25000, 
                location_id=locations[4].location_id, model_name="Toyota Corolla"),
            Car(vin="WBADT43452G942195", current_odometer_reading=11000, 
                location_id=locations[4].location_id, model_name="Ford Explorer"),
        ]
        session.add_all(cars)
        session.commit()
        
        # Create Customers
        print("  - Adding customers...")
        customers = [
            Customer(
                first_name="John", last_name="Doe",
                street="100 Oak Lane", city="New York", state="NY", zip="10002",
                license_number="D1234567", license_state="NY",
                credit_card_type="Visa", credit_card_number="4111111111111111",
                exp_month=12, exp_year=2026
            ),
            Customer(
                first_name="Jane", last_name="Smith",
                street="200 Pine Street", city="Los Angeles", state="CA", zip="90002",
                license_number="D1234568", license_state="CA",
                credit_card_type="MasterCard", credit_card_number="5555555555554444",
                exp_month=6, exp_year=2025
            ),
            Customer(
                first_name="Robert", last_name="Johnson",
                street="300 Main Avenue", city="Chicago", state="IL", zip="60602",
                license_number="D1234569", license_state="IL",
                credit_card_type="American Express", credit_card_number="378282246310005",
                exp_month=3, exp_year=2027
            ),
            Customer(
                first_name="Emily", last_name="Williams",
                street="400 Elm Drive", city="Houston", state="TX", zip="77002",
                license_number="D1234570", license_state="TX",
                credit_card_type="Visa", credit_card_number="4012888888881881",
                exp_month=9, exp_year=2024
            ),
            Customer(
                first_name="Michael", last_name="Brown",
                street="500 Maple Court", city="Phoenix", state="AZ", zip="85002",
                license_number="D1234571", license_state="AZ",
                credit_card_type="Discover", credit_card_number="6011111111111117",
                exp_month=1, exp_year=2026
            ),
        ]
        session.add_all(customers)
        session.commit()
        
        # Create Reservations
        print("  - Adding reservations...")
        now = datetime.utcnow()
        reservations = [
            Reservation(
                customer_id=customers[0].customer_id,
                location_id=locations[0].location_id,
                class_id=car_classes[0].class_id,
                pickup_date_time=now + timedelta(days=1),
                return_date_time_requested=now + timedelta(days=4),
                reservation_status="COMPLETED"
            ),
            Reservation(
                customer_id=customers[1].customer_id,
                location_id=locations[1].location_id,
                class_id=car_classes[2].class_id,
                pickup_date_time=now + timedelta(days=2),
                return_date_time_requested=now + timedelta(days=9),
                reservation_status="COMPLETED"
            ),
            Reservation(
                customer_id=customers[2].customer_id,
                location_id=locations[2].location_id,
                class_id=car_classes[4].class_id,
                pickup_date_time=now + timedelta(days=3),
                return_date_time_requested=now + timedelta(days=6),
                reservation_status="ACTIVE"
            ),
            Reservation(
                customer_id=customers[3].customer_id,
                location_id=locations[3].location_id,
                class_id=car_classes[1].class_id,
                pickup_date_time=now + timedelta(days=5),
                return_date_time_requested=now + timedelta(days=8),
                reservation_status="CANCELED"
            ),
            Reservation(
                customer_id=customers[4].customer_id,
                location_id=locations[4].location_id,
                class_id=car_classes[5].class_id,
                pickup_date_time=now + timedelta(days=7),
                return_date_time_requested=now + timedelta(days=14),
                reservation_status="NO_SHOW"
            ),
        ]
        session.add_all(reservations)
        session.commit()
        
        # Create Rental Agreements
        print("  - Adding rental agreements...")
        rental_agreements = [
            RentalAgreement(
                reservation_id=reservations[0].reservation_id,
                vin=cars[0].vin,
                rental_start_date_time=now + timedelta(days=1),
                rental_end_date_time=now + timedelta(days=4),
                start_odometer_reading=15000,
                end_odometer_reading=15150,
                actual_cost=105.00
            ),
            RentalAgreement(
                reservation_id=reservations[1].reservation_id,
                vin=cars[2].vin,
                rental_start_date_time=now + timedelta(days=2),
                rental_end_date_time=None,  # Still active
                start_odometer_reading=8500,
                end_odometer_reading=None,
                actual_cost=None
            ),
            RentalAgreement(
                reservation_id=reservations[2].reservation_id,
                vin=cars[4].vin,
                rental_start_date_time=now + timedelta(days=3),
                rental_end_date_time=None,  # Still active
                start_odometer_reading=12000,
                end_odometer_reading=None,
                actual_cost=None
            ),
        ]
        session.add_all(rental_agreements)
        session.commit()
        
        print("\n✅ Sample data successfully created!")
        print(f"   - {len(locations)} locations")
        print(f"   - {len(car_classes)} car classes")
        print(f"   - {len(models_data)} vehicle models")
        print(f"   - {len(cars)} vehicles")
        print(f"   - {len(customers)} customers")
        print(f"   - {len(reservations)} reservations")
        print(f"   - {len(rental_agreements)} rental agreements")
        print("\nYou can now test the API at http://localhost:8000/docs")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
