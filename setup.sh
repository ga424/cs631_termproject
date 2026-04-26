#!/bin/bash

# Docker Startup Check and Services Initialization Script
# This script verifies Docker is running and starts the rental car services

set -e

print_header() {
    echo ""
    echo "================================"
    echo "$1"
    echo "================================"
}

print_success() {
    echo "✅ $1"
}

print_error() {
    echo "❌ $1"
}

print_info() {
    echo "ℹ️  $1"
}

ensure_python314_venv() {
    local required_minor="3.14"
    local venv_dir=".venv"
    local venv_python="$venv_dir/bin/python"
    local python_cmd=""

    print_info "Validating local Python runtime for backend checks (requires Python $required_minor)..."

    if command -v python3.14 >/dev/null 2>&1; then
        python_cmd="python3.14"
    elif command -v python3 >/dev/null 2>&1; then
        local python3_version
        python3_version="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
        if [ "$python3_version" = "$required_minor" ]; then
            python_cmd="python3"
        fi
    fi

    if [ -z "$python_cmd" ]; then
        print_error "No Python $required_minor interpreter was found on PATH"
        echo ""
        echo "Install Python 3.14, then run this script again."
        echo ""
        echo "  macOS (Homebrew): brew install python@3.14"
        echo ""
        exit 1
    fi

    if [ -x "$venv_python" ]; then
        local venv_version
        venv_version="$($venv_python -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
        if [ "$venv_version" != "$required_minor" ]; then
            print_error "Detected $venv_dir with Python $venv_version (expected $required_minor)"
            echo ""
            echo "Recreate the virtual environment with Python $required_minor:"
            echo "  rm -rf $venv_dir"
            echo "  python3.14 -m venv $venv_dir"
            echo ""
            exit 1
        fi
        print_success "Using existing $venv_dir (Python $venv_version)"
        return
    fi

    print_info "Creating $venv_dir with $python_cmd..."
    "$python_cmd" -m venv "$venv_dir"
    print_success "Created $venv_dir with Python $required_minor"
}

print_header "Rental Car Management System - Startup Assistant"

# Check if Docker is running
print_info "Checking Docker daemon..."
if ! docker version &> /dev/null; then
    print_error "Docker daemon is NOT running"
    echo ""
    echo "Please start Docker Desktop:"
    echo ""
    echo "  📱 macOS: Open Finder → Applications → Docker.app"
    echo "  🪟 Windows: Start Menu → Docker Desktop"
    echo "  🐧 Linux: sudo systemctl start docker"
    echo ""
    echo "After starting Docker, please run this script again."
    exit 1
fi

DOCKER_VERSION=$(docker version --format '{{.Server.Version}}')
print_success "Docker is running (v$DOCKER_VERSION)"

# Navigate to project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

ensure_python314_venv

print_header "Starting Services"

# Stop any existing containers
print_info "Checking for existing containers..."
if docker-compose ps --services 2>/dev/null | grep -q .; then
    print_info "Found existing containers, cleaning up..."
    docker-compose down --remove-orphans 2>/dev/null || true
    sleep 2
fi

# Start services
print_info "Starting PostgreSQL database..."
docker-compose up -d postgres
sleep 3

print_info "PostgreSQL starting... waiting for health check"
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U rental_user &> /dev/null; then
        print_success "PostgreSQL is healthy"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start"
        docker-compose logs postgres
        exit 1
    fi
done

print_info "Running database migrations with Liquibase..."
docker-compose up liquibase
print_success "Database migrations completed"

print_info "Starting FastAPI application..."
docker-compose up -d api
sleep 3

print_info "Waiting for API to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health &> /dev/null; then
        print_success "FastAPI API is healthy"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 30 ]; then
        print_error "API failed to start"
        docker-compose logs api
        exit 1
    fi
done

print_header "Services Status"
docker-compose ps

print_header "API Access Information"
echo ""
echo "🌐 Web Interface (Swagger UI):"
echo "   http://localhost:8000/docs"
echo ""
echo "📄 Alternative Documentation (ReDoc):"
echo "   http://localhost:8000/redoc"
echo ""
echo "❤️  Health Check:"
echo "   http://localhost:8000/health"
echo ""

print_header "Next Steps"
echo ""
echo "1️⃣  Seed Database with Sample Data:"
echo "    ./start.sh seed"
echo ""
echo "2️⃣  Open Swagger UI in your browser:"
echo "    http://localhost:8000/docs"
echo ""
echo "3️⃣  Test API Endpoints:"
echo "    - Try GET requests to see sample data"
echo "    - Try POST requests to create new records"
echo "    - Try PUT/DELETE for updates"
echo ""

print_header "View Logs"
echo ""
echo "API Logs:      ./start.sh logs-api"
echo "DB Logs:       ./start.sh logs-db"
echo "All Logs:      ./start.sh logs"
echo ""

print_success "All services are running!"
