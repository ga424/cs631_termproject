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

### Project Structure
```
.
├── backend/                          # FastAPI application
│   ├── app/
│   │   ├── api/                     # API route handlers
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
│   ├── src/                         # Frontend source code
│   ├── package.json                 # Frontend dependencies/scripts
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
   - Frontend Dashboard: `http://localhost:5173`

6. **Seed Sample Data** (optional, for testing)
   ```bash
   ./start.sh seed
   ```
   This will populate the database with realistic test data including:
   - 5 rental locations
   - 6 car classes (Economy, Compact, Mid-size, Full-size, SUV, Luxury)
   - 8 vehicle models
   - 10 individual vehicles (cars/SUVs)
   - 5 sample customers
   - 5 reservations
   - 3 rental agreements

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

3. **Try API Endpoints**
   - Click on any endpoint to expand it
   - Click "Try it out"
   - Modify parameters if needed
   - Click "Execute"

### Example Test Scenarios

#### Get All Customers
```bash
GET http://localhost:8000/api/v1/customers
```

#### Get All Available Cars
```bash
GET http://localhost:8000/api/v1/cars
```

#### Fleet Operations Dashboard Summary
```bash
GET http://localhost:8000/api/v1/dashboard/overview
```

#### Create a New Location
```bash
POST http://localhost:8000/api/v1/locations
Content-Type: application/json

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

{
  "reservation_id": "{reservation_uuid}",
  "vin": "WBADT43452G942186",
  "rental_start_date_time": "2026-04-15T10:00:00",
  "start_odometer_reading": 15000
}
```

### Using cURL

```bash
# List all customers
curl http://localhost:8000/api/v1/customers

# List all cars
curl http://localhost:8000/api/v1/cars

# View dashboard overview metrics
curl http://localhost:8000/api/v1/dashboard/overview

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
./start.sh logs-db
./start.sh logs-frontend

# Rebuild images
./start.sh rebuild

# Clean up (remove containers and volumes)
./start.sh clean

# Run migrations only
./start.sh migrate

# Seed database with sample test data
./start.sh seed

# Run end-to-end dashboard UI test (clicks Load Dashboard)
./start.sh e2e-dashboard

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
- `GET|POST|PUT|DELETE /locations`
- `GET|POST|PUT|DELETE /customers`
- `GET|POST|PUT|DELETE /car-classes`
- `GET|POST|PUT|DELETE /models`
- `GET|POST|PUT|DELETE /cars`
- `GET|POST|PUT|DELETE /reservations`
- `GET|POST|PUT|DELETE /rental-agreements`
- `GET /dashboard/overview`

## CI/CD And Coverage

GitHub Actions workflow file: `.github/workflows/ci-cd.yml`

### CI (on pull requests and pushes to `main`)
- Install backend dependencies
- Run `pytest` with coverage
- Enforce minimum coverage threshold (`85%` for `app.main`)
- Upload `coverage.xml` as a workflow artifact
- Build API and Liquibase Docker images

### CD (on pushes to `main`)
- Publish API image to GHCR:
   - `ghcr.io/<owner>/cs631-termproject-api:latest`
   - `ghcr.io/<owner>/cs631-termproject-api:<commit-sha>`

### Run Tests Locally
```bash
./start.sh test
```

Or directly:
```bash
docker-compose run --rm api pytest
```

## Database

### Schema
The database includes three main tables:
- **vehicles**: Vehicle inventory
- **customers**: Customer information
- **rentals**: Rental records with relationships to vehicles and customers

### Liquibase Migrations
Database schema is managed through Liquibase XML changesets:
- `01-init-schema.xml`: Creates extensions, functions, and triggers
- `02-create-tables.xml`: Defines table structures with constraints and indexes

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
   cd backend
   python3.11 -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run FastAPI server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

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

## Architecture And Journey Diagrams

For visual workflow and architecture references:

- `docs/C4_ARCHITECTURE.md` (C4 context/container/component/deployment)
- `docs/DATABASE_ERD.md` (entity relationship model)
- `docs/USER_JOURNEYS.md` (user journey flowchart, sequence, and lifecycle diagrams)

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

## Next Steps

1. Review the [requirements document](docs/CS631_Term_Project_Phase1_Kundan Singh & Gustavo Abreu-1.docx)
2. Implement additional business logic based on requirements
3. Expand unit/integration test coverage across API route modules
4. Add environment-specific deployment targets
5. Deploy to production

---

**Course**: CS 631  
**Team**: Kundan Singh & Gustavo Abreu
