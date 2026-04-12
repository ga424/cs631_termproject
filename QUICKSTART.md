# Quick Start Guide - Testing the Rental Car API

## Prerequisites

1. **Ensure Docker Desktop is Running**
   - On macOS: Open `Docker.app` from Applications
   - You should see the Docker icon in your menu bar

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
   - 6 car classes
   - 8 vehicle models
   - 10 vehicles
   - 5 customers
   - 5 reservations
   - 3 rental agreements

You can now test the API at http://localhost:8000/docs
```

## Step 3: Test the API

### Option A: Interactive Swagger UI (Recommended)
1. Open browser: **http://localhost:8000/docs**
2. You'll see all available endpoints
3. Click on any endpoint to expand it
4. Click "Try it out"
5. Click "Execute" to test

### Option B: Command Line (cURL)

**List all customers:**
```bash
curl http://localhost:8000/api/v1/customers
```

**List all cars:**
```bash
curl http://localhost:8000/api/v1/cars
```

**List all reservations:**
```bash
curl http://localhost:8000/api/v1/reservations
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
  -d '{
    "street": "999 Test Drive",
    "city": "Denver",
    "state": "CO",
    "zip": "80202"
  }'
```

## Sample Data Included

### Locations (5 Total)
- New York, NY
- Los Angeles, CA
- Chicago, IL
- Houston, TX
- Phoenix, AZ

### Car Classes (6 Total)
- Economy: $35/day, $200/week
- Compact: $45/day, $250/week
- Mid-size: $55/day, $300/week
- Full-size: $75/day, $400/week
- SUV: $95/day, $500/week
- Luxury: $150/day, $800/week

### Vehicles (10 Total)
- Toyota Corolla, Honda Civic, Ford Fusion
- Chevrolet Impala, Ford Explorer, BMW 7 Series
- Toyota Prius, Honda CR-V
- And more...

### Customers (5 Total)
- John Doe (NY)
- Jane Smith (CA)
- Robert Johnson (IL)
- Emily Williams (TX)
- Michael Brown (AZ)

### Sample Reservations & Rental Agreements
- Various active and completed rentals
- Different vehicle classes
- Odometer readings tracked

## API Endpoints Reference

### Info Endpoints
- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /api/v1` - API version and endpoints

### Resource Management
- **Locations**: `/api/v1/locations`
- **Customers**: `/api/v1/customers`
- **Car Classes**: `/api/v1/car-classes`
- **Models**: `/api/v1/models`
- **Cars**: `/api/v1/cars`
- **Reservations**: `/api/v1/reservations`
- **Rental Agreements**: `/api/v1/rental-agreements`

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
- Test all CRUD operations
- Create realistic business workflows
- Implement business logic for rental calculations
- Add authentication/authorization as needed

---

For more information, see [README.md](./README.md)
