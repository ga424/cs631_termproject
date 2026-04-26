# CS 631 Term Project - Rental Car Management System

[![CI-CD](https://github.com/ga424/cs631_termproject/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/ga424/cs631_termproject/actions/workflows/ci-cd.yml)

A containerized rental car management system built with FastAPI, PostgreSQL, and Liquibase for database migrations.

## Architecture

### Technology Stack
- **API Framework**: FastAPI (Python)
- **Database**: PostgreSQL 15
- **Database Migrations**: Liquibase
- **Containerization**: Docker & Docker Compose
- **ORM**: SQLAlchemy
- **Frontend**: React + Vite with a routed mobile-first TypeScript UI

### Project Structure
```
.
├── backend/                          # FastAPI application
│   ├── app/
│   │   ├── api/                     # API route handlers
│   │   │   ├── auth.py              # JWT login endpoint
│   │   │   ├── customer_portal.py   # Customer self-service booking/trip endpoints
│   │   │   ├── dashboard.py         # Staff dashboard metrics
│   │   │   ├── locations.py         # Location endpoints
│   │   │   ├── customers.py         # Customer endpoints
│   │   │   ├── car_classes.py       # Car class endpoints
│   │   │   ├── models.py            # Vehicle model endpoints
│   │   │   ├── vehicles.py          # Vehicle (Car) endpoints
│   │   │   ├── reservations.py      # Reservation endpoints
│   │   │   └── rentals.py           # Rental agreement endpoints
│   │   ├── models/                  # SQLAlchemy models
│   │   │   └── models.py            # Database models
│   │   ├── core/                    # Core configuration
│   │   │   └── config.py            # Application settings
│   │   ├── db/                      # Database setup
│   │   │   ├── base.py              # SQLAlchemy base
│   │   │   └── session.py           # Database session
│   │   ├── main.py                  # FastAPI application entry
│   │   └── schemas.py               # Pydantic schemas
│   ├── requirements.txt             # Python dependencies
│   ├── seed_data.py                 # Sample data seeding script
│   └── Dockerfile                   # Backend container definition
├── database/
│   ├── migrations/                  # Liquibase migration files
│   │   ├── db.changelog-master.xml  # Master changelog
│   │   ├── 01-init-schema.xml       # Schema initialization
│   │   └── 02-create-tables.xml     # Table definitions
│   └── liquibase/                   # Liquibase configuration
├── frontend/                        # React + Vite frontend
│   ├── src/
│   │   ├── app/                     # Routed persona pages, shared shell, hooks, API client
│   │   ├── main.tsx                 # Frontend entrypoint
│   │   └── styles.css               # Shared mobile-first theme and layout styles
│   ├── package.json                 # Frontend dependencies/scripts
│   ├── tsconfig.json                # Frontend TypeScript config
│   └── vite.config.js               # Dev server and proxy config
├── docker-compose.yml               # Multi-container orchestration
├── Dockerfile.liquibase             # Liquibase container definition
├── start.sh                         # Startup helper script
└── .env.example                     # Example environment variables
```

## Getting Started

### Prerequisites
- Docker & Docker Compose (version 20.10+)
- macOS/Linux/Windows with Docker Desktop
- Python 3.14 for local backend tests outside Docker
- Node.js 20+ for local frontend builds and Playwright E2E tests

### Setup & Run

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd cs631_termproject
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Start all services**
   ```bash
   chmod +x start.sh
   ./start.sh up
   ```

   Or with Docker Compose directly:
   ```bash
   docker-compose up -d
   ```

4. **Verify services**
   ```bash
   docker-compose ps
   ```

5. **Access the API**
   - API Base URL: `http://localhost:8000`
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`
   - Health Check: `http://localhost:8000/health`
   - Frontend Mobile UI: `http://localhost:5173`
   - Persona routes after login:
     - `http://localhost:5173/customer`
     - `http://localhost:5173/agent`
     - `http://localhost:5173/manager`
     - `http://localhost:5173/admin`

6. **Sign in to the frontend**
   - Customer: select a seeded customer from the sign-in dropdown, or use one of these active DB-backed demo accounts (all use password `customer123`):
     - `john.doe`
     - `jane.smith`
     - `robert.johnson`
     - `emily.williams`
     - `michael.brown`
   - Agent: `agent` / `agent123`
   - Manager: `manager` / `manager123`
   - Admin: `admin` / `admin123`
   - Seeded customer accounts are DB-backed and linked 1:1 to customer records. Inactive no-booking demo accounts are visible in the dropdown for account-state demos but cannot log in. Staff demo accounts remain environment-backed.
   - These are development/demo credentials only. The login response is a JWT bearer token used by the frontend for protected `/api/v1/*` endpoints.

7. **Seed Sample Data** (optional, for testing)
   ```bash
   ./start.sh seed
   ```
   This will populate the database with realistic test data including:
   - 5 rental locations
   - Core classes plus a larger rental-market catalog with available and out-of-stock examples
   - Physical fleet coverage across branches/classes so agent pickup assignment has matching cars
   - 5 sample customers
   - 5 DB-backed seeded customer login accounts
   - inactive no-booking customer accounts for account-state demos
   - 5 reservations
   - 3 rental agreements
   - rental lifecycle audit events with actor, timestamp, reservation, contract, and notes

### Testing the API

### Using Swagger UI (Interactive Documentation)

1. **Open Swagger UI**
   ```
   http://localhost:8000/docs
   ```

2. **Seed Sample Data**
   ```bash
   ./start.sh seed
   ```

3. **Authorize Once**
   - Click `Authorize`
   - Paste the JWT returned by `POST /api/v1/auth/login`
   - Swagger is configured for Bearer auth, so paste only the token value

4. **Try API Endpoints**
   - Click on any endpoint to expand it
   - Click "Try it out"
   - Modify parameters if needed
   - Click "Execute"

### Example Test Scenarios

#### Get All Customers
```bash
GET http://localhost:8000/api/v1/customers
Authorization: Bearer {access_token}
```

#### Get All Available Cars
```bash
GET http://localhost:8000/api/v1/cars
Authorization: Bearer {access_token}
```

#### Fleet Operations Dashboard Summary
```bash
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

GET http://localhost:8000/api/v1/dashboard/overview
Authorization: Bearer {access_token}
```

#### Customer Self-Service Booking
```bash
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json

{
  "username": "john.doe",
  "password": "customer123"
}

GET http://localhost:8000/api/v1/customer-portal/catalog
Authorization: Bearer {access_token}

GET http://localhost:8000/api/v1/customer-portal/me
Authorization: Bearer {access_token}
```

#### Create a New Location
```bash
POST http://localhost:8000/api/v1/locations
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "street": "999 Test Drive",
  "city": "San Francisco",
  "state": "CA",
  "zip": "94105"
}
```

#### Create a Reservation
```bash
POST http://localhost:8000/api/v1/reservations
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "customer_id": "{customer_uuid}",
  "location_id": "{location_uuid}",
  "class_id": "{car_class_uuid}",
  "pickup_date_time": "2026-04-15T10:00:00",
  "return_date_time_requested": "2026-04-18T10:00:00",
   "reservation_status": "ACTIVE"
}
```

#### Create a Rental Agreement
```bash
POST http://localhost:8000/api/v1/rental-agreements
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "reservation_id": "{reservation_uuid}",
  "vin": "WBADT43452G942186",
  "rental_start_date_time": "2026-04-15T10:00:00"
}
```

The pickup odometer is derived by the API from the selected car's current odometer. If a client sends a stale or mismatched pickup odometer, the API rejects it. At return, submit only the new end odometer and optional actual cost override.

### Using cURL

```bash
# Log in and reuse the returned access_token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# List all customers
curl http://localhost:8000/api/v1/customers \
  -H "Authorization: Bearer {access_token}"

# List all cars
curl http://localhost:8000/api/v1/cars \
  -H "Authorization: Bearer {access_token}"

# View dashboard overview metrics
curl http://localhost:8000/api/v1/dashboard/overview \
  -H "Authorization: Bearer {access_token}"

# Get health status
curl http://localhost:8000/health

# View API version
curl http://localhost:8000/api/v1
```

## Available Commands

```bash
# Start services
./start.sh up

# Stop services
./start.sh down

# View logs
./start.sh logs
./start.sh logs-api
./start.sh debug-logs
./start.sh logs-db
./start.sh logs-frontend

# Start API with Python remote debugger on localhost:5678
./start.sh debug-api

# Rebuild images
./start.sh rebuild

# Clean up (remove containers and volumes)
./start.sh clean

# Run migrations only
./start.sh migrate

# Seed database with sample test data
./start.sh seed

# Run end-to-end mobile UI test
./start.sh e2e-ui

# Run live Docker-backed persona job E2E tests
./start.sh e2e-live

# Build the frontend locally
cd frontend && npm run build

# Run strict TypeScript checks locally
cd frontend && npm run typecheck

# Run local backend tests without writing coverage.xml
cd backend && python3 -m pytest --no-cov

# Run Trivy security scan
./start.sh scan

# Run backend tests and coverage
./start.sh test

# Show running services
./start.sh ps
```

## API Endpoints

### Base URL
```
http://localhost:8000/api/v1
```

### Resources
- `POST /auth/login`
- `POST /auth/customer-signup`
- `GET /auth/demo-customers`
- `GET|POST|PUT|DELETE /locations`
- `GET|POST|PUT|DELETE /customers`
- `GET|POST|PUT|DELETE /car-classes`
- `GET|POST|PUT|DELETE /models`
- `GET|POST|PUT|DELETE /cars`
- `GET|POST|PUT|DELETE /reservations`
- `GET|POST|PUT|DELETE /rental-agreements`
- `GET /customer-portal/catalog`
- `GET /customer-portal/me`
- `POST /customer-portal/bookings`
- `GET /customer-portal/summary/{customer_id}` for staff/customer-owned lookup compatibility
- `GET /dashboard/overview`

## CI/CD And Coverage

GitHub Actions workflow file: `.github/workflows/ci-cd.yml`

### CI (on pull requests and pushes to `main`)
- Install backend dependencies
- Run `pytest` with coverage
- Enforce minimum coverage threshold (`100%` for `app.main`)
- Upload `coverage.xml` as a workflow artifact
- Install frontend dependencies with Node 20
- Run the Vite production build
- Install Chromium and run Playwright persona-route E2E tests
- Build API and Liquibase Docker images

### CD (on pushes to `main`)
- Publish API image to GHCR:
   - `ghcr.io/<owner>/cs631-termproject-api:latest`
   - `ghcr.io/<owner>/cs631-termproject-api:<commit-sha>`

### Run Tests Locally
```bash
./start.sh test
```

Or directly with the same coverage gate:
```bash
docker-compose run --rm api pytest
```

For a fast local backend behavior check that does not rewrite tracked coverage output:
```bash
cd backend
python3 -m pytest --no-cov
```

Frontend checks:
```bash
cd frontend
npm ci
npm run typecheck
npm run build
npm run test:e2e:install
npm run test:e2e
```

The Playwright config starts the Vite dev server automatically. Keep the backend/API available when exercising screens that load live API data.
The committed Playwright suite is a persona-routing smoke test and mocks the API responses it needs; use the Docker demo path to test against live seeded backend data.

Live persona job checks:
```bash
./start.sh e2e-live
```

This starts Docker Compose, seeds Postgres, and runs browser tests for customer booking/trip tracking, agent intake/pickup/return, manager monitoring, and admin fleet/pricing controls.

## Database

### Schema
The database supports the full rental lifecycle across these primary entities:
- **locations**: Branch pickup and return sites
- **car_classes**: Rate cards by vehicle class
- **models** and **cars**: Fleet catalog and specific VIN inventory. Models belong to one car class, and cars inherit their reservation/pricing class through their selected model.
- **customers**: Customer identity, address, driver license, and payment data
- **customer_account**: DB-backed customer login linked 1:1 to a customer row
- **reservations**: Pickup/return requests by customer, class, and location
- **rental_agreements**: Open and returned/billed contracts tied to a reservation and VIN
- **rental_lifecycle_event**: durable audit trail of who reserved, canceled, picked up, opened, returned, and billed each trip

### Fleet And Pricing Governance

The admin console follows the same relational chain enforced by the database:

1. Create a `car_class` with daily and weekly rates.
2. Create a `model` under exactly one class.
3. Register a physical `car` VIN against an existing model and location.

The UI groups model choices by class and shows the selected model's governed class when registering a car. Backend endpoints return clear `409 Conflict` responses when a duplicate class/model/VIN is submitted or when a model, location, or class reference does not exist.

### Liquibase Migrations
Database schema is managed through Liquibase XML changesets:
- `01-init-schema.xml`: Creates extensions, functions, and triggers
- `02-create-tables.xml`: Defines table structures with constraints and indexes
- `03-add-business-constraints.xml`: Adds lifecycle, pricing, and data validation constraints
- `04-create-customer-accounts.xml`: Adds customer login accounts linked 1:1 to customers
- `05-add-rental-lifecycle-events.xml`: Adds reservation `FULFILLED` status and lifecycle audit events
- `06-add-reservation-return-location.xml`: Adds separate return location support

### Running Migrations
Migrations run automatically on service startup via `liquibase` container. To run manually:
```bash
docker-compose up liquibase
```

## Configuration

### Environment Variables
Create a `.env` file based on `.env.example`:

```env
# Database
DATABASE_USER=rental_user
DATABASE_PASSWORD=rental_password
DATABASE_NAME=rental_db
DATABASE_HOST=postgres
DATABASE_PORT=5432

# API
FASTAPI_ENV=development
API_PORT=8000
API_HOST=0.0.0.0
```

## Development

### Local Development (without Docker)

1. **Create virtual environment**
   ```bash
   python3.14 -m venv .venv
   source .venv/bin/activate
   cd backend
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run FastAPI server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Remote Debugging The API Container

Use the debug compose override when you want to attach a debugger to the running FastAPI container while keeping Postgres, Liquibase, and the frontend in Docker:

```bash
./start.sh debug-api
```

This keeps the API on `http://localhost:8000`, keeps the frontend on `http://localhost:5173`, and exposes the Python debugger on `localhost:5678`.

VS Code:
- Open the repository root.
- Run **Attach FastAPI Container** from `.vscode/launch.json`.
- Path mapping is `${workspaceFolder}/backend` to `/app`.

PyCharm or another debugger:
- Attach to host `localhost`, port `5678`.
- Map local `backend/` to remote `/app`.

By default the API starts immediately. To make the API wait for the debugger before serving requests:

```bash
DEBUGPY_WAIT_FOR_CLIENT=1 ./start.sh debug-api
```

View debug API logs with:

```bash
./start.sh debug-logs
```

Frontend debugging should use browser DevTools and Vite source maps. The frontend container runs browser-delivered React code, so a Node inspector is not needed for normal UI debugging.

## React Frontend

A simple React frontend is available in the `frontend` folder.

1. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Run the frontend dev server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   ```
   http://localhost:5173
   ```

Notes:
- Keep the backend running at `http://localhost:8000`.
- The Vite dev server proxies `/api` and `/health` to the backend.
- If you need a custom API host, set `VITE_API_BASE_URL`.
- Use Node.js 20+ locally; this matches the frontend Docker image and CI.

## Generated Artifacts

These files/directories are generated during local verification and should not be committed:
- `backend/coverage.xml`
- `backend/.coverage`
- `backend/.pytest_cache/`
- Python `__pycache__/` folders
- `frontend/dist/`
- `frontend/test-results/`
- `frontend/node_modules/`

## Architecture And Journey Diagrams

For visual workflow and architecture references:

- `docs/C4_ARCHITECTURE.md` (C4 context/container/component/deployment)
- `docs/DATABASE_ERD.md` (entity relationship model)
- `docs/USER_JOURNEYS.md` (user journey flowchart, sequence, and lifecycle diagrams)
- `docs/BPMN_WORKFLOWS.md` (mobile-first workflow mapping between roles, UI surfaces, and API touchpoints)

## User Journey Mapping

To support CS631 Phase I/II/III traceability from requirements to implementation and tests, see:

- `docs/USER_JOURNEYS.md`

This captures key workflows (reservation, pickup/rental creation, return/closeout, cancellation/no-show, and fleet administration) and maps each to entities and API endpoints.

## Troubleshooting

### Services not starting
```bash
# Check logs
./start.sh logs

# Rebuild images
./start.sh rebuild
```

### Database connection issues
```bash
# Ensure postgres is running
docker-compose ps

# Check database logs
./start.sh logs-db
```

### Migration failures
```bash
# Run migrations manually
docker-compose up liquibase

# View migration logs
docker-compose logs liquibase
```

### Playwright or frontend build fails locally
```bash
node --version
cd frontend
npm ci
npm run typecheck
npm run test:e2e:install
npm run build
```

Use Node.js 20 or newer. Node 19 is not supported by the current Vite/Playwright toolchain.

### Agent pickup vehicle dropdown is empty

The pickup form intentionally filters vehicles to cars that are not in an open rental and match both the reservation pickup branch and requested car class. Run `./start.sh seed` after pulling the latest seed script; the demo seed now ensures available branch/class fleet coverage for assignment flows while still preserving out-of-stock catalog examples for the customer booking experience.

## Next Steps

1. Review the [requirements document](docs/CS631_Term_Project_Phase1_Kundan Singh & Gustavo Abreu-1.docx)
2. Implement additional business logic based on requirements
3. Expand unit/integration test coverage across API route modules
4. Add environment-specific deployment targets
5. Deploy to production

---

**Course**: CS 631  
**Team**: Kundan Singh & Gustavo Abreu
