const logger = require('../utils/logger');
const PropertyController = require('../controllers/propertyController');
const MortgageController = require('../controllers/mortgageController');
const UserController = require('../controllers/userController');
const ChatController = require('../controllers/chatController');
const AIModel = require('./aiModel');

// MCP Tools
const ValidatePromptTool = require('./tools/validatePrompt');
const GetUserChatHistoryTool = require('./tools/getUserChatHistory');
const SearchPropertyInfoTool = require('./tools/searchPropertyInfo');
const GetPropertyDetailsTool = require('./tools/getPropertyDetails');
const GetInterestRatesTool = require('./tools/getInterestRates');
const GetUserSavedPropertiesTool = require('./tools/getUserSavedProperties');
const CalculateMortgageTool = require('./tools/calculateMortgage');
const WebSearchTool = require('./tools/webSearch');

class MCPServer {
  constructor(io) {
    this.io = io;
    this.tools = new Map();
    this.aiModel = new AIModel();
    this.controllers = {
      property: new PropertyController(),
      mortgage: new MortgageController(),
      user: new UserController(),
      chat: new ChatController()
    };
  }

  initialize() {
    this.registerTools();
    logger.info('MCP Server initialized with tools:', Array.from(this.tools.keys()));
  }

  registerTools() {
    // Register all MCP tools
    this.tools.set('validatePrompt', new ValidatePromptTool());
    this.tools.set('getUserChatHistory', new GetUserChatHistoryTool());
    this.tools.set('searchPropertyInfo', new SearchPropertyInfoTool());
    this.tools.set('getPropertyDetails', new GetPropertyDetailsTool());
    this.tools.set('getInterestRates', new GetInterestRatesTool());
    this.tools.set('getUserSavedProperties', new GetUserSavedPropertiesTool());
    this.tools.set('calculateMortgage', new CalculateMortgageTool());
    this.tools.set('webSearch', new WebSearchTool());
  }

  async processMessage(data) {
    const { message, userId, sessionId, userContext } = data;
    
    try {
      // Step 1: Validate prompt
      const validation = await this.executeTool('validatePrompt', { prompt: message });
      if (!validation.isValid) {
        return {
          type: 'error',
          message: 'Invalid prompt. Please provide a valid real estate query.',
          timestamp: new Date().toISOString()
        };
      }

      // Step 2: Get chat history for context
      const chatHistory = await this.executeTool('getUserChatHistory', { 
        userId, 
        sessionId,
        limit: 10 
      });

      // Step 3: Analyze intent with AI model
      const intentAnalysis = await this.aiModel.analyzeIntent(message, chatHistory.history);
      
      // Step 4: Execute appropriate tools based on intent
      const toolResults = await this.executeRelevantTools(intentAnalysis, data);

      // Step 5: Generate comprehensive response
      const response = await this.generateResponse(intentAnalysis, toolResults, chatHistory);

      // Step 6: Store interaction
      await this.storeInteraction(userId, sessionId, message, response);

      return response;

    } catch (error) {
      logger.error('Error processing message:', error);
      return {
        type: 'error',
        message: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };
    }
  }

  async executeRelevantTools(intentAnalysis, data) {
    const { intent, entities, confidence } = intentAnalysis;
    const results = {};

    switch (intent) {
      case 'property_search':
        results.properties = await this.executeTool('searchPropertyInfo', {
          query: entities.location || entities.propertyType,
          location: entities.location,
          searchType: entities.propertyType,
          ...data
        });
        break;

      case 'property_details':
        if (entities.propertyId) {
          results.propertyDetails = await this.executeTool('getPropertyDetails', {
            propertyId: entities.propertyId,
            ...data
          });
        }
        break;

      case 'mortgage_calculation':
        results.mortgageInfo = await this.executeTool('calculateMortgage', {
          price: entities.price,
          downPayment: entities.downPayment,
          interestRate: entities.interestRate,
          loanTerm: entities.loanTerm,
          ...data
        });
        
        // Also get current interest rates
        results.interestRates = await this.executeTool('getInterestRates', {
          location: entities.location,
          ...data
        });
        break;

      case 'saved_properties':
        results.savedProperties = await this.executeTool('getUserSavedProperties', {
          userId: data.userId,
          ...data
        });
        break;

      case 'general_inquiry':
        // Use web search for general real estate information
        results.webSearch = await this.executeTool('webSearch', {
          query: entities.searchTerm || data.message,
          propertyContext: true,
          ...data
        });
        break;

      default:
        // Fallback to property search
        results.properties = await this.executeTool('searchPropertyInfo', {
          query: data.message,
          ...data
        });
    }

    return results;
  }

  async executeTool(toolName, params) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      logger.error(`Error executing tool ${toolName}:`, error);
      throw error;
    }
  }

  async generateResponse(intentAnalysis, toolResults, chatHistory) {
    const { intent, entities, confidence } = intentAnalysis;
    
    // Use AI model to generate comprehensive response
    const aiResponse = await this.aiModel.generateResponse({
      intent,
      entities,
      confidence,
      toolResults,
      chatHistory: chatHistory.history,
      context: {
        timestamp: new Date().toISOString(),
        conversationFlow: this.analyzeConversationFlow(chatHistory.history)
      }
    });

    return {
      type: 'success',
      message: aiResponse.text,
      data: {
        intent,
        confidence,
        results: toolResults,
        suggestions: aiResponse.suggestions,
        followUpQuestions: aiResponse.followUpQuestions
      },
      timestamp: new Date().toISOString()
    };
  }

  analyzeConversationFlow(history) {
    // Analyze conversation patterns for better context
    const recentMessages = history.slice(-5);
    const topics = recentMessages.map(msg => msg.intent || 'general');
    
    return {
      recentTopics: topics,
      conversationDepth: history.length,
      lastIntent: topics[topics.length - 1] || 'general'
    };
  }

  async storeInteraction(userId, sessionId, message, response) {
    try {
      await this.controllers.chat.storeInteraction({
        userId,
        sessionId,
        userMessage: message,
        botResponse: response,
        timestamp: new Date(),
        intent: response.data?.intent,
        confidence: response.data?.confidence
      });
    } catch (error) {
      logger.error('Error storing interaction:', error);
    }
  }

  // Method to get available tools info
  getToolsInfo() {
    const toolsInfo = {};
    for (const [name, tool] of this.tools) {
      toolsInfo[name] = {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      };
    }
    return toolsInfo;
  }
}

module.exports = MCPServer;