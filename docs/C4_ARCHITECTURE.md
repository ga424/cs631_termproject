# C4 Architecture Diagrams - Rental Car Management System

## System Context Diagram (Level 1)

Shows the overall system in the context of external systems and users.

```mermaid
C4Context
    title System Context - Rental Car Management System
    
    Person(customer, "Customer", "A person who rents vehicles")
    Person(admin, "Administrator", "Manages locations, vehicles, and reservations")
    
    System(rentalSystem, "Rental Car Management System", "Provides REST API for managing vehicle rentals, reservations, and locations")
    
    System_Ext(paymentGateway, "Payment Gateway", "Processes credit card payments for rentals")
    System_Ext(emailService, "Email Service", "Sends confirmation and notification emails")
    
    SystemDb(database, "PostgreSQL Database", "Stores locations, customers, vehicles, reservations, and rental agreements")
    
    BiRel(customer, rentalSystem, "Uses to make reservations and rentals")
    BiRel(admin, rentalSystem, "Uses to manage inventory and reservations")
    Rel(rentalSystem, database, "Reads/Writes data")
    Rel(rentalSystem, paymentGateway, "Processes payments")
    Rel(rentalSystem, emailService, "Sends notifications")
```

## Container Diagram (Level 2)

Shows the high-level structure of the system and internal containers.

```mermaid
C4Container
    title Container Diagram - Rental Car Management System
    
    Person(customer, "Customer", "A person who rents vehicles")
    Person(admin, "Administrator", "Manages the system")
    
    System_Boundary(c1, "Rental Car Management System") {
        Container(spa, "Web Browser", "React/Vue", "Provides user interface for customers and admins")
        Container(api, "REST API", "FastAPI", "Provides API endpoints for managing reservations, vehicles, locations, and rentals")
        Container(auth, "Authentication Service", "JWT Tokens", "Handles user authentication and authorization")
        ContainerDb(db, "PostgreSQL Database", "PostgreSQL", "Stores locations, customers, vehicles, reservations, and rental agreements")
    }
    
    Container_Ext(emailSvc, "Email Service", "SMTP", "Sends notifications and confirmations")
    Container_Ext(paymentSvc, "Payment Gateway", "Stripe/PayPal", "Processes credit card transactions")
    
    Rel(customer, spa, "Uses")
    Rel(admin, spa, "Uses")
    Rel(spa, api, "Makes API calls", "HTTPS/REST")
    Rel(api, auth, "Validates tokens")
    Rel(api, db, "Reads/Writes")
    Rel(api, emailSvc, "Sends emails")
    Rel(api, paymentSvc, "Processes payments")
```

## Component Diagram (Level 3)

Shows the major components within the FastAPI REST API.

```mermaid
C4Component
    title Component Diagram - REST API Service
    
    Container(spa, "Web Browser", "React/Vue")
    ContainerDb(db, "PostgreSQL")
    
    System_Boundary(api, "REST API - FastAPI") {
        Component(router, "Route Handlers", "locations, customers, vehicles, reservations, rentals")
        Component(schemas, "Request/Response Schemas", "Pydantic models for validation")
        Component(models, "Data Models", "SQLAlchemy ORM models")
        Component(service, "Business Logic", "Validation, pricing, availability checks")
        Component(dbConn, "Database Connection", "SQLAlchemy session management")
        Component(config, "Configuration", "Environment settings and secrets")
    }
    
    Rel(spa, router, "Calls endpoints", "HTTP/REST")
    Rel(router, schemas, "Validates requests")
    Rel(router, service, "Delegates business logic")
    Rel(service, models, "Uses ORM models")
    Rel(models, dbConn, "Uses for queries")
    Rel(dbConn, db, "Reads/Writes data")
    Rel(router, config, "Reads settings")
```

## Deployment Diagram (Level 4)

Shows how the system is deployed in production.

```mermaid
flowchart LR
    subgraph github[GitHub Cloud]
        repo[Source Repository]
        ghcr[GitHub Container Registry\nAPI image]
        repo -->|build and publish| ghcr
    end

    subgraph host[Docker Host]
        direction TB
        subgraph dbnode[PostgreSQL Container]
            db[(Rental Database)]
        end
        subgraph mignode[Liquibase Container]
            liquibase[Schema migrations]
        end
        subgraph apinode[API Container]
            api[FastAPI REST API]
        end
    end

    client[Client Browser] -->|HTTP requests| api
    ghcr -->|pull image| api
    liquibase -->|applies schema| db
    api -->|reads / writes| db
```
