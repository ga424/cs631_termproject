#!/usr/bin/env bash

# Color outputs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Help function
help() {
    cat << EOF
Usage: ./start.sh [COMMAND]

Commands:
    up              Start all services
    down            Stop all services
    logs            View logs
    logs-api        View API logs
    debug-api       Start API container with debugpy attach on localhost:5678
    debug-logs      View API logs using the debug compose override
    logs-frontend   View frontend logs
    logs-db         View database logs
    logs-pgadmin    View pgAdmin logs
    build           Build Docker images
    rebuild         Rebuild Docker images from scratch
    ps              Show running services
    clean           Remove containers, volumes, and networks
    migrate         Run Liquibase migrations only
    seed            Seed database with sample test data
    e2e-dashboard   Backward-compatible alias for the mobile UI E2E smoke test
    e2e-ui          Seed DB and run frontend mobile UI E2E smoke test
    e2e-live        Seed DB and run live Docker-backed persona job E2E tests
    frontend-build  Run a local production build of the routed frontend
    scan            Run Trivy security scan
    test            Run backend tests with coverage
    help            Show this help message

Environment variables:
    DATABASE_USER       Database user (default: rental_user)
    DATABASE_PASSWORD   Database password (default: rental_password)
    DATABASE_NAME       Database name (default: rental_db)
    FASTAPI_ENV         FastAPI environment (default: development)
    PGADMIN_DEFAULT_EMAIL      pgAdmin login email (default: admin@rentacar.dev)
    PGADMIN_DEFAULT_PASSWORD   pgAdmin login password (default: admin123)

Examples:
    ./start.sh up
    ./start.sh logs -f
    ./start.sh down
    ./start.sh rebuild

EOF
}

# Change to script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    cp .env.example .env
    echo -e "${YELLOW}Created .env from .env.example${NC}"
fi

# Handle commands
case "${1:-help}" in
    up)
        # Starts all services with dependency ordering handled by compose.
        echo -e "${GREEN}Starting all services...${NC}"
        docker-compose up -d
        echo -e "${GREEN}Services started${NC}"
        echo -e "${YELLOW}Waiting for services to be ready...${NC}"
        sleep 5
        docker-compose ps
        echo ""
        echo -e "${GREEN}API will be available at: http://localhost:8000${NC}"
        echo -e "${GREEN}API Docs at: http://localhost:8000/docs${NC}"
        echo -e "${GREEN}Frontend will be available at: http://localhost:5173${NC}"
        echo -e "${GREEN}pgAdmin will be available at: http://localhost:5050${NC}"
        echo -e "${GREEN}pgAdmin login: ${PGADMIN_DEFAULT_EMAIL:-admin@rentacar.dev} / ${PGADMIN_DEFAULT_PASSWORD:-admin123}${NC}"
        ;;
    down)
        echo -e "${GREEN}Stopping all services...${NC}"
        docker-compose down
        echo -e "${GREEN}Services stopped${NC}"
        ;;
    logs)
        docker-compose logs -f "${@:2}"
        ;;
    logs-api)
        docker-compose logs -f api
        ;;
    debug-api)
        # Starts the normal stack but overrides the API command with debugpy.
        echo -e "${GREEN}Starting API in remote debug mode...${NC}"
        docker-compose -f docker-compose.yml -f docker-compose.debug.yml up -d --build api frontend
        echo ""
        echo -e "${GREEN}API available at: http://localhost:8000${NC}"
        echo -e "${GREEN}Frontend available at: http://localhost:5173${NC}"
        echo -e "${GREEN}Python debugger attach port: localhost:5678${NC}"
        echo -e "${YELLOW}VS Code: use launch config 'Attach FastAPI Container'.${NC}"
        echo -e "${YELLOW}Path mapping: local backend/ -> remote /app.${NC}"
        echo -e "${YELLOW}Set DEBUGPY_WAIT_FOR_CLIENT=1 before running this command if the API should pause until the debugger attaches.${NC}"
        ;;
    debug-logs)
        docker-compose -f docker-compose.yml -f docker-compose.debug.yml logs -f api
        ;;
    logs-frontend)
        docker-compose logs -f frontend
        ;;
    logs-db)
        docker-compose logs -f postgres
        ;;
    logs-pgadmin)
        docker-compose logs -f pgadmin
        ;;
    build)
        echo -e "${GREEN}Building Docker images...${NC}"
        docker-compose build
        ;;
    rebuild)
        echo -e "${GREEN}Rebuilding Docker images (no cache)...${NC}"
        docker-compose build --no-cache
        ;;
    ps)
        docker-compose ps
        ;;
    clean)
        echo -e "${YELLOW}Removing containers, volumes, and networks...${NC}"
        docker-compose down -v
        echo -e "${GREEN}Cleanup complete${NC}"
        ;;
    migrate)
        # Runs only schema migrations; useful after editing Liquibase changesets.
        echo -e "${GREEN}Running migrations...${NC}"
        docker-compose up -d postgres
        sleep 3
        docker-compose up liquibase
        ;;
    seed)
        # Loads deterministic sample records for local testing and demos.
        echo -e "${GREEN}Seeding database with sample data...${NC}"
        docker-compose up -d postgres
        sleep 2
        if ! docker-compose exec -T api python seed_data.py; then
            echo -e "${RED}Database seed failed.${NC}"
            exit 1
        fi
        echo -e "${GREEN}Database seeded successfully!${NC}"
        ;;
    e2e-dashboard|e2e-ui)
        # Validates the UI click flow using real seeded backend data.
        echo -e "${GREEN}Ensuring services are up...${NC}"
        docker-compose up -d --build
        echo -e "${GREEN}Seeding database with sample data...${NC}"
        docker-compose exec -T api python seed_data.py
        echo -e "${GREEN}Running mobile UI E2E test...${NC}"
        (cd frontend && npm ci && npm run test:e2e:install && npm run test:e2e)
        ;;
    e2e-live)
        # Validates each persona against Docker Compose services and seeded Postgres data.
        echo -e "${GREEN}Ensuring services are up...${NC}"
        docker-compose up -d --build
        echo -e "${GREEN}Seeding database with sample data...${NC}"
        docker-compose exec -T api python seed_data.py
        echo -e "${GREEN}Running live persona E2E tests...${NC}"
        (cd frontend && npm ci && npm run test:e2e:install && npm run test:e2e:live)
        ;;
    frontend-build)
        # Builds the routed frontend locally to catch integration regressions quickly.
        echo -e "${GREEN}Building routed frontend...${NC}"
        (cd frontend && npm run build)
        ;;
    scan)
        # Runs a filesystem Trivy scan against the repository contents.
        echo -e "${GREEN}Running Trivy security scan...${NC}"
                docker run --rm -v "$PWD":/repo -w /repo aquasec/trivy:0.69.3 fs \
                    --scanners vuln,secret,misconfig \
          --severity HIGH,CRITICAL \
          --ignore-unfixed \
          .
        ;;
    test)
        # Runs pytest inside the API container to match CI behavior.
        echo -e "${GREEN}Running backend tests with coverage...${NC}"
        docker-compose run --rm api pytest
        ;;
    help|*)
        help
        ;;
esac
