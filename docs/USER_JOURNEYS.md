# User Journeys (CS631 RentACar Requirements Alignment)

This document maps user workflows directly to the official CS631 RentACar requirements and to the implemented API resources.

## Journey 1: Reservation By Phone (Pre-Arrival)

### Requirement Mapping
- A customer makes a reservation for a **car class** at a **specific location**.
- The same customer may make multiple reservations over time.
- Reservation captures desired pickup/return date-time period.

### Steps
1. Service representative captures customer identity and address.
2. Representative captures rental period and desired class.
3. System stores reservation in `reservation` with status `ACTIVE`.
4. Customer is informed of daily/weekly class rates.

### Core Data
- `customer`, `location`, `car_class`, `reservation`

### API Touchpoints
- `POST /api/v1/customers`
- `GET /api/v1/locations`
- `GET /api/v1/car-classes`
- `POST /api/v1/reservations`

## Journey 2: Walk-In Customer (No Prior Reservation)

### Requirement Mapping
- Walk-ins are allowed, but all rentals must still be associated with a reservation.

### Steps
1. Representative creates reservation first (same interaction).
2. Reservation is then used to issue rental agreement.

### Core Data
- `customer`, `reservation`, `rental_agreement`

### API Touchpoints
- `POST /api/v1/customers` (if new)
- `POST /api/v1/reservations`
- `POST /api/v1/rental-agreements`

## Journey 3: Pickup And Rental Agreement Creation

### Requirement Mapping
- Reservation normally results in a rental agreement at pickup.
- Rental agreement must include unique contract number, specific VIN, start time, and start odometer.

### Steps
1. Representative retrieves reservation.
2. Specific vehicle (`vin`) is assigned.
3. Rental agreement is created and customer receives copy/keys.

### Core Data
- `reservation`, `car`, `rental_agreement`

### API Touchpoints
- `GET /api/v1/reservations/{reservation_id}`
- `GET /api/v1/cars`
- `POST /api/v1/rental-agreements`

## Journey 4: Cancellation And No-Show

### Requirement Mapping
- Reservation may be canceled.
- Customer may not show up.
- In those cases, reservation does not produce a rental agreement.

### Steps
1. Reservation status is changed to `CANCELED` or `NO_SHOW`.
2. No contract is created for that reservation.

### Core Data
- `reservation`

### API Touchpoints
- `PUT /api/v1/reservations/{reservation_id}`

## Journey 5: Vehicle Return And Billing

### Requirement Mapping
- At return, end date-time and end odometer are recorded.
- Actual rental cost is computed from class rates and charged to credit card only.

### Steps
1. Representative opens rental agreement.
2. End date-time and end odometer are captured.
3. Actual cost is calculated and stored.
4. Billing is posted to customer credit card.

### Core Data
- `rental_agreement`, `reservation`, `car_class`, `customer`

### API Touchpoints
- `GET /api/v1/rental-agreements/{contract_no}`
- `PUT /api/v1/rental-agreements/{contract_no}`

## Journey 6: Inventory And Pricing Administration

### Requirement Mapping
- Cars are assigned to locations (each location has one or more cars).
- Car rates are controlled by class (daily and weekly).
- Models include make, model name, and year.

### Steps
1. Manage branch locations.
2. Manage class rates.
3. Manage model catalog.
4. Register/update cars and assigned location.

### Core Data
- `location`, `car_class`, `model`, `car`

### API Touchpoints
- `/api/v1/locations`
- `/api/v1/car-classes`
- `/api/v1/models`
- `/api/v1/cars`

## Traceability To Project Phases

- **Phase I (Conceptual Design):** Journeys validate ER/EER entities, cardinalities, and participation.
- **Phase II (Database Design + Implementation):** Journeys map to tables, constraints, and endpoint behavior.
- **Phase III (Normalization, Testing, Demo):** Journeys define executable test scenarios and presentation scripts.
