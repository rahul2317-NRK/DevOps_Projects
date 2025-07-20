#!/bin/bash

# Blue Pixel AI Chatbot - Ultimate Full Functionality Launcher
# This script provides complete deployment options for all platforms

set -e

echo "🤖 Blue Pixel AI Chatbot - Full Functionality Launcher"
echo "======================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v18 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version must be 16 or higher. Current version: $(node -v)"
        exit 1
    fi
    
    print_status "Node.js $(node -v) ✓"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    
    print_status "npm $(npm -v) ✓"
}

# Setup environment
setup_environment() {
    print_info "Setting up environment..."
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env
        print_info "Please update .env file with your configuration"
    fi
    
    # Create necessary directories
    mkdir -p logs uploads client/build
    
    print_status "Environment setup complete"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install client dependencies
    cd client
    npm install
    cd ..
    
    print_status "Dependencies installed"
}

# Build frontend
build_frontend() {
    print_info "Building React frontend..."
    
    cd client
    npm run build
    cd ..
    
    if [ -d "client/build" ]; then
        print_status "Frontend built successfully"
    else
        print_error "Frontend build failed"
        exit 1
    fi
}

# Local development launcher
launch_development() {
    print_info "Starting development environment..."
    print_info "This will start both backend and frontend in development mode"
    
    setup_environment
    install_dependencies
    
    print_status "Starting development servers..."
    npm run dev
}

# Production launcher
launch_production() {
    print_info "Starting production environment..."
    
    setup_environment
    install_dependencies
    build_frontend
    
    print_status "Starting production server..."
    NODE_ENV=production npm start
}

# Docker launcher
launch_docker() {
    print_info "Launching with Docker..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_info "Building and starting Docker containers..."
    docker-compose up --build -d
    
    print_status "Docker containers started successfully!"
    print_info "Application will be available at: http://localhost:5000"
    print_info "MongoDB will be available at: localhost:27017"
    print_info "Redis will be available at: localhost:6379"
    
    echo ""
    print_info "To view logs: docker-compose logs -f"
    print_info "To stop: docker-compose down"
    print_info "To stop and remove volumes: docker-compose down -v"
}

# Test the application
test_application() {
    print_info "Testing application..."
    
    # Wait for server to start
    sleep 5
    
    # Test health endpoint
    if curl -s http://localhost:5000/api/health > /dev/null; then
        print_status "Health check passed"
    else
        print_error "Health check failed"
        return 1
    fi
    
    # Test MCP endpoint
    RESPONSE=$(curl -s -X POST http://localhost:5000/api/mcp/test \
        -H "Content-Type: application/json" \
        -d '{"message": "Hello, test message"}')
    
    if echo "$RESPONSE" | grep -q "success"; then
        print_status "MCP test passed"
    else
        print_error "MCP test failed"
        return 1
    fi
    
    print_status "All tests passed!"
}

# Platform-specific deployment
deploy_platform() {
    local platform=$1
    
    case $platform in
        "heroku")
            print_info "Preparing for Heroku deployment..."
            
            if ! command -v heroku &> /dev/null; then
                print_error "Heroku CLI is not installed."
                exit 1
            fi
            
            build_frontend
            
            print_info "Creating Procfile..."
            echo "web: node server/index.js" > Procfile
            
            print_info "Ready for Heroku deployment!"
            print_info "Run: git add . && git commit -m 'Deploy to Heroku' && git push heroku main"
            ;;
            
        "railway")
            print_info "Preparing for Railway deployment..."
            
            build_frontend
            
            print_info "Creating railway.json..."
            cat > railway.json << EOF
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server/index.js",
    "healthcheckPath": "/api/health"
  }
}
EOF
            
            print_info "Ready for Railway deployment!"
            print_info "Connect your repository to Railway and deploy"
            ;;
            
        "vercel")
            print_info "Preparing for Vercel deployment..."
            
            if ! command -v vercel &> /dev/null; then
                print_error "Vercel CLI is not installed."
                print_info "Install with: npm i -g vercel"
                exit 1
            fi
            
            build_frontend
            
            print_info "Creating vercel.json..."
            cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "client/build/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/client/build/\$1"
    }
  ]
}
EOF
            
            print_status "Ready for Vercel deployment!"
            print_info "Run: vercel --prod"
            ;;
            
        "render")
            print_info "Preparing for Render deployment..."
            
            build_frontend
            
            print_info "Creating render.yaml..."
            cat > render.yaml << EOF
services:
  - type: web
    name: blue-pixel-chatbot
    env: node
    buildCommand: npm install && cd client && npm install && npm run build
    startCommand: node server/index.js
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
databases:
  - name: blue-pixel-mongodb
    databaseName: blue-pixel-chatbot
    user: blue-pixel-user
EOF
            
            print_status "Ready for Render deployment!"
            print_info "Connect your repository to Render and deploy"
            ;;
            
        *)
            print_error "Unknown platform: $platform"
            print_info "Supported platforms: heroku, railway, vercel, render"
            exit 1
            ;;
    esac
}

# Show menu
show_menu() {
    echo ""
    print_info "Choose your deployment option:"
    echo ""
    echo "1) 🚀 Local Development (with hot reload)"
    echo "2) 🏭 Local Production (built frontend)"
    echo "3) 🐳 Docker (full stack with database)"
    echo "4) ☁️  Deploy to Heroku"
    echo "5) 🚄 Deploy to Railway"
    echo "6) ▲  Deploy to Vercel"
    echo "7) 🎨 Deploy to Render"
    echo "8) 🧪 Test Application"
    echo "9) ❓ Show Help"
    echo "0) 🚪 Exit"
    echo ""
}

# Show help
show_help() {
    echo ""
    print_info "Blue Pixel AI Chatbot - Full Functionality Guide"
    echo "=============================================="
    echo ""
    echo "🎯 Features:"
    echo "  • Complete React frontend with Material-UI"
    echo "  • Real-time Socket.IO chat communication"
    echo "  • Full MCP (Model Context Protocol) integration"
    echo "  • 8 specialized AI tools for real estate"
    echo "  • MongoDB database with sample data"
    echo "  • Advanced mortgage calculations"
    echo "  • Property search and management"
    echo "  • User authentication and sessions"
    echo ""
    echo "🚀 Quick Start:"
    echo "  ./launch.sh                    # Interactive menu"
    echo "  ./launch.sh dev                # Development mode"
    echo "  ./launch.sh prod               # Production mode"
    echo "  ./launch.sh docker             # Docker deployment"
    echo ""
    echo "☁️  Cloud Deployment:"
    echo "  ./launch.sh heroku             # Prepare for Heroku"
    echo "  ./launch.sh railway            # Prepare for Railway"
    echo "  ./launch.sh vercel             # Prepare for Vercel"
    echo "  ./launch.sh render             # Prepare for Render"
    echo ""
    echo "🔧 Environment Variables:"
    echo "  OPENAI_API_KEY                 # For AI responses"
    echo "  MONGODB_URI                    # Database connection"
    echo "  JWT_SECRET                     # Authentication"
    echo ""
    echo "📚 Documentation:"
    echo "  README.md                      # Main documentation"
    echo "  NETLIFY_DEPLOYMENT.md          # Netlify-specific guide"
    echo ""
}

# Main script logic
main() {
    check_prerequisites
    
    if [ $# -eq 0 ]; then
        # Interactive mode
        while true; do
            show_menu
            read -p "Enter your choice [0-9]: " choice
            
            case $choice in
                1) launch_development ;;
                2) launch_production ;;
                3) launch_docker ;;
                4) deploy_platform "heroku" ;;
                5) deploy_platform "railway" ;;
                6) deploy_platform "vercel" ;;
                7) deploy_platform "render" ;;
                8) test_application ;;
                9) show_help ;;
                0) print_info "Goodbye! 👋"; exit 0 ;;
                *) print_error "Invalid option. Please try again." ;;
            esac
            
            if [ "$choice" != "9" ]; then
                echo ""
                read -p "Press Enter to continue..."
            fi
        done
    else
        # Command line mode
        case $1 in
            "dev"|"development") launch_development ;;
            "prod"|"production") launch_production ;;
            "docker") launch_docker ;;
            "heroku"|"railway"|"vercel"|"render") deploy_platform $1 ;;
            "test") test_application ;;
            "help"|"-h"|"--help") show_help ;;
            *) 
                print_error "Unknown command: $1"
                show_help
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"