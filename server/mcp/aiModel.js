const axios = require('axios');
const logger = require('../utils/logger');

class AIModel {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    this.provider = process.env.AI_PROVIDER || 'openai'; // 'openai' or 'anthropic'
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
  }

  async analyzeIntent(message, chatHistory = []) {
    try {
      const prompt = this.buildIntentAnalysisPrompt(message, chatHistory);
      const response = await this.callAI(prompt, 'intent-analysis');
      
      return this.parseIntentResponse(response);
    } catch (error) {
      logger.error('Error analyzing intent:', error);
      return this.getFallbackIntent(message);
    }
  }

  buildIntentAnalysisPrompt(message, chatHistory) {
    const historyContext = chatHistory.slice(-3).map(h => 
      `User: ${h.userMessage}\nBot: ${h.botResponse?.message || 'No response'}`
    ).join('\n');

    return `
You are an AI assistant specialized in real estate. Analyze the user's intent and extract relevant entities.

Chat History:
${historyContext}

Current Message: "${message}"

Analyze the intent and return a JSON response with:
{
  "intent": "property_search|property_details|mortgage_calculation|saved_properties|general_inquiry",
  "confidence": 0.0-1.0,
  "entities": {
    "location": "extracted location",
    "propertyType": "house|apartment|condo|commercial",
    "price": "extracted price",
    "downPayment": "extracted down payment",
    "interestRate": "extracted interest rate",
    "loanTerm": "extracted loan term",
    "propertyId": "extracted property ID",
    "searchTerm": "general search term"
  }
}

Only include entities that are explicitly mentioned or can be inferred with high confidence.
`;
  }

  async generateResponse(data) {
    try {
      const { intent, entities, confidence, toolResults, chatHistory, context } = data;
      const prompt = this.buildResponsePrompt(intent, entities, toolResults, chatHistory, context);
      
      const response = await this.callAI(prompt, 'response-generation');
      return this.parseResponseGeneration(response);
    } catch (error) {
      logger.error('Error generating response:', error);
      return this.getFallbackResponse(intent, toolResults);
    }
  }

  buildResponsePrompt(intent, entities, toolResults, chatHistory, context) {
    const historyContext = chatHistory.slice(-3).map(h => 
      `User: ${h.userMessage}\nBot: ${h.botResponse?.message || 'No response'}`
    ).join('\n');

    return `
You are Blue Pixel AI, a helpful real estate assistant. Generate a comprehensive, friendly response.

Context:
- Intent: ${intent}
- Entities: ${JSON.stringify(entities)}
- Chat History: ${historyContext}
- Conversation Flow: ${JSON.stringify(context.conversationFlow)}

Tool Results:
${JSON.stringify(toolResults, null, 2)}

Generate a response that:
1. Directly addresses the user's query
2. Incorporates relevant data from tool results
3. Provides helpful insights and recommendations
4. Maintains a conversational, professional tone
5. Offers follow-up questions or suggestions

Return JSON format:
{
  "text": "Main response text",
  "suggestions": ["suggestion1", "suggestion2"],
  "followUpQuestions": ["question1", "question2"]
}

Be specific, helpful, and engaging. Use the tool results to provide accurate, detailed information.
`;
  }

  async callAI(prompt, type) {
    if (this.provider === 'openai') {
      return await this.callOpenAI(prompt, type);
    } else if (this.provider === 'anthropic') {
      return await this.callAnthropic(prompt, type);
    } else {
      throw new Error('Unsupported AI provider');
    }
  }

  async callOpenAI(prompt, type) {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant specialized in real estate. Always respond in valid JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: type === 'intent-analysis' ? 0.1 : 0.7,
      max_tokens: type === 'intent-analysis' ? 500 : 1500
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  }

  async callAnthropic(prompt, type) {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: this.model || 'claude-3-sonnet-20240229',
      max_tokens: type === 'intent-analysis' ? 500 : 1500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: type === 'intent-analysis' ? 0.1 : 0.7
    }, {
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    });

    return response.data.content[0].text;
  }

  parseIntentResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        intent: parsed.intent || 'general_inquiry',
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || {}
      };
    } catch (error) {
      logger.error('Error parsing intent response:', error);
      return this.getFallbackIntent();
    }
  }

  parseResponseGeneration(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        text: parsed.text || 'I apologize, but I encountered an error generating a response.',
        suggestions: parsed.suggestions || [],
        followUpQuestions: parsed.followUpQuestions || []
      };
    } catch (error) {
      logger.error('Error parsing response generation:', error);
      return this.getFallbackResponse();
    }
  }

  getFallbackIntent(message = '') {
    // Simple keyword-based fallback
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('mortgage') || lowerMessage.includes('loan') || lowerMessage.includes('calculate')) {
      return {
        intent: 'mortgage_calculation',
        confidence: 0.6,
        entities: {}
      };
    }
    
    if (lowerMessage.includes('property') || lowerMessage.includes('house') || lowerMessage.includes('apartment')) {
      return {
        intent: 'property_search',
        confidence: 0.6,
        entities: {}
      };
    }
    
    if (lowerMessage.includes('saved') || lowerMessage.includes('favorite')) {
      return {
        intent: 'saved_properties',
        confidence: 0.6,
        entities: {}
      };
    }
    
    return {
      intent: 'general_inquiry',
      confidence: 0.5,
      entities: {}
    };
  }

  getFallbackResponse(intent = 'general_inquiry', toolResults = {}) {
    const responses = {
      property_search: {
        text: "I found some properties that might interest you. Let me know if you'd like more details about any of them.",
        suggestions: ["Show me more properties", "Filter by price range", "Show properties in different areas"],
        followUpQuestions: ["What's your preferred price range?", "Are you looking for a specific property type?"]
      },
      mortgage_calculation: {
        text: "I can help you calculate mortgage payments and explore different loan options.",
        suggestions: ["Calculate monthly payment", "Compare interest rates", "Explore loan terms"],
        followUpQuestions: ["What's your target monthly payment?", "Do you have a down payment ready?"]
      },
      property_details: {
        text: "Here are the details for the property you're interested in.",
        suggestions: ["Schedule a viewing", "Get similar properties", "Calculate mortgage"],
        followUpQuestions: ["Would you like to save this property?", "Need help with financing?"]
      },
      saved_properties: {
        text: "Here are your saved properties. You can review, compare, or get updates on any of them.",
        suggestions: ["Compare properties", "Get price updates", "Remove from saved"],
        followUpQuestions: ["Ready to schedule viewings?", "Need help with next steps?"]
      },
      general_inquiry: {
        text: "I'm here to help with all your real estate needs. What would you like to know?",
        suggestions: ["Search properties", "Calculate mortgage", "Market trends"],
        followUpQuestions: ["Are you buying or selling?", "What area are you interested in?"]
      }
    };

    return responses[intent] || responses.general_inquiry;
  }
}

module.exports = AIModel;