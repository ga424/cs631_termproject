# Architecture & Database Documentation

This directory contains comprehensive architectural and database documentation for the Rental Car Management System.

## Contents

### 1. [C4_ARCHITECTURE.md](C4_ARCHITECTURE.md) - C4 Model Diagrams

The C4 Model provides a hierarchical view of the system architecture at different levels of abstraction:

#### Diagrams Included:

- **System Context (Level 1)**: Shows the overall system in the context of users and external systems
  - Users: Customers, Administrators
  - External Systems: Payment Gateway, Email Service
  - Database: PostgreSQL

- **Container Diagram (Level 2)**: High-level system structure showing internal containers/services
  - Components: Web Browser, REST API, Authentication Service, Database
  - External Services: Email Service, Payment Gateway
  - Interactions: How components communicate

- **Component Diagram (Level 3)**: Internal structure of the FastAPI REST API
  - Route Handlers: Endpoint implementations
  - Schemas: Pydantic request/response validation
  - Data Models: SQLAlchemy ORM models
  - Business Logic: Service layers
  - Database Connection: Session management
  - Configuration: Environment and secrets

- **Deployment Diagram (Level 4)**: Production deployment architecture
  - Docker containers: PostgreSQL, FastAPI API, Liquibase
  - GitHub Container Registry: Docker image storage and deployment
  - Client infrastructure: End-user web browsers

**Validation Status**: ✅ All C4 diagrams validated and rendering properly

---

### 2. [DATABASE_ERD.md](DATABASE_ERD.md) - Physical Data Model

Comprehensive Entity Relationship Diagram (ERD) showing the complete database schema:

#### Tables (9 total):

1. **LOCATION** - Branch/rental office locations
   - Fields: location_id (PK, UUID), address, city, state, zip
   - Relationships: Stores many cars, services many reservations

2. **CUSTOMER** - Customer profiles
   - Fields: customer_id (PK, UUID), name, address, license info, payment info
   - Relationships: Makes many reservations, owns one optional customer login account

3. **CUSTOMER_ACCOUNT** - Customer authentication accounts
   - Fields: account_id (PK, UUID), customer_id (unique FK), username, password_hash, is_active, last_login_at
   - Relationships: Linked 1:1 to a customer profile

4. **CAR_CLASS** - Vehicle categories (Economy, Compact, Mid-size, etc.)
   - Fields: class_id (PK, UUID), class_name, daily_rate, weekly_rate
   - Relationships: Classifies many models, used in many reservations

5. **MODEL** - Specific vehicle models (Make/Model/Year)
   - Fields: model_name (PK, String), make_name, model_year, class_id (FK)
   - Relationships: Belongs to one car class, defines many cars

6. **CAR** - Individual vehicles in fleet
   - Fields: vin (PK, String), odometer_reading, location_id (FK), model_name (FK)
   - Relationships: Located at one location, follows one model, used in many rentals

7. **RESERVATION** - Pre-bookings by customers
   - Fields: reservation_id (PK, UUID), customer_id (FK), pickup location, return location, class_id (FK), dates, status
   - Relationships: Made by one customer, at one pickup location, optionally returned to another location, for one car class, creates at most one rental

8. **RENTAL_AGREEMENT** - Actual rental contracts
   - Fields: contract_no (PK, UUID), reservation_id (FK), vin (FK), dates, odometer readings, cost
   - Relationships: Fulfills one reservation, uses one car

9. **RENTAL_LIFECYCLE_EVENT** - Trip audit trail
   - Fields: event_id (PK, UUID), reservation_id, contract_no, customer_id, event_type, actor_role, actor_username, event_timestamp, notes
   - Relationships: Records who did what and when for reservation, pickup, rental, return, and billing events

#### Key Relationships:

- One customer can make many reservations
- One customer can have one DB-backed customer account
- One location can have many cars and service many reservations
- One car class can apply to many models and many reservations
- One model defines many individual cars
- One reservation creates at most one rental agreement
- One car can be used in many rental agreements over time
- One reservation can have many lifecycle audit events

#### Business Rules:

- Vehicle availability: Car is available if not currently in active rental
- Agent vehicle assignment: car must match reservation pickup branch and requested class
- Pricing: Calculated from car class rates × rental duration
- Fleet governance: admins create classes first, assign models to classes, then register cars to existing models and locations
- Integrity errors: duplicate class/model/VIN values and invalid class/location/model references are normalized into clear `409 Conflict` API errors
- Odometer tracking: Pickup odometer is derived from the selected car; return odometer is captured at closeout
- Auditability: Lifecycle events store actor, timestamp, reservation, optional contract, and notes
- Payment: Stored on customer for recurring rental convenience

**Validation Status**: ✅ ERD validated and rendering properly

---

### 3. [USER_JOURNEYS.md](USER_JOURNEYS.md) - Requirements-To-Workflow Mapping

User journey views that connect course requirements to concrete workflows and API calls:

- Reservation creation
- Reservation-to-rental conversion at pickup
- Rental return and closeout
- Cancellation / no-show flows
- Fleet and pricing administration flows
- DB-backed customer signup/login and customer-owned portal data
- Rental lifecycle audit trail views
- Strict TypeScript frontend checks plus mocked and live Playwright persona tests

These journeys are intended to support:
- Phase I traceability from business rules to entities/relationships
- Phase II implementation validation against API and schema design
- Phase III testing and presentation scenario planning

---

## How to Use These Diagrams

### For System Understanding
- **Start with C4 System Context**: Get the big picture
- **Move to Container Diagram**: Understand system components
- **Check Component Diagram**: Learn internal API structure
- **Review Deployment Diagram**: Understand production setup

### For Database Development
- **Reference DATABASE_ERD.md**: Understand data model relationships
- **Check the schema description table**: Learn table purposes and constraints
- **Review business rules section**: Understand domain logic constraints

### For Team Communication
- Use System Context and Container diagrams in architecture reviews
- Use Component diagram in API/development discussions
- Use ERD in database design and migration discussions

---

## Mermaid Diagram Syntax

All diagrams are written in Mermaid diagram markup and can be:
- Viewed directly in GitHub markdown (.md files)
- Rendered in any Mermaid-compatible tool
- Exported as PNG/SVG for presentations
- Embedded in documentation systems

---

## Integration with Codebase

### Alignment with Implementation:

- **C4 Container**: Matches actual Docker services in `docker-compose.yml` (PostgreSQL, Liquibase, FastAPI)
- **Component Diagram**: Reflects backend package structure:
  - `app/api/`: Route handlers
  - `app/schemas.py`: Pydantic schemas
  - `app/models/`: SQLAlchemy models
  - `app/core/`: Configuration
  - `app/db/`: Database connection management
- **ERD**: Directly derived from `app/models/models.py` SQLAlchemy ORM definitions
- **Deployment**: Reflects actual CI/CD in `.github/workflows/ci-cd.yml` and Docker setup
- **Seed data**: Provides customer accounts, active/inactive demo accounts, lifecycle events, and branch/class vehicle coverage so persona demos can complete end-to-end

---

## Document Maintenance

These documents should be updated when:
- Major architectural changes occur
- New containers or services are added/removed
- Database schema changes are made (new tables, relationships, constraints)
- Deployment infrastructure changes
- Integration with external systems changes

Keep diagrams synchronized with the actual codebase for accurate system documentation.
