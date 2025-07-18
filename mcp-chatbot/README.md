# MCP Chatbot Architecture

A comprehensive chatbot system built on the Model Context Protocol (MCP) that provides secure, scalable, and extensible conversational AI capabilities.

## 🏗️ Architecture Overview

The MCP Chatbot system follows a modular, microservices architecture with the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Interface │    │   API Gateway   │    │   MCP Server    │
│    (Frontend)   │◄──►│   (FastAPI)     │◄──►│   (Python)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │   Chatbot Core  │
                       │   (Database)    │    │   (AI Logic)    │
                       └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Redis       │    │   MCP Client    │
                       │   (Caching)     │    │   (Interface)   │
                       └─────────────────┘    └─────────────────┘
```

## 🚀 Key Features

### Core Capabilities
- **MCP Protocol Integration**: Built on the Model Context Protocol for secure resource access
- **Real-time Communication**: WebSocket support for instant messaging
- **Session Management**: Persistent conversation sessions with history
- **Intent Classification**: Smart message understanding and routing
- **Search Functionality**: Full-text search through conversation history
- **User Preferences**: Customizable user settings and preferences

### Technical Features
- **Microservices Architecture**: Modular, scalable design
- **Docker Support**: Containerized deployment with Docker Compose
- **API-First Design**: RESTful APIs with OpenAPI documentation
- **WebSocket Support**: Real-time bidirectional communication
- **Database Integration**: PostgreSQL for persistence, Redis for caching
- **Monitoring**: Prometheus metrics and Grafana dashboards
- **Security**: JWT authentication, rate limiting, CORS support

## 📁 Project Structure

```
mcp-chatbot/
├── mcp-server/          # MCP server implementation
│   └── server.py        # Main MCP server with tools and resources
├── mcp-client/          # MCP client library
│   └── client.py        # Client for communicating with MCP servers
├── chatbot-core/        # Core chatbot logic
│   └── chatbot.py       # Main chatbot implementation
├── api-gateway/         # FastAPI gateway
│   └── main.py          # REST API and WebSocket endpoints
├── web-interface/       # Frontend web application
│   └── index.html       # Modern chat interface
├── config/              # Configuration files
│   └── config.yaml      # Application configuration
├── docker/              # Docker configuration
│   ├── Dockerfile       # Container definition
│   └── docker-compose.yml # Service orchestration
├── tools/               # Custom MCP tools
├── resources/           # MCP resources
├── docs/                # Documentation
└── requirements.txt     # Python dependencies
```

## 🛠️ Installation

### Prerequisites
- Python 3.11+
- Docker and Docker Compose
- PostgreSQL (optional, included in Docker setup)
- Redis (optional, included in Docker setup)

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository**:
```bash
git clone <repository-url>
cd mcp-chatbot
```

2. **Build and start services**:
```bash
cd docker
docker-compose up -d
```

3. **Access the application**:
- Web Interface: http://localhost
- API Documentation: http://localhost:8000/docs
- Grafana Dashboard: http://localhost:3000 (admin/admin)
- Prometheus Metrics: http://localhost:9090

### Option 2: Local Development Setup

1. **Install dependencies**:
```bash
pip install -r requirements.txt
```

2. **Set up environment variables**:
```bash
export PYTHONPATH=/path/to/mcp-chatbot
export MCP_SERVER_HOST=localhost
export MCP_SERVER_PORT=8001
```

3. **Start the MCP server**:
```bash
python -m mcp_server.server
```

4. **Start the API gateway**:
```bash
python -m api_gateway.main
```

5. **Open the web interface**:
Open `web-interface/index.html` in your browser

## 🔧 Configuration

The system uses a YAML configuration file located at `config/config.yaml`. Key configuration sections include:

### MCP Server Configuration
```yaml
mcp_server:
  host: "localhost"
  port: 8001
  max_connections: 100
  timeout: 30
```

### API Gateway Configuration
```yaml
api_gateway:
  host: "0.0.0.0"
  port: 8000
  workers: 4
  cors:
    allow_origins: ["*"]
```

### Chatbot Configuration
```yaml
chatbot:
  max_message_length: 4000
  max_history_length: 100
  response_timeout: 30
  enable_search: true
```

## 📚 API Documentation

### REST Endpoints

#### Chat Operations
- `POST /chat` - Send a message to the chatbot
- `GET /sessions/{session_id}/messages` - Get conversation history
- `POST /sessions` - Create a new chat session
- `DELETE /sessions/{session_id}` - End a chat session

#### Search and Preferences
- `POST /search` - Search through messages
- `GET /users/{user_id}/preferences` - Get user preferences
- `GET /sessions/{session_id}/summary` - Get session summary

#### System Operations
- `GET /health` - Health check endpoint
- `GET /` - API information

### WebSocket Endpoints
- `WS /ws/{session_id}` - Real-time chat communication

### Example Usage

#### Send a Message
```bash
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello, how are you?",
    "user_id": "user123",
    "session_id": "session456"
  }'
```

#### Search Messages
```bash
curl -X POST "http://localhost:8000/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "hello",
    "session_id": "session456",
    "limit": 10
  }'
```

## 🔌 MCP Integration

### Available Tools
- `send_message` - Send a message in the chat
- `get_chat_history` - Retrieve conversation history
- `create_session` - Create a new chat session
- `search_messages` - Search through messages
- `get_user_preferences` - Get user settings

### Available Resources
- `chatbot://chat-history` - Access to conversation history
- `chatbot://user-sessions` - Active session information
- `chatbot://system-status` - System health metrics

### Custom Tools
You can extend the system by adding custom tools in the `tools/` directory:

```python
# tools/custom_tool.py
from mcp.types import Tool

def create_custom_tool():
    return Tool(
        name="custom_operation",
        description="Performs a custom operation",
        inputSchema={
            "type": "object",
            "properties": {
                "input": {"type": "string"}
            }
        }
    )
```

## 🎨 Web Interface

The web interface provides a modern, responsive chat experience with:

- **Real-time messaging** with WebSocket support
- **Typing indicators** and message status
- **Message history** with timestamps
- **Connection status** indicator
- **Mobile-responsive** design
- **Auto-scroll** to latest messages
- **Message formatting** with HTML support

### Customization
The interface can be customized by modifying `web-interface/index.html`:
- Change colors and themes in the CSS
- Add new features in the JavaScript
- Modify the layout and components

## 📊 Monitoring and Metrics

### Prometheus Metrics
- `messages_processed_total` - Total messages processed
- `active_sessions` - Number of active sessions
- `response_time_seconds` - Response time histogram
- `websocket_connections` - Active WebSocket connections

### Grafana Dashboards
Pre-configured dashboards for:
- System overview and health
- Message processing metrics
- User activity and sessions
- Performance and response times

### Health Checks
- `/health` endpoint for service health
- Docker health checks for containers
- Database connection monitoring
- Redis availability checks

## 🔒 Security

### Authentication
- JWT token-based authentication
- Refresh token support
- Session management
- User preference isolation

### Security Features
- CORS configuration
- Rate limiting (60 requests/minute)
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Best Practices
- Use environment variables for secrets
- Enable SSL/TLS in production
- Regular security updates
- Audit logging

## 🧪 Testing

### Unit Tests
```bash
pytest tests/unit/
```

### Integration Tests
```bash
pytest tests/integration/
```

### Load Testing
```bash
# Using locust or similar tool
locust -f tests/load/locustfile.py
```

## 🚀 Deployment

### Production Deployment
1. **Environment Setup**:
```bash
# Set production environment variables
export ENVIRONMENT=production
export SECRET_KEY=your-production-secret
export DATABASE_URL=postgresql://user:pass@host:5432/db
```

2. **SSL Configuration**:
```bash
# Configure SSL certificates
export SSL_CERT_PATH=/etc/ssl/certs/chatbot.crt
export SSL_KEY_PATH=/etc/ssl/private/chatbot.key
```

3. **Scale Services**:
```bash
docker-compose up -d --scale api-gateway=3
```

### Cloud Deployment
The system can be deployed on:
- **AWS**: ECS, EKS, or EC2
- **Google Cloud**: GKE or Compute Engine
- **Azure**: AKS or Container Instances
- **Kubernetes**: Any Kubernetes cluster

## 🔧 Development

### Adding New Features
1. **Create MCP Tools**: Add new tools in `mcp-server/server.py`
2. **Extend API**: Add endpoints in `api-gateway/main.py`
3. **Update Frontend**: Modify `web-interface/index.html`
4. **Add Tests**: Create tests in `tests/` directory

### Code Style
- Use Black for Python formatting
- Follow PEP 8 guidelines
- Add type hints
- Write comprehensive docstrings

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 Troubleshooting

### Common Issues

#### MCP Server Connection Failed
```bash
# Check if MCP server is running
curl -f http://localhost:8001/health

# Check logs
docker logs mcp-chatbot-server
```

#### WebSocket Connection Issues
```bash
# Check WebSocket endpoint
wscat -c ws://localhost:8000/ws/session123

# Verify CORS settings
curl -H "Origin: http://localhost" -I http://localhost:8000
```

#### Database Connection Problems
```bash
# Check database status
docker exec mcp-chatbot-db pg_isready

# Check connection string
psql postgresql://chatbot:chatbot_password@localhost:5432/mcp_chatbot
```

### Performance Optimization
- Enable Redis caching
- Use connection pooling
- Optimize database queries
- Implement message batching
- Use CDN for static assets

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🤝 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide
- Contact the development team

## 🔄 Changelog

### Version 1.0.0
- Initial release
- MCP integration
- WebSocket support
- Docker deployment
- Monitoring and metrics
- Web interface
- API documentation

---

**Built with ❤️ using the Model Context Protocol**