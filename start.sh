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
    logs-frontend   View frontend logs
    logs-db         View database logs
    build           Build Docker images
    rebuild         Rebuild Docker images from scratch
    ps              Show running services
    clean           Remove containers, volumes, and networks
    migrate         Run Liquibase migrations only
    seed            Seed database with sample test data
    e2e-dashboard   Seed DB and run frontend dashboard E2E test
    scan            Run Trivy security scan
    test            Run backend tests with coverage
    help            Show this help message

Environment variables:
    DATABASE_USER       Database user (default: rental_user)
    DATABASE_PASSWORD   Database password (default: rental_password)
    DATABASE_NAME       Database name (default: rental_db)
    FASTAPI_ENV         FastAPI environment (default: development)

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
    logs-frontend)
        docker-compose logs -f frontend
        ;;
    logs-db)
        docker-compose logs -f postgres
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
        docker-compose exec -T api python seed_data.py
        echo -e "${GREEN}Database seeded successfully!${NC}"
        ;;
    e2e-dashboard)
        # Validates the UI click flow using real seeded backend data.
        echo -e "${GREEN}Ensuring services are up...${NC}"
        docker-compose up -d --build
        echo -e "${GREEN}Seeding database with sample data...${NC}"
        docker-compose exec -T api python seed_data.py
        echo -e "${GREEN}Running dashboard E2E test...${NC}"
        (cd frontend && npm install && npx playwright install chromium && npm run test:e2e)
        ;;
    scan)
        # Runs a filesystem Trivy scan against the repository contents.
        echo -e "${GREEN}Running Trivy security scan...${NC}"
                docker run --rm -v "$PWD":/repo -w /repo aquasec/trivy:0.69.3 fs \
          --scanners vuln,secret,config \
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
