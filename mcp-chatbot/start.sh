#!/bin/bash

# MCP Chatbot Startup Script
# This script helps you start the MCP chatbot system in different modes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}    MCP Chatbot System${NC}"
    echo -e "${BLUE}================================${NC}"
    echo
}

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Function to check if Python is installed
check_python() {
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python 3.11+ first."
        exit 1
    fi
    
    python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    if [[ $(echo "$python_version < 3.11" | bc -l) -eq 1 ]]; then
        print_error "Python 3.11+ is required. Current version: $python_version"
        exit 1
    fi
}

# Function to start with Docker
start_docker() {
    print_status "Starting MCP Chatbot with Docker..."
    
    check_docker
    
    # Create necessary directories
    mkdir -p logs data
    
    # Start services
    cd docker
    docker-compose up -d
    
    print_status "Services starting up..."
    sleep 10
    
    # Check service health
    print_status "Checking service health..."
    
    # Wait for API Gateway to be ready
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:8000/health &> /dev/null; then
            print_status "API Gateway is ready!"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "API Gateway failed to start within 60 seconds"
        docker-compose logs api-gateway
        exit 1
    fi
    
    print_status "MCP Chatbot is now running!"
    echo
    echo "🌐 Web Interface: http://localhost"
    echo "📚 API Documentation: http://localhost:8000/docs"
    echo "📊 Grafana Dashboard: http://localhost:3000 (admin/admin)"
    echo "📈 Prometheus Metrics: http://localhost:9090"
    echo
    echo "To stop the system, run: ./start.sh stop"
}

# Function to start in development mode
start_dev() {
    print_status "Starting MCP Chatbot in development mode..."
    
    check_python
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_status "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    print_status "Installing dependencies..."
    pip install -r requirements.txt
    
    # Set environment variables
    export PYTHONPATH=$(pwd)
    export MCP_SERVER_HOST=localhost
    export MCP_SERVER_PORT=8001
    
    # Create necessary directories
    mkdir -p logs data
    
    # Start MCP server in background
    print_status "Starting MCP server..."
    python -m mcp_server.server &
    MCP_SERVER_PID=$!
    
    # Wait for MCP server to start
    sleep 5
    
    # Start API gateway in background
    print_status "Starting API gateway..."
    python -m api_gateway.main &
    API_GATEWAY_PID=$!
    
    # Wait for API gateway to start
    sleep 5
    
    # Check if services are running
    if curl -f http://localhost:8000/health &> /dev/null; then
        print_status "MCP Chatbot is now running in development mode!"
        echo
        echo "🌐 Web Interface: Open web-interface/index.html in your browser"
        echo "📚 API Documentation: http://localhost:8000/docs"
        echo
        echo "Process IDs:"
        echo "  MCP Server: $MCP_SERVER_PID"
        echo "  API Gateway: $API_GATEWAY_PID"
        echo
        echo "To stop the system, run: ./start.sh stop-dev"
        
        # Save PIDs for cleanup
        echo $MCP_SERVER_PID > .mcp_server.pid
        echo $API_GATEWAY_PID > .api_gateway.pid
    else
        print_error "Failed to start services"
        kill $MCP_SERVER_PID $API_GATEWAY_PID 2>/dev/null || true
        exit 1
    fi
}

# Function to stop Docker services
stop_docker() {
    print_status "Stopping MCP Chatbot Docker services..."
    
    cd docker
    docker-compose down
    
    print_status "Docker services stopped."
}

# Function to stop development services
stop_dev() {
    print_status "Stopping MCP Chatbot development services..."
    
    # Kill processes using saved PIDs
    if [ -f .mcp_server.pid ]; then
        MCP_SERVER_PID=$(cat .mcp_server.pid)
        kill $MCP_SERVER_PID 2>/dev/null || true
        rm .mcp_server.pid
    fi
    
    if [ -f .api_gateway.pid ]; then
        API_GATEWAY_PID=$(cat .api_gateway.pid)
        kill $API_GATEWAY_PID 2>/dev/null || true
        rm .api_gateway.pid
    fi
    
    # Also kill any remaining processes
    pkill -f "mcp_server.server" 2>/dev/null || true
    pkill -f "api_gateway.main" 2>/dev/null || true
    
    print_status "Development services stopped."
}

# Function to show logs
show_logs() {
    if [ -f docker/docker-compose.yml ]; then
        cd docker
        docker-compose logs -f
    else
        print_error "Docker services not found. Run with 'docker' mode first."
    fi
}

# Function to show status
show_status() {
    print_status "Checking MCP Chatbot status..."
    
    # Check Docker services
    if command -v docker &> /dev/null && docker ps | grep -q mcp-chatbot; then
        echo
        echo "🐳 Docker Services:"
        docker ps --filter "name=mcp-chatbot" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    fi
    
    # Check local services
    if curl -f http://localhost:8000/health &> /dev/null; then
        echo
        echo "🚀 Local Services:"
        echo "  ✅ API Gateway: http://localhost:8000"
        
        if curl -f http://localhost:8001 &> /dev/null; then
            echo "  ✅ MCP Server: http://localhost:8001"
        else
            echo "  ❌ MCP Server: Not responding"
        fi
    else
        echo
        echo "❌ No services detected running"
    fi
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    check_python
    
    # Activate virtual environment if it exists
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    # Install test dependencies
    pip install pytest pytest-asyncio httpx
    
    # Run tests
    if [ -d "tests" ]; then
        pytest tests/ -v
    else
        print_warning "No tests directory found. Creating sample test..."
        mkdir -p tests
        cat > tests/test_basic.py << 'EOF'
import pytest
import httpx

@pytest.mark.asyncio
async def test_health_endpoint():
    """Test that the health endpoint is accessible"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://localhost:8000/health")
            assert response.status_code == 200
        except httpx.ConnectError:
            pytest.skip("API Gateway not running")
EOF
        pytest tests/test_basic.py -v
    fi
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  docker     Start with Docker (recommended)"
    echo "  dev        Start in development mode"
    echo "  stop       Stop Docker services"
    echo "  stop-dev   Stop development services"
    echo "  logs       Show Docker service logs"
    echo "  status     Show system status"
    echo "  test       Run tests"
    echo "  help       Show this help message"
    echo
    echo "Examples:"
    echo "  $0 docker    # Start with Docker"
    echo "  $0 dev       # Start in development mode"
    echo "  $0 status    # Check system status"
    echo "  $0 stop      # Stop all services"
}

# Main script logic
main() {
    print_header
    
    case "${1:-help}" in
        docker)
            start_docker
            ;;
        dev)
            start_dev
            ;;
        stop)
            stop_docker
            ;;
        stop-dev)
            stop_dev
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        test)
            run_tests
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"