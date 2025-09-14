// Create this file at: C:\Users\rahul\Downloads\Chatbot-main\Chatbot-main\api\index.js
// Vercel-Compatible API for YOUR project

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "https://your-vercel-app.vercel.app",
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    platform: 'Vercel Serverless',
    version: '1.0.0'
  });
});

// Chat endpoint (replaces Socket.IO)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;
    
    // Simple AI response (replace with your MCP logic)
    const response = {
      type: 'success',
      message: `Blue Pixel AI received: "${message}". I'm here to help with real estate!`,
      data: {
        suggestions: [
          'Show me houses in San Francisco',
          'Calculate mortgage for $500,000',
          'What are current interest rates?'
        ],
        timestamp: new Date().toISOString()
      }
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({
      type: 'error',
      message: 'Failed to process message',
      error: error.message
    });
  }
});

// Property search
app.get('/api/property/search', (req, res) => {
  const sampleProperties = [
    {
      id: '1',
      address: '123 Oak Street',
      city: 'San Francisco',
      state: 'CA',
      price: 850000,
      bedrooms: 3,
      bathrooms: 2
    }
  ];
  
  res.json({
    success: true,
    properties: sampleProperties,
    total: sampleProperties.length
  });
});

// Mortgage calculator
app.post('/api/mortgage/calculate', (req, res) => {
  const { loanAmount, interestRate, loanTerm } = req.body;
  
  const monthlyRate = (interestRate / 100) / 12;
  const numberOfPayments = loanTerm * 12;
  
  const monthlyPayment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  
  res.json({
    success: true,
    calculation: {
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      loanAmount,
      interestRate,
      loanTerm
    }
  });
});

module.exports = app;