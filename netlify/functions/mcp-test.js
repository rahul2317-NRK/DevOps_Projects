const { MongoClient } = require('mongodb');

// Simple MCP message processing for Netlify Functions
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { message, userId = 'demo-user', sessionId = 'demo-session' } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Message is required' 
        }),
      };
    }

    // Simple intent analysis (without external AI API for demo)
    const intent = analyzeIntent(message);
    const response = generateResponse(intent, message);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          type: 'success',
          message: response.text,
          data: {
            intent: intent.intent,
            confidence: intent.confidence,
            suggestions: response.suggestions,
            followUpQuestions: response.followUpQuestions
          },
          timestamp: new Date().toISOString()
        }
      }),
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
    };
  }
};

function analyzeIntent(message) {
  const lowerMessage = message.toLowerCase();
  
  // Simple keyword-based intent analysis
  if (lowerMessage.includes('mortgage') || lowerMessage.includes('calculate') || lowerMessage.includes('payment')) {
    return { intent: 'mortgage_calculation', confidence: 0.8 };
  }
  
  if (lowerMessage.includes('rate') || lowerMessage.includes('interest')) {
    return { intent: 'interest_rates', confidence: 0.8 };
  }
  
  if (lowerMessage.includes('property') || lowerMessage.includes('house') || lowerMessage.includes('apartment') || lowerMessage.includes('show me')) {
    return { intent: 'property_search', confidence: 0.8 };
  }
  
  if (lowerMessage.includes('saved') || lowerMessage.includes('favorite')) {
    return { intent: 'saved_properties', confidence: 0.8 };
  }
  
  return { intent: 'general_inquiry', confidence: 0.6 };
}

function generateResponse(intent, message) {
  const responses = {
    mortgage_calculation: {
      text: "I can help you calculate mortgage payments! For a typical $500,000 house with 20% down payment and 7% interest rate, your monthly payment would be approximately $2,661. This includes principal and interest only. Would you like me to calculate with specific numbers?",
      suggestions: ["Calculate with my numbers", "Show me different scenarios", "What about PMI?"],
      followUpQuestions: ["What's your target home price?", "How much can you put down?", "What's your preferred monthly payment?"]
    },
    interest_rates: {
      text: "Current mortgage rates are around 7.25% for a 30-year fixed loan, 6.75% for a 15-year fixed. Rates vary based on your credit score, down payment, and location. Excellent credit (780+) can get you about 0.25% better rates.",
      suggestions: ["Check rates for my credit score", "Compare loan terms", "Find local lenders"],
      followUpQuestions: ["What's your credit score range?", "Are you a first-time buyer?", "Do you qualify for VA or FHA loans?"]
    },
    property_search: {
      text: "I'd love to help you find properties! I can search by location, price range, bedrooms, property type, and more. For example, I can show you 3-bedroom houses under $600,000 in Austin, or condos near downtown areas.",
      suggestions: ["Search by location", "Filter by price", "Find family homes", "Show condos"],
      followUpQuestions: ["What's your preferred location?", "What's your budget range?", "How many bedrooms do you need?"]
    },
    saved_properties: {
      text: "I can help you manage your saved properties! You can save properties you're interested in, get price alerts, and track changes. I'll also provide analysis of your preferences and market insights.",
      suggestions: ["Save a property", "View saved list", "Set price alerts", "Get recommendations"],
      followUpQuestions: ["Would you like to save any properties?", "Want alerts for price changes?"]
    },
    general_inquiry: {
      text: "Hello! I'm Blue Pixel AI, your real estate assistant. I can help you search for properties, calculate mortgages, check interest rates, and provide market insights. What would you like to know about real estate today?",
      suggestions: ["Search properties", "Calculate mortgage", "Check rates", "Market trends"],
      followUpQuestions: ["Are you buying or selling?", "What area interests you?", "Is this your first home purchase?"]
    }
  };
  
  return responses[intent.intent] || responses.general_inquiry;
}