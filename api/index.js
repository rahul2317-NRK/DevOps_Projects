// Vercel Serverless Function Entry Point for Blue Pixel AI Chatbot
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

// Import routes
const mcpRoutes = require('../server/routes/mcp');
const chatRoutes = require('../server/routes/chat');
const propertyRoutes = require('../server/routes/property');
const mortgageRoutes = require('../server/routes/mortgage');
const authRoutes = require('../server/routes/auth');

const app = express();

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
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "https://your-vercel-app.vercel.app",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0',
    platform: 'Vercel Serverless',
    services: {
      database: 'available',
      mcp: 'active',
      api: 'running'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/mortgage', mortgageRoutes);
app.use('/api/mcp', mcpRoutes);

// Basic MCP test endpoint for serverless
app.post('/api/mcp/test', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Simple response for testing
    const response = {
      type: 'success',
      message: `Blue Pixel AI received: "${message}". This is a serverless function response.`,
      data: {
        intent: 'test',
        suggestions: [
          'Ask about properties',
          'Calculate mortgage',
          'Get interest rates',
          'Search locations'
        ],
        timestamp: new Date().toISOString()
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('MCP Test Error:', error);
    res.status(500).json({
      type: 'error',
      message: 'Failed to process test request',
      error: error.message
    });
  }
});

// Property search endpoint
app.get('/api/property/search', async (req, res) => {
  try {
    const { city, state, minPrice, maxPrice, bedrooms, propertyType } = req.query;
    
    // Sample properties for demo
    const sampleProperties = [
      {
        id: '1',
        address: '123 Oak Street',
        city: 'San Francisco',
        state: 'CA',
        price: 850000,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1800,
        propertyType: 'house',
        description: 'Beautiful Victorian home with modern updates.'
      },
      {
        id: '2',
        address: '456 Pine Avenue',
        city: 'Austin',
        state: 'TX',
        price: 450000,
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1200,
        propertyType: 'condo',
        description: 'Modern downtown condo with city views.'
      }
    ];
    
    // Simple filtering
    let filtered = sampleProperties;
    if (city) filtered = filtered.filter(p => p.city.toLowerCase().includes(city.toLowerCase()));
    if (state) filtered = filtered.filter(p => p.state.toLowerCase() === state.toLowerCase());
    if (minPrice) filtered = filtered.filter(p => p.price >= parseInt(minPrice));
    if (maxPrice) filtered = filtered.filter(p => p.price <= parseInt(maxPrice));
    if (bedrooms) filtered = filtered.filter(p => p.bedrooms >= parseInt(bedrooms));
    if (propertyType) filtered = filtered.filter(p => p.propertyType.toLowerCase() === propertyType.toLowerCase());
    
    res.json({
      success: true,
      properties: filtered,
      total: filtered.length
    });
  } catch (error) {
    console.error('Property Search Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search properties',
      error: error.message
    });
  }
});

// Mortgage calculation endpoint
app.post('/api/mortgage/calculate', (req, res) => {
  try {
    const { loanAmount, interestRate, loanTerm, downPayment } = req.body;
    
    const principal = loanAmount - (downPayment || 0);
    const monthlyRate = (interestRate / 100) / 12;
    const numberOfPayments = loanTerm * 12;
    
    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    const totalPayment = monthlyPayment * numberOfPayments;
    const totalInterest = totalPayment - principal;
    
    res.json({
      success: true,
      calculation: {
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalPayment: Math.round(totalPayment * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        principal: principal,
        loanDetails: {
          loanAmount,
          interestRate,
          loanTerm,
          downPayment: downPayment || 0
        }
      }
    });
  } catch (error) {
    console.error('Mortgage Calculation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate mortgage',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// Export for Vercel
module.exports = app;