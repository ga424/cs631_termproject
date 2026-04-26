# Quick Start Guide - Testing the Rental Car API

## Prerequisites

1. **Ensure Docker Desktop is Running**
   - On macOS: Open `Docker.app` from Applications
   - You should see the Docker icon in your menu bar
2. **Use supported local runtimes when running checks outside Docker**
   - Python 3.14 for backend tests
   - Node.js 20+ for frontend typecheck, build, and Playwright E2E

## Step 1: Start All Services

```bash
cd /Users/gustavoabreu/njit/CS631/cs631_termproject
./start.sh up
```

**Expected Output:**
```
Starting all services...
Services started
Waiting for services to be ready...
  Container ID    Image                       Status
  ...
  rental_api      cs631_termproject_api:...   Up (healthy)
  rental_postgres cs631_termproject_postgres  Up (healthy)

API will be available at: http://localhost:8000
API Docs at: http://localhost:8000/docs
```

Wait for approximately 10-15 seconds for all services to be ready.

The frontend is available at `http://localhost:5173` and will route users into:
- `/customer`
- `/agent`
- `/manager`
- `/admin`

## Step 2: Populate with Sample Data

```bash
./start.sh seed
```

**Expected Output:**
```
Seeding database with sample data...
Creating sample data...
  - Adding locations...
  - Adding car classes...
  - Adding vehicle models...
  - Adding vehicles...
  - Adding customers...
  - Adding reservations...
  - Adding rental agreements...

✅ Sample data successfully created!
   - 5 locations
   - core and rental-market car classes
   - branch/class vehicle coverage for agent pickup assignment
   - 5 customers
   - 5 reservations
   - 3 rental agreements
   - customer login accounts and lifecycle audit events

You can now test the API at http://localhost:8000/docs
```

## Step 3: Test the API

## Step 3A: Test the Routed Frontend

1. Open `http://localhost:5173`
2. Choose a persona card
3. Sign in with one of the demo credentials:
   - Customer: select an active seeded customer from the sign-in dropdown, or use `john.doe` / `customer123`
   - Agent: `agent` / `agent123`
   - Manager: `manager` / `manager123`
   - Admin: `admin` / `admin123`
   - These credentials are for local development/demo use only.
4. Use **Create a customer account** on the landing page to create a new customer login linked to a new customer record.
5. Verify you are routed into the matching persona workspace.

## Step 3B: Test the API

### Option A: Interactive Swagger UI (Recommended)
1. Open browser: **http://localhost:8000/docs**
2. Run `POST /api/v1/auth/login`
3. Copy the `access_token` value from the response
4. Click **Authorize** and paste only the JWT token value
5. Open any protected endpoint, click **Try it out**, then **Execute**

## Optional: Attach A Debugger To The API Container

Start the Docker stack with the FastAPI container listening for a Python debugger:

```bash
./start.sh debug-api
```

Attach settings:
- Host: `localhost`
- Port: `5678`
- Local path: `backend/`
- Remote path: `/app`

VS Code users can run the included **Attach FastAPI Container** launch configuration. The API remains available at `http://localhost:8000`, and the frontend remains available at `http://localhost:5173`.

To pause the API until the debugger attaches:

```bash
DEBUGPY_WAIT_FOR_CLIENT=1 ./start.sh debug-api
```

### Option B: Command Line (cURL)

**Log in for a JWT first:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**List all customers:**
```bash
curl http://localhost:8000/api/v1/customers \
  -H "Authorization: Bearer {access_token}"
```

**List all cars:**
```bash
curl http://localhost:8000/api/v1/cars \
  -H "Authorization: Bearer {access_token}"
```

**List all reservations:**
```bash
curl http://localhost:8000/api/v1/reservations \
  -H "Authorization: Bearer {access_token}"
```

**Get API health status:**
```bash
curl http://localhost:8000/health
```

**Get API version:**
```bash
curl http://localhost:8000/api/v1
```

### Option C: Create a New Record

**Example: Create a new location**
```bash
curl -X POST http://localhost:8000/api/v1/locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {access_token}" \
  -d '{
    "street": "999 Test Drive",
    "city": "Denver",
    "state": "CO",
    "zip": "80202"
  }'
```

**Example: Customer self-service catalog**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john.doe","password":"customer123"}'

curl http://localhost:8000/api/v1/customer-portal/catalog \
  -H "Authorization: Bearer {access_token}"

curl http://localhost:8000/api/v1/customer-portal/me \
  -H "Authorization: Bearer {access_token}"
```

## Sample Data Included

### Locations (5 Total)
- New York, NY
- Los Angeles, CA
- Chicago, IL
- Houston, TX
- Phoenix, AZ

### Car Classes
- Economy: $35/day, $200/week
- Compact: $45/day, $250/week
- Mid-size: $55/day, $300/week
- Full-size: $75/day, $400/week
- SUV: $95/day, $500/week
- Luxury: $150/day, $800/week
- Additional market-style classes are included for the customer booking catalog, including available examples such as Full-Size, Intermediate, Standard SUV, Minivan, pickups, electric classes, and premium classes.
- Some classes are intentionally out of stock, such as Convertible, Premium Elite SUV, Signature Series, and select EV classes.

### Vehicles
- Toyota Corolla, Honda Civic, Ford Fusion
- Chevrolet Impala, Ford Explorer, BMW 7 Series
- Toyota Prius, Honda CR-V
- Additional deterministic coverage vehicles across locations and classes

The agent pickup vehicle dropdown only shows cars that match the selected reservation's pickup branch and class and are not already in an open rental. If it is empty after older seed data, run `./start.sh seed` again to add the latest branch/class fleet coverage.

### Customers (5 Total)
- John Doe (NY)
- Jane Smith (CA)
- Robert Johnson (IL)
- Emily Williams (TX)
- Michael Brown (AZ)

Seeded customer login usernames are generated as lowercase first/last names, for example `john.doe`, `jane.smith`, and `robert.johnson`. Active seeded customer demo accounts use the development-only password `customer123`. Inactive no-booking accounts are included in demo data and shown as disabled login choices.

### Sample Reservations & Rental Agreements
- Reserved, active-rental, returned/billed, canceled, and no-show examples
- Different vehicle classes
- Odometer readings tracked
- Lifecycle audit events showing who did what and when

## API Endpoints Reference

### Info Endpoints
- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /api/v1` - API version and endpoints
- `POST /api/v1/auth/login` - Obtain JWT bearer token
- `POST /api/v1/auth/customer-signup` - Create a customer plus linked customer login
- `GET /api/v1/auth/demo-customers` - List safe seeded customer demo login choices

### Resource Management
- **Locations**: `/api/v1/locations`
- **Customers**: `/api/v1/customers`
- **Car Classes**: `/api/v1/car-classes`
- **Models**: `/api/v1/models`
- **Cars**: `/api/v1/cars`
- **Reservations**: `/api/v1/reservations`
- **Rental Agreements**: `/api/v1/rental-agreements`
- **Customer Portal**: `/api/v1/customer-portal`
- **Dashboard**: `/api/v1/dashboard/overview`

### All Resources Support
- `GET /resource` - List all
- `GET /resource/{id}` - Get one
- `POST /resource` - Create
- `PUT /resource/{id}` - Update
- `DELETE /resource/{id}` - Delete

## Troubleshooting

### Can't access http://localhost:8000/docs

1. **Check if Docker is running**
   ```bash
   docker --version
   ```

2. **Check if containers are running**
   ```bash
   docker-compose ps
   ```

3. **View API logs**
   ```bash
   ./start.sh logs-api
   ```

4. **Restart services**
   ```bash
   ./start.sh down
   ./start.sh up
   ```

### Database connection issues

1. **Check database logs**
   ```bash
   ./start.sh logs-db
   ```

2. **Check database is healthy**
   ```bash
   docker-compose ps postgres
   ```

3. **Reset everything**
   ```bash
   ./start.sh clean
   ./start.sh up
   ./start.sh seed
   ```

### Port 8000 already in use

If another service is using port 8000:
```bash
# Find what's using the port
lsof -i :8000

# Or use a different port (edit docker-compose.yml)
```

### Playwright or frontend checks fail

Playwright and Vite require a supported Node runtime. Use Node.js 20+:
```bash
node --version
cd frontend
npm ci
npm run typecheck
npm run build
npm run test:e2e:install
npm run test:e2e
```

The Playwright config starts the Vite server automatically on `http://127.0.0.1:5173`.
The committed Playwright suite mocks the API responses needed for persona routing. Use `./start.sh up` and `./start.sh seed` when manually testing against live backend data.

## Common Test Workflows

### 1. Create a New Rental
1. Open http://localhost:8000/docs
2. Create a new `/customers` POST if needed
3. Create a new `/reservations` POST
4. Create a new `/rental-agreements` POST
5. View in GET `/rental-agreements`

### 2. Check Vehicle Availability
1. GET `/cars` to see all vehicles
2. GET `/reservations` to see booked periods
3. Compare to find available vehicles

### 3. Track Rental Costs
1. GET `/car-classes` to see rates
2. Calculate: `(return_date - pickup_date) * daily_rate`
3. Update `/rental-agreements` with `actual_cost`

## Next Steps

- Explore the Swagger documentation: http://localhost:8000/docs
- Sign in through the mobile-first frontend at `http://localhost:5173`
- Test customer, agent, manager, and admin personas
- Run backend tests without touching generated coverage output: `cd backend && python3 -m pytest --no-cov`
- Run strict frontend typecheck and build with `cd frontend && npm run typecheck && npm run build`
- Run persona E2E with `cd frontend && npm run test:e2e`
- Run live Docker-backed persona job E2E with `./start.sh e2e-live`
- Review workflow mapping in `docs/BPMN_WORKFLOWS.md`

---

For more information, see [README.md](./README.md)
