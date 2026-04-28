# BPMN Workflow Mapping

This document captures the mobile-first workflow model that now drives the role-based UI surfaces.

## Reservation To Return Workflow

```mermaid
flowchart TD
    A[Customer books reservation] --> A0{Branch/class/time capacity available}
    A0 -->|No| A2[Reject booking with 409 conflict]
    A0 -->|Yes| A1[Audit event: RESERVED]
    A1 --> B[Reservation active]
    B --> C{Pickup window reached}
    C -->|Arrives| D[Agent verifies customer]
    D --> E[Assign matching VIN at pickup branch/class]
    E --> F[Confirm car current odometer]
    F --> G[Open rental agreement]
    G --> G1[Audit events: PICKED_UP + RENTAL_OPENED]
    G1 --> H[Rental active]
    H --> I{Vehicle returned}
    I -->|Yes| J[Agent captures return time and end odometer]
    J --> K[Compute actual cost and update car odometer]
    K --> L[Close contract and bill]
    L --> L1[Audit events: RETURNED + BILLED]
    C -->|No show| M[Agent marks NO_SHOW]
    M --> M1[Audit event: NO_SHOW]
    B -->|Canceled| N[Reservation canceled]
    N --> N1[Audit event: CANCELED]
```

## Role Mapping

| BPMN Stage | Owner | UI Surface | Primary API |
| --- | --- | --- | --- |
| Book Reservation | Customer | Customer Portal / Book | `POST /api/v1/customer-portal/bookings` |
| Reservation Active | Customer/System | Customer Portal / My Trip | `GET /api/v1/customer-portal/me` |
| Customer Intake | Agent | Agent Workspace / Intake | `POST /api/v1/customers` |
| Pickup Assignment | Agent | Agent Workspace / Pickup | `POST /api/v1/rental-agreements` |
| Rental In Progress | Customer + Manager | Customer Portal / My Trip, Manager / Overview | `GET /api/v1/dashboard/overview` |
| Return And Billing | Agent | Agent Workspace / Return | `PUT /api/v1/rental-agreements/{contract_no}` |
| Exception Handling | Agent + Manager | Agent / Return, Manager / Exceptions | `PUT /api/v1/reservations/{reservation_id}` |
| Fleet And Pricing Maintenance | Admin | Admin Console / Fleet + Pricing | `/api/v1/locations`, `/api/v1/car-classes`, `/api/v1/models`, `/api/v1/cars` |
| Entity Change Audit | Admin | Admin Console / Ops | `GET /api/v1/audit-events` |

## UI Visibility Rules

- Customers see only their booking and rental timeline.
- Agents see active work queues and guided transactional flows.
- Managers see branch health, overdue items, and blocked workflow cases.
- Rental Admins see configuration and inventory controls, plus workflow governance visibility.
- Rental Admins manage inventory in relational order: class rates, models assigned to classes, then VINs assigned to models and locations.
- Rental Admins review `entity_audit_event` history for governed create, update, and delete actions made through grids and CRUD forms.
- Pickup assignment dropdowns show only cars that are available, in the reservation pickup branch, and in the requested class.
- Customer trip cards show lifecycle drilldowns from `rental_lifecycle_event`, including actor and timestamp.
- Reservations with an existing rental agreement cannot change customer, branch, class, dates, or status.
- Closed rentals reject repeat closeout updates; rental deletion is admin-only and blocked when lifecycle history exists.
