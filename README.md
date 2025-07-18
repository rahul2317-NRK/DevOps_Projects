# Blue Pixel AI Chatbot - Real Estate Platform with MCP

A comprehensive real estate chatbot platform built with Model Context Protocol (MCP) integration, featuring advanced AI-powered property search, mortgage calculations, and personalized recommendations.

## 🏗️ Architecture Overview

The system follows a modern microservices architecture with MCP (Model Context Protocol) at its core:

- **Frontend**: React-based UI with Socket.IO for real-time chat
- **Backend**: Node.js/Express with MCP integration
- **Database**: MongoDB for data persistence
- **AI Integration**: OpenAI/Anthropic for intelligent responses
- **Real-time Communication**: Socket.IO for instant messaging

## 🚀 Features

### Core Functionality
- **Intelligent Chat Interface**: Natural language processing for real estate queries
- **Property Search**: Advanced search with location, price, and feature filters
- **Mortgage Calculator**: Comprehensive mortgage calculations with multiple scenarios
- **Interest Rate Tracking**: Real-time mortgage rate updates and trends
- **Saved Properties**: User property management with alerts and analytics
- **Web Search Integration**: Real-time market data and trends

### MCP Tools
- **ValidatePrompt**: Ensures real estate relevance and content safety
- **GetUserChatHistory**: Maintains conversation context
- **SearchPropertyInfo**: Intelligent property search with ranking
- **GetPropertyDetails**: Detailed property information with analytics
- **CalculateMortgage**: Advanced mortgage calculations and scenarios
- **GetInterestRates**: Current rates with personalized adjustments
- **GetUserSavedProperties**: User property management and analytics
- **WebSearch**: Real-time market data and information

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.IO** - Real-time communication
- **Winston** - Logging
- **Helmet** - Security middleware
- **Joi** - Data validation

### AI & Search
- **OpenAI API** - GPT models for natural language processing
- **Anthropic API** - Claude models (alternative)
- **Google Search API** - Web search capabilities
- **Bing Search API** - Alternative search provider

### Frontend (to be implemented)
- **React** - UI framework
- **Socket.IO Client** - Real-time communication
- **Material-UI** - Component library
- **Chart.js** - Data visualization

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- NPM or Yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/blue-pixel-ai-chatbot.git
   cd blue-pixel-ai-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/blue-pixel-chatbot
   
   # AI Configuration
   OPENAI_API_KEY=your-openai-api-key
   AI_PROVIDER=openai
   AI_MODEL=gpt-3.5-turbo
   
   # Search APIs (optional)
   GOOGLE_SEARCH_API_KEY=your-google-search-api-key
   GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔧 API Endpoints

### Chat Endpoints
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/history` - Clear chat history
- `GET /api/chat/analytics` - Get chat analytics
- `GET /api/chat/sessions/:userId` - Get user sessions

### MCP Endpoints
- `GET /api/mcp/tools` - Get available MCP tools
- `POST /api/mcp/test` - Test MCP message processing

### Health Check
- `GET /api/health` - Application health status

## 💬 Usage Examples

### Basic Chat Interaction
```javascript
// Connect to Socket.IO
const socket = io('http://localhost:5000');

// Send a message
socket.emit('chat-message', {
  message: 'Show me houses in San Francisco under $800,000',
  userId: 'user123',
  sessionId: 'session456',
  roomId: 'room789'
});

// Listen for responses
socket.on('chat-response', (response) => {
  console.log('Bot response:', response);
});
```

### API Testing
```bash
# Test MCP message processing
curl -X POST http://localhost:5000/api/mcp/test \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Calculate mortgage for a $500,000 house with 20% down",
    "userId": "test-user"
  }'

# Get available MCP tools
curl http://localhost:5000/api/mcp/tools
```

## 🎯 MCP Message Flow

1. **User Input**: User sends a message through the chat interface
2. **Prompt Validation**: ValidatePrompt tool ensures message relevance
3. **Context Retrieval**: GetUserChatHistory provides conversation context
4. **Intent Analysis**: AI model analyzes user intent and extracts entities
5. **Tool Execution**: Relevant MCP tools are executed based on intent
6. **Response Generation**: AI model generates comprehensive response
7. **Storage**: Interaction is stored for future context

## 🔍 Example Queries

The chatbot can handle various real estate queries:

- **Property Search**: "Show me 3-bedroom houses in Austin under $600,000"
- **Mortgage Calculation**: "Calculate monthly payment for a $450,000 house with 15% down"
- **Interest Rates**: "What are current mortgage rates for good credit?"
- **Property Details**: "Tell me more about the house at 123 Main Street"
- **Market Information**: "What's the housing market like in Seattle?"
- **Saved Properties**: "Show me my saved properties"

## 📊 Analytics & Monitoring

The system provides comprehensive analytics:

- **Chat Analytics**: Message volume, intent distribution, confidence scores
- **User Analytics**: Property preferences, search patterns, engagement metrics
- **Performance Metrics**: Response times, tool execution success rates
- **Market Insights**: Search trends, popular locations, price ranges

## 🔐 Security Features

- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **Error Handling**: Comprehensive error handling with detailed logging
- **Content Safety**: Inappropriate content detection and filtering
- **CORS Protection**: Cross-origin request security

## 🚀 Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t blue-pixel-chatbot .

# Run with Docker Compose
docker-compose up -d
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db
OPENAI_API_KEY=your-production-api-key
LOG_LEVEL=info
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation in the `/docs` folder

## 🔄 Roadmap

- [ ] React frontend implementation
- [ ] User authentication and authorization
- [ ] Real estate API integrations (Zillow, MLS)
- [ ] Advanced analytics dashboard
- [ ] Mobile app development
- [ ] Voice interface integration
- [ ] Multi-language support
- [ ] Advanced AI model fine-tuning

## 🏆 Acknowledgments

- OpenAI for GPT models
- Anthropic for Claude models
- MongoDB for database technology
- Socket.IO for real-time communication
- The open-source community for various tools and libraries
