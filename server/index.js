const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const propertyRoutes = require('./routes/property');
const mortgageRoutes = require('./routes/mortgage');
const mcpRoutes = require('./routes/mcp');

// MCP Integration
const MCPServer = require('./mcp/server');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5000",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Initialize MCP Server
const mcpServer = new MCPServer(io);
mcpServer.initialize();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/mortgage', mortgageRoutes);
app.use('/api/mcp', mcpRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: 'connected',
      mcp: 'active',
      socketio: 'running'
    }
  });
});

// Serve static files from React build
const buildPath = path.join(__dirname, '../client/build');
app.use(express.static(buildPath));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    logger.info(`User ${socket.id} joined room: ${roomId}`);
    
    // Send welcome message
    socket.emit('chat-response', {
      type: 'success',
      message: 'Welcome to Blue Pixel AI! I\'m here to help you with all your real estate needs.',
      data: {
        suggestions: [
          'Show me houses in San Francisco',
          'Calculate mortgage for $500,000',
          'What are current interest rates?',
          'Find 3-bedroom apartments'
        ],
        followUpQuestions: [
          'Are you buying or selling?',
          'What area interests you?',
          'What\'s your budget range?'
        ]
      },
      timestamp: new Date().toISOString()
    });
  });

  socket.on('chat-message', async (data) => {
    try {
      logger.info(`Processing message from ${socket.id}: ${data.message}`);
      
      // Add socket ID to data for response tracking
      data.socketId = socket.id;
      
      // Process message through MCP
      const response = await mcpServer.processMessage(data);
      
      // Send response back to the specific room
      if (data.roomId) {
        io.to(data.roomId).emit('chat-response', response);
      } else {
        socket.emit('chat-response', response);
      }
      
      logger.info(`Message processed successfully for ${socket.id}`);
    } catch (error) {
      logger.error('Error processing chat message:', error);
      socket.emit('chat-response', {
        type: 'error',
        message: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', (reason) => {
    logger.info(`User disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Error handling middleware
app.use(errorHandler);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Blue Pixel AI Chatbot server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Frontend: http://localhost:${PORT}`);
  logger.info(`🔌 API: http://localhost:${PORT}/api`);
  logger.info(`⚡ Socket.IO: Ready for real-time connections`);
  logger.info(`🤖 MCP Server: Initialized with ${mcpServer.tools.size} tools`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});