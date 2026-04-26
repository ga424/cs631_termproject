# CS631 - Term Project

**Authors:** Kundan Singh & Gustavo Abreu  
**Phase:** I - Conceptual Design  
**System:** RentaCar Database System  
**Created:** 22 Mar 2026  
**Last updated:** 25 Apr 2026

## Implementation Addendum

The implemented system extends the original conceptual model with operational hardening needed for a working demo:

- `CUSTOMER_ACCOUNT` stores DB-backed customer login credentials in a 1:1 relationship with `CUSTOMER`.
- `RESERVATION.return_location_id` supports return-to-different-location booking flows.
- `RESERVATION.reservation_status = FULFILLED` means the reservation successfully opened a rental agreement; it does not mean the vehicle has been returned.
- `RENTAL_LIFECYCLE_EVENT` stores a durable audit trail with event type, actor role, actor username, timestamp, reservation, optional contract, and notes.
- Pickup odometer is derived from `CAR.current_odometer_reading`; agents enter only the return/end odometer at closeout.
- Demo seed data includes active customer accounts, inactive no-booking customer accounts, current/historical trips, lifecycle events, out-of-stock catalog classes, and branch/class vehicle coverage for agent assignment.

These additions preserve the course requirements while making the customer portal, agent pickup/return workflow, manager dashboard, and admin fleet controls demonstrable end to end.

## System Overview
The purpose of the RentaCar database system is to support the operational activities of a car rental company, including managing customers, vehicles, reservations, rental agreements, and billing. The system tracks vehicle inventory by location, allows customers to make reservations, converts reservations into rental agreements, and computes rental charges based on car class rates.
## Business Rules and Requirements
Based on the project description, the following business rules govern the RentaCar system:
- The company operates multiple locations (branches), each identified by a unique location ID and address.
- Each car is assigned to exactly one location at any given time.
- Each location owns one or more cars.
- Each car is uniquely identified by its Vehicle Identification Number (VIN).
- Cars are categorized into car classes, which determine rental pricing.
- Each car belongs to exactly one car class.
- Each car class has two rental rates: daily rate and weekly rate.
- A customer may make one or more reservations over time.
- Each reservation is made for: 
- One customer
- One car class
- One pickup location
- A specific rental period (date and time out / date and time in)
- The car model includes a make (Ford, Honda, etc.), the year of the model, and the model’s name.
- A reservation may be canceled or result in a noshow.
- Every rental agreement must be associated with exactly one reservation.
- A reservation may result in at most one rental agreement.
- A rental agreement is created when the customer picks up the car.
- Each rental agreement is for one specific vehicle (VIN).
- A vehicle may participate in multiple rental agreements over time, but only one at a time.
- The rental agreement records: 
- Contract number
- Rental start date and time
- Rental end date and time
- Odometer reading at pickup and return
- Rental charges are calculated based on the car class and rental duration.
- Payment is made using credit card only.
- No rental agreement can exist without a reservation.
## Entity-Relationship (ER) Design

### Entities and Primary Keys
- CUSTOMER
- CustomerID (PK)
- Name (FirstName, LastName)
- Address (Street, City, State, Zip)
- License (LicenseNumber, LicenseState)
- CreditCard(Type, Number, ExpiryMonth, ExpiryYear)
- LOCATION
- LocationID (PK)
- Address (Street, State, City, Zip)
- CAR
- VIN (PK)
- OdometerReading
- CAR_CLASS
- ClassID (PK)
- ClassName
- DailyRate
- WeeklyRate
- MODEL
- ModelName(PK)
- MakeName
- ModelYear
- RESERVATION
- ReservationID (PK)
- PickupDateTime
- ReturnDateTimeRequested
- ReservationStatus
- RENTAL_AGREEMENT
- ContractNo (PK)
- RentalStartDateTime
- RentalEndDateTime
- StartOdometer
- EndOdometer
- ActualCost (Derived)
### Relationships and Cardinalities
- CUSTOMER makes RESERVATION (One customer can make many reservations) 1: N

Participation:
- Customer → Partial (a customer may exist without reservations)
- Reservation → Total (every reservation must belong to a customer)
- RESERVATION results in RENTAL_AGREEMENT (A reservation may or may not become a rental) 1:0..1

Participation:
- Reservation → Partial (may not result in rental)
- Rental_Agreement → Total (must come from a reservation)
- RENTAL_AGREEMENT rents CAR (Each rental is for one specific vehicle) N:1

Participation:
- Rental_Agreement → Total (must have a car)
- Car → Partial (car may never be rented)
- CAR classified as CAR_CLASS (Each car belongs to one class) N:1

Participation:
- Car → Total (must belong to a class)
- Car_Class → Partial (a class may exist without cars initially)
- MODEL registered as CAR_CLASS
(Each model must be associated with at most 1 car class and each class may be associated with many models)

Participation: 
- MODEL → Total (must belong to a car class)
- CAR_CLASS → Partial (A car class can exist without specific model)
- CAR belongs to LOCATION (Each car is at one location) N:1

Participation:
- Car → Total (must belong to a location)
- Location → Total (must have at least one car)
- RESERVATION pickup at LOCATION (Each reservation is for one location) N:1

Participation:
- Reservation → Total (must specify pickup location)
- Location → Partial (location may exist with no reservations yet)
- RESERVATION reserves CAR_CLASS (Each reservation is for one car class) N:1


Participation:
- Reservation → Total (must specify class)
- Car_Class → Partial
Summary of Key Relationships:


Relationship
Cardinality
Left Participation
Right Participation
Customer–Reservation
1: N
Partial
Total
Reservation–RentalAgreement
1:0..1
Partial
Total
RentalAgreement–Car
N:1
Total
Partial
Car–Location
N:1
Total
Total
Model- CarClass
N:1
Total
Partial
Car–CarClass
N:1
Total
Partial
Reservation–Location
N:1
Total
Partial
Reservation–CarClass
N:1
Total
Partial
- Relational Schema:
CUSTOMER(CustomerID, FirstName, LastName, Street, City, State, Zip, LicenseNumber, LicenseState, CreditCardType, CreditCardNumber, ExpMonth, ExpYear)

LOCATION(LocationID, Street, City, State, Zip)

CAR_CLASS(ClassID, ClassName, DailyRate, WeeklyRate)

CAR(VIN, CurrentOdometerReading, LocationID, ClassID, ModelName)

MODEL(ModelName, MakeName, ModelYear, ClassID)

CUSTOMER_ACCOUNT(AccountID, CustomerID, Username, PasswordHash, IsActive, LastLoginAt)

RESERVATION(ReservationID, CustomerID, LocationID, ReturnLocationID, ClassID, PickupDateTime, ReturnDateTimeRequested, ReservationStatus)

RENTAL_AGREEMENT(ContractNo, ReservationID, VIN, RentalStartDateTime, RentalEndDateTime, StartOdometerReading, EndOdometerReading, ActualCost)

RENTAL_LIFECYCLE_EVENT(EventID, ReservationID, ContractNo, CustomerID, EventType, ActorRole, ActorUsername, EventTimestamp, Notes)
- CUSTOMER( CustomerID PK, FirstName, LastName, Street, City, State, Zip, LicenseNumber, LicenseState, CreditCardType, CreditCardNumber, ExpMonth, ExpYear ) 
- LOCATION( LocationID PK, Street, City, State, Zip )  
- CAR_CLASS( ClassID PK, ClassName, DailyRate, WeeklyRate )  
- CAR( VIN PK, CurrentOdometerReading, LocationID FK REFERENCES LOCATION(LocationID),
ModelID FK REFERENCES MODEL(MODEL_NAME)
)
- MODEL(
 MODEL_NAME PK, 
MAKENAME, 
MODELYEAR, 
CLASSID FK REFERENCES CAR_CLASS(ClassID) ) 
- RESERVATION( ReservationID PK, CustomerID FK REFERENCES CUSTOMER(CustomerID), LocationID FK REFERENCES LOCATION(LocationID), ClassID FK REFERENCES CAR_CLASS(ClassID), PickupDateTime, ReturnDateTimeRequested, ReservationStatus )  
- RENTAL_AGREEMENT( ContractNo PK, ReservationID FK UNIQUE REFERENCES RESERVATION(ReservationID), VIN FK REFERENCES CAR(VIN), RentalStartDateTime, RentalEndDateTime, StartOdometerReading, EndOdometerReading, ActualCost   )
- ER Diagram: 
The ER diagram fully captures all entities, relationships, cardinalities, and participation constraints derived from the business rules.
- Assumptions:
The following assumptions were made during the design process:
- Customer identity is represented using a systemgenerated CustomerID.
- A reservation may exist without a rental agreement (canceled or noshow).
- Each rental agreement is associated with exactly one reservation.
- A rental agreement cannot exist without a reservation.
- Each reservation is for one car class only.
- A car belongs to only one class and one location.
- A car may be rented multiple times but cannot be involved in more than one active rental agreement at the same time.
- Payment details are stored as part of customer information.
- Rental total actual cost is derived/computed when the vehicle is returned.
- Status is added to track cancellations/no-shows.
- We have assumed that Car Model Name is a primary key and exists only in a make.
- We have not considered a more practical operational and conceptual data model that would enable other parts not mentioned in the business requirements to be addressed, for example, returning the car causes the representative to bring the contract to a natural ending of the rental agreement, inspections, etc. We have also not included the additional temporal nature of rates as modeled in the future enhancement version below, where we can see these updated and applicable for future agreements where the rate might have changed
