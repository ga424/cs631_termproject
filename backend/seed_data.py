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
from app.core.security import hash_password, normalize_username
from app.db.base import Base
from app.models.models import (
    Location, Customer, CustomerAccount, CarClass, Model, Car, 
    Reservation, RentalAgreement
)

DEMO_CUSTOMER_PASSWORD = "customer123"

DEMO_ACCOUNT_BY_NAME = {
    ("john", "doe"): "john.doe",
    ("jane", "smith"): "jane.smith",
    ("robert", "johnson"): "robert.johnson",
    ("emily", "williams"): "emily.williams",
    ("michael", "brown"): "michael.brown",
}

INACTIVE_DEMO_CUSTOMERS = [
    {
        "username": "nina.nohistory",
        "customer": {
            "first_name": "Nina",
            "last_name": "Nohistory",
            "street": "710 Demo Plaza",
            "city": "Newark",
            "state": "NJ",
            "zip": "07102",
            "license_number": "D2234567",
            "license_state": "NJ",
            "credit_card_type": "Visa",
            "credit_card_number": "4111111111111111",
            "exp_month": 11,
            "exp_year": 2028,
        },
    },
    {
        "username": "omar.inactive",
        "customer": {
            "first_name": "Omar",
            "last_name": "Inactive",
            "street": "810 Account Way",
            "city": "Hoboken",
            "state": "NJ",
            "zip": "07030",
            "license_number": "D2234568",
            "license_state": "NJ",
            "credit_card_type": "MasterCard",
            "credit_card_number": "5555555555554444",
            "exp_month": 10,
            "exp_year": 2029,
        },
    },
]


def preferred_demo_username(customer):
    """Return a stable demo username for known seeded users, else a normalized fallback."""
    key = (customer.first_name.strip().lower(), customer.last_name.strip().lower())
    if key in DEMO_ACCOUNT_BY_NAME:
        return DEMO_ACCOUNT_BY_NAME[key]
    return normalize_username(f"{customer.first_name}.{customer.last_name}")


def print_demo_credentials(session):
    """Print active demo customer credentials for local demos."""
    rows = (
        session.query(CustomerAccount, Customer)
        .join(Customer, CustomerAccount.customer_id == Customer.customer_id)
        .filter(CustomerAccount.is_active.is_(True))
        .order_by(Customer.last_name.asc(), Customer.first_name.asc())
        .all()
    )

    if not rows:
        print("\nNo active customer demo accounts found.")
        return

    row_by_name = {
        (customer.first_name.strip().lower(), customer.last_name.strip().lower()): (account, customer)
        for account, customer in rows
    }

    print("\nRecommended demo customer accounts (shared password):")
    print(f"   password: {DEMO_CUSTOMER_PASSWORD}")
    curated_count = 0
    for name_key, expected_username in DEMO_ACCOUNT_BY_NAME.items():
        row = row_by_name.get(name_key)
        if not row:
            continue
        account, customer = row
        curated_count += 1
        marker = "" if account.username == expected_username else f" (expected {expected_username})"
        print(f"   - {customer.first_name} {customer.last_name}: {account.username}{marker}")

    if curated_count == 0:
        print("   - No curated seeded demo users were found.")

    additional = [
        (account, customer)
        for account, customer in rows
        if (customer.first_name.strip().lower(), customer.last_name.strip().lower()) not in DEMO_ACCOUNT_BY_NAME
    ]
    if additional:
        print("\nAdditional customer accounts present:")
        for account, customer in additional:
            print(f"   - {customer.first_name} {customer.last_name}: {account.username}")

    inactive_rows = (
        session.query(CustomerAccount, Customer)
        .join(Customer, CustomerAccount.customer_id == Customer.customer_id)
        .filter(CustomerAccount.is_active.is_(False))
        .order_by(Customer.last_name.asc(), Customer.first_name.asc())
        .all()
    )
    if inactive_rows:
        print("\nInactive no-booking demo accounts:")
        for account, customer in inactive_rows:
            print(f"   - {customer.first_name} {customer.last_name}: {account.username} (login disabled)")


def print_seeded_customer_account_snapshot(session):
    """Print persisted seeded customer account details for quick demo handoff."""
    print("\nSeeded customer account snapshot:")
    for name_key, expected_username in DEMO_ACCOUNT_BY_NAME.items():
        first_name, last_name = name_key
        customer = (
            session.query(Customer)
            .filter(Customer.first_name.ilike(first_name), Customer.last_name.ilike(last_name))
            .first()
        )
        if not customer:
            print(f"   - {first_name.title()} {last_name.title()}: missing customer record")
            continue

        account = (
            session.query(CustomerAccount)
            .filter(CustomerAccount.customer_id == customer.customer_id)
            .first()
        )
        if not account:
            print(f"   - {customer.first_name} {customer.last_name}: missing account (expected {expected_username})")
            continue

        print(
            "   - "
            f"{customer.first_name} {customer.last_name}: "
            f"username={account.username}, customer_id={customer.customer_id}, account_id={account.account_id}"
        )


def print_demo_summary(session):
    """Print a concise summary of demo-ready seeded customer accounts."""
    print_demo_credentials(session)
    print_seeded_customer_account_snapshot(session)


def ensure_customer_accounts(session, customers):
    """Create demo login accounts for seeded customers that do not already have one."""
    print("  - Ensuring customer demo accounts...")
    reserved_usernames = {
        username
        for (username,) in session.query(CustomerAccount.username).all()
        if username
    }

    for customer in customers:
        existing = session.query(CustomerAccount).filter(CustomerAccount.customer_id == customer.customer_id).first()
        if existing:
            reserved_usernames.add(existing.username)
            continue

        base_username = preferred_demo_username(customer)
        username = base_username
        suffix = 2
        while username in reserved_usernames:
            username = f"{base_username}{suffix}"
            suffix += 1

        session.add(CustomerAccount(
            customer_id=customer.customer_id,
            username=username,
            password_hash=hash_password(DEMO_CUSTOMER_PASSWORD),
            is_active=True,
        ))
        reserved_usernames.add(username)

    session.commit()
    print_demo_summary(session)


def ensure_inactive_demo_customers(session):
    """Create inactive customer accounts with no reservations for account-state demos."""
    print("  - Ensuring inactive no-booking customer accounts...")
    for record in INACTIVE_DEMO_CUSTOMERS:
        data = record["customer"]
        customer = session.query(Customer).filter(Customer.license_number == data["license_number"]).first()
        if customer is None:
            customer = Customer(**data)
            session.add(customer)
            session.flush()

        account = session.query(CustomerAccount).filter(CustomerAccount.customer_id == customer.customer_id).first()
        if account is None:
            account = CustomerAccount(
                customer_id=customer.customer_id,
                username=normalize_username(record["username"]),
                password_hash=hash_password(DEMO_CUSTOMER_PASSWORD),
                is_active=False,
            )
            session.add(account)
        else:
            account.username = normalize_username(record["username"])
            account.is_active = False

    session.commit()


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
            customers = session.query(Customer).all()
            ensure_customer_accounts(session, customers)
            ensure_inactive_demo_customers(session)
            print_demo_summary(session)
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
        ensure_customer_accounts(session, customers)
        ensure_inactive_demo_customers(session)
        print_demo_summary(session)
        
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
