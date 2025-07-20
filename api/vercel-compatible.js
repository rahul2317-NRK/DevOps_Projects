// Vercel-Compatible API for Blue Pixel AI Chatbot
// No WebSocket dependencies - Pure REST API

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    platform: 'Vercel Serverless',
    version: '1.0.0',
    message: 'Blue Pixel AI Chatbot API is running',
    features: [
      'Chat API',
      'Property Search',
      'Mortgage Calculator',
      'No WebSocket Dependencies'
    ]
  });
});

// Chat endpoint (replaces Socket.IO real-time chat)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId = 'demo-user', sessionId = Date.now() } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        type: 'error',
        message: 'Message is required'
      });
    }

    // Simulate AI processing with intelligent responses
    const responses = {
      property: {
        keywords: ['house', 'property', 'apartment', 'condo', 'real estate', 'buy', 'sell'],
        response: `I found some great properties for you! Here are houses matching your criteria. Would you like me to search for specific locations or price ranges?`,
        suggestions: [
          'Show me houses under $500K',
          'Find properties in San Francisco',
          'Search for 3-bedroom homes',
          'Show luxury apartments'
        ]
      },
      mortgage: {
        keywords: ['mortgage', 'loan', 'payment', 'interest', 'finance', 'calculate'],
        response: `I can help you calculate mortgage payments! For example, a $400,000 loan at 6.5% for 30 years would be about $2,528/month.`,
        suggestions: [
          'Calculate my mortgage payment',
          'What are current interest rates?',
          'How much can I afford?',
          'Compare loan terms'
        ]
      },
      rates: {
        keywords: ['rate', 'interest', 'apr', 'current', 'market'],
        response: `Current mortgage rates are around 6.5-7.2% for 30-year fixed loans. Rates vary based on credit score and down payment.`,
        suggestions: [
          'Get personalized rates',
          'Compare different loan types',
          'Check rate trends',
          'Calculate with different rates'
        ]
      },
      location: {
        keywords: ['san francisco', 'austin', 'seattle', 'miami', 'denver', 'california', 'texas'],
        response: `Great choice! I have properties in that area. Let me show you some options with current market prices and neighborhood details.`,
        suggestions: [
          'Show neighborhood details',
          'Compare local prices',
          'Find nearby amenities',
          'Check school districts'
        ]
      }
    };

    // Determine response category
    const messageText = message.toLowerCase();
    let responseCategory = null;
    
    for (const [category, data] of Object.entries(responses)) {
      if (data.keywords.some(keyword => messageText.includes(keyword))) {
        responseCategory = category;
        break;
      }
    }

    // Default response if no category matches
    const defaultResponse = {
      response: `Hi! I'm Blue Pixel AI, your real estate assistant. I received your message: "${message}". I can help you with properties, mortgages, and market information!`,
      suggestions: [
        'Show me available properties',
        'Calculate mortgage payments',
        'Get current interest rates',
        'Find properties by location'
      ]
    };

    const selectedResponse = responseCategory ? responses[responseCategory] : defaultResponse;

    const response = {
      type: 'success',
      message: selectedResponse.response,
      data: {
        intent: responseCategory || 'general',
        suggestions: selectedResponse.suggestions,
        userId,
        sessionId,
        timestamp: new Date().toISOString(),
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      type: 'error',
      message: 'Sorry, I encountered an error processing your request. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Property search endpoint
app.get('/api/property/search', (req, res) => {
  try {
    const { city, state, minPrice, maxPrice, bedrooms, propertyType, limit = 10 } = req.query;
    
    // Sample property database
    const sampleProperties = [
      {
        id: 'prop_1',
        address: '123 Oak Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        price: 850000,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1800,
        propertyType: 'house',
        description: 'Beautiful Victorian home with modern updates and original charm.',
        features: ['hardwood floors', 'updated kitchen', 'garden', 'parking'],
        images: ['https://via.placeholder.com/400x300?text=Victorian+House']
      },
      {
        id: 'prop_2',
        address: '456 Pine Avenue',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        price: 450000,
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1200,
        propertyType: 'condo',
        description: 'Modern downtown condo with city views and luxury amenities.',
        features: ['city views', 'gym', 'pool', 'concierge'],
        images: ['https://via.placeholder.com/400x300?text=Modern+Condo']
      },
      {
        id: 'prop_3',
        address: '789 Maple Drive',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
        price: 650000,
        bedrooms: 4,
        bathrooms: 3,
        sqft: 2200,
        propertyType: 'house',
        description: 'Spacious family home with mountain views and large backyard.',
        features: ['mountain views', 'large yard', 'garage', 'fireplace'],
        images: ['https://via.placeholder.com/400x300?text=Family+House']
      },
      {
        id: 'prop_4',
        address: '321 Beach Boulevard',
        city: 'Miami',
        state: 'FL',
        zipCode: '33101',
        price: 750000,
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1400,
        propertyType: 'apartment',
        description: 'Luxury beachfront apartment with ocean views.',
        features: ['ocean views', 'beach access', 'pool', 'spa'],
        images: ['https://via.placeholder.com/400x300?text=Beach+Apartment']
      },
      {
        id: 'prop_5',
        address: '555 Highland Road',
        city: 'Denver',
        state: 'CO',
        zipCode: '80202',
        price: 520000,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1600,
        propertyType: 'townhouse',
        description: 'Modern townhouse with mountain access and energy-efficient features.',
        features: ['mountain access', 'solar panels', 'garage', 'patio'],
        images: ['https://via.placeholder.com/400x300?text=Mountain+Townhouse']
      }
    ];
    
    // Apply filters
    let filtered = sampleProperties;
    
    if (city) {
      filtered = filtered.filter(p => 
        p.city.toLowerCase().includes(city.toLowerCase())
      );
    }
    
    if (state) {
      filtered = filtered.filter(p => 
        p.state.toLowerCase() === state.toLowerCase()
      );
    }
    
    if (minPrice) {
      filtered = filtered.filter(p => p.price >= parseInt(minPrice));
    }
    
    if (maxPrice) {
      filtered = filtered.filter(p => p.price <= parseInt(maxPrice));
    }
    
    if (bedrooms) {
      filtered = filtered.filter(p => p.bedrooms >= parseInt(bedrooms));
    }
    
    if (propertyType) {
      filtered = filtered.filter(p => 
        p.propertyType.toLowerCase() === propertyType.toLowerCase()
      );
    }
    
    // Apply limit
    filtered = filtered.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      properties: filtered,
      total: filtered.length,
      filters: { city, state, minPrice, maxPrice, bedrooms, propertyType },
      timestamp: new Date().toISOString()
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

// Mortgage calculator endpoint
app.post('/api/mortgage/calculate', (req, res) => {
  try {
    const { 
      loanAmount, 
      interestRate, 
      loanTerm = 30, 
      downPayment = 0,
      propertyTax = 0,
      insurance = 0,
      pmi = 0
    } = req.body;
    
    if (!loanAmount || !interestRate) {
      return res.status(400).json({
        success: false,
        message: 'Loan amount and interest rate are required'
      });
    }
    
    const principal = loanAmount - downPayment;
    const monthlyRate = (interestRate / 100) / 12;
    const numberOfPayments = loanTerm * 12;
    
    // Calculate monthly payment (P&I only)
    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    const totalPayment = monthlyPayment * numberOfPayments;
    const totalInterest = totalPayment - principal;
    
    // Calculate total monthly payment including PITI
    const monthlyPropertyTax = propertyTax / 12;
    const monthlyInsurance = insurance / 12;
    const monthlyPMI = pmi / 12;
    const totalMonthlyPayment = monthlyPayment + monthlyPropertyTax + monthlyInsurance + monthlyPMI;
    
    res.json({
      success: true,
      calculation: {
        principalAndInterest: Math.round(monthlyPayment * 100) / 100,
        totalMonthlyPayment: Math.round(totalMonthlyPayment * 100) / 100,
        totalPayment: Math.round(totalPayment * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        downPayment: downPayment,
        loanAmount: loanAmount,
        principal: principal,
        breakdown: {
          principalAndInterest: Math.round(monthlyPayment * 100) / 100,
          propertyTax: Math.round(monthlyPropertyTax * 100) / 100,
          insurance: Math.round(monthlyInsurance * 100) / 100,
          pmi: Math.round(monthlyPMI * 100) / 100
        },
        loanDetails: {
          loanAmount,
          interestRate,
          loanTerm,
          downPayment
        }
      },
      timestamp: new Date().toISOString()
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

// Interest rates endpoint
app.get('/api/rates/current', (req, res) => {
  try {
    // Simulated current rates (in a real app, fetch from API)
    const rates = {
      conventional: {
        '30-year-fixed': 6.875,
        '15-year-fixed': 6.125,
        '5-1-arm': 5.750
      },
      fha: {
        '30-year-fixed': 6.625,
        '15-year-fixed': 5.875
      },
      va: {
        '30-year-fixed': 6.500,
        '15-year-fixed': 5.750
      },
      jumbo: {
        '30-year-fixed': 7.125,
        '15-year-fixed': 6.375
      }
    };
    
    res.json({
      success: true,
      rates,
      asOfDate: new Date().toISOString(),
      disclaimer: 'Rates shown are estimates and may vary based on credit score, down payment, and other factors.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current rates'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'POST /api/chat',
      'GET /api/property/search',
      'POST /api/mortgage/calculate',
      'GET /api/rates/current'
    ]
  });
});

module.exports = app;