# Physical Data Model - Entity Relationship Diagram

## Rental Car Management System - Database Schema

```mermaid
erDiagram
    CUSTOMER ||--o{ RESERVATION : "makes"
    RESERVATION ||--|| RENTAL_AGREEMENT : "results_in"
    RENTAL_AGREEMENT }o--|| CAR : "rents"
    MODEL }o--|| CAR_CLASS : "registered_as"
    CAR }o--|| MODEL : "belongs_to"
    CAR }o--|| LOCATION : "belongs_to"
    RESERVATION }o--|| LOCATION : "pickup_at"
    RESERVATION }o--|| CAR_CLASS : "reserves"

    LOCATION {
        uuid location_id PK
        string street
        string city
        string state
        string zip
        timestamp created_at
        timestamp updated_at
    }

    CUSTOMER {
        uuid customer_id PK
        string first_name
        string last_name
        string street
        string city
        string state
        string zip
        string license_number UK
        string license_state
        string credit_card_type
        string credit_card_number
        int exp_month
        int exp_year
        timestamp created_at
        timestamp updated_at
    }

    CAR_CLASS {
        uuid class_id PK
        string class_name UK
        decimal daily_rate
        decimal weekly_rate
        timestamp created_at
        timestamp updated_at
    }

    MODEL {
        string model_name PK
        string make_name
        int model_year
        uuid class_id FK
        timestamp created_at
        timestamp updated_at
    }

    CAR {
        string vin PK
        int current_odometer_reading
        uuid location_id FK
        string model_name FK
        timestamp created_at
        timestamp updated_at
    }

    RESERVATION {
        uuid reservation_id PK
        uuid customer_id FK
        uuid location_id FK
        uuid class_id FK
        timestamp pickup_date_time
        timestamp return_date_time_requested
        string reservation_status
        timestamp created_at
        timestamp updated_at
    }

    RENTAL_AGREEMENT {
        uuid contract_no PK
        uuid reservation_id FK "UK"
        string vin FK
        timestamp rental_start_date_time
        timestamp rental_end_date_time
        int start_odometer_reading
        int end_odometer_reading
        decimal actual_cost
        timestamp created_at
        timestamp updated_at
    }
```

## Schema Description

### Tables

| Table | Purpose | Primary Key | Key Constraints |
|-------|---------|-------------|-----------------|
| **LOCATION** | Branch/rental office locations | `location_id` (UUID) | Unique combination of street, city, state, zip |
| **CUSTOMER** | Customer profiles with license & payment info | `customer_id` (UUID) | Unique `license_number`, indexed for lookup performance |
| **CAR_CLASS** | Vehicle categories with rate cards | `class_id` (UUID) | Unique `class_name` (Economy, Compact, Mid-size, etc.) |
| **MODEL** | Specific vehicle models (make, model, year) | `model_name` (String) | Composite: Make + Model + Year, FK to CAR_CLASS |
| **CAR** | Individual vehicles in fleet | `vin` (String) | Unique per vehicle, FK to LOCATION and MODEL |
| **RESERVATION** | Pre-bookings by customers | `reservation_id` (UUID) | One reservation per customer per date range |
| **RENTAL_AGREEMENT** | Actual rental contracts | `contract_no` (UUID) | Unique FK to RESERVATION; one rental per reservation |

### Key Relationships

- **LOCATION** ↔ **CAR**: One location has many cars (stored at that location)
- **LOCATION** ↔ **RESERVATION**: One location services many reservations (pickup location)
- **CUSTOMER** ↔ **RESERVATION**: One customer makes many reservations
- **CAR_CLASS** ↔ **MODEL**: One car class has many models (e.g., "Economy" → "Toyota Corolla")
- **CAR_CLASS** ↔ **RESERVATION**: One class reserved many times
- **MODEL** ↔ **CAR**: One model defines many individual cars
- **RESERVATION** → **RENTAL_AGREEMENT**: One-to-one (each confirmed reservation becomes a rental contract)
- **CAR** → **RENTAL_AGREEMENT**: One car can have multiple rental agreements over time

### Data Types

- **UUID**: Universally unique identifier (PostgreSQL `uuid` type)
- **STRING**: Variable-length text (VARCHAR)
- **DECIMAL**: Monetary values (10,2 precision)
- **TIMESTAMP**: Date and time with timezone
- **INTEGER**: Whole numbers (odometer readings, years)

### Audit Columns

All tables include:
- `created_at`: Timestamp when record was created
- `updated_at`: Timestamp of last update

### Indexes

- `customer.license_number`: Quick lookup by driver's license
- `car.location_id`: Quick retrieval of cars by location
- `car.model_name`: Query cars by model
- `reservation.customer_id`: Query reservations by customer
- `reservation.location_id`: Query reservations by location
- `reservation.class_id`: Query reservations by car class
- `reservation.reservation_status`: Filter by active/cancelled status
- `rental_agreement.reservation_id`: One-to-one lookup
- `rental_agreement.vin`: Query rentals by vehicle

### Business Rules

1. **Availability Check**: A car at a location is available if not currently in a RENTAL_AGREEMENT
2. **Reservation Lifecycle**: RESERVATION.status → "active" → "fulfilled" (converted to RENTAL_AGREEMENT) or "cancelled"
3. **Pricing**: Cost calculated using CAR_CLASS daily/weekly rates and stay duration
4. **Odometer Tracking**: start_odometer_reading vs end_odometer_reading determines mileage for charges
5. **Payment Info**: Stored on CUSTOMER to simplify recurring rentals
