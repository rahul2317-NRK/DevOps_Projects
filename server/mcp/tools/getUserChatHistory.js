const logger = require('../../utils/logger');
const ChatSession = require('../../models/ChatSession');

class GetUserChatHistoryTool {
  constructor() {
    this.name = 'getUserChatHistory';
    this.description = 'Retrieves chat history for context and conversation continuity';
    this.parameters = {
      userId: { type: 'string', required: true, description: 'User ID' },
      sessionId: { type: 'string', required: false, description: 'Session ID for specific session' },
      limit: { type: 'number', required: false, description: 'Maximum number of messages to retrieve' }
    };
  }

  async execute(params) {
    const { userId, sessionId, limit = 10 } = params;
    
    try {
      let query = { userId };
      
      if (sessionId) {
        query.sessionId = sessionId;
      }

      const chatHistory = await ChatSession.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('userMessage botResponse timestamp intent confidence sessionId')
        .lean();

      // Reverse to get chronological order
      const history = chatHistory.reverse();

      // Format the history for better context
      const formattedHistory = history.map(chat => ({
        userMessage: chat.userMessage,
        botResponse: chat.botResponse,
        timestamp: chat.timestamp,
        intent: chat.intent,
        confidence: chat.confidence,
        sessionId: chat.sessionId
      }));

      // Analyze conversation patterns
      const analysis = this.analyzeConversationPatterns(formattedHistory);

      logger.info(`Retrieved ${formattedHistory.length} chat history items for user ${userId}`);
      
      return {
        success: true,
        history: formattedHistory,
        analysis,
        totalMessages: formattedHistory.length,
        userId,
        sessionId
      };

    } catch (error) {
      logger.error('Error retrieving chat history:', error);
      return {
        success: false,
        error: 'Failed to retrieve chat history',
        history: [],
        analysis: {},
        totalMessages: 0,
        userId,
        sessionId
      };
    }
  }

  analyzeConversationPatterns(history) {
    if (!history || history.length === 0) {
      return {
        dominantIntent: null,
        intentDistribution: {},
        conversationFlow: [],
        averageConfidence: 0,
        recentTopics: []
      };
    }

    // Calculate intent distribution
    const intentCounts = {};
    let totalConfidence = 0;
    let confidenceCount = 0;

    history.forEach(chat => {
      if (chat.intent) {
        intentCounts[chat.intent] = (intentCounts[chat.intent] || 0) + 1;
      }
      if (chat.confidence) {
        totalConfidence += chat.confidence;
        confidenceCount++;
      }
    });

    // Find dominant intent
    const dominantIntent = Object.keys(intentCounts).reduce((a, b) => 
      intentCounts[a] > intentCounts[b] ? a : b, null
    );

    // Get conversation flow (last 5 intents)
    const conversationFlow = history.slice(-5).map(chat => ({
      intent: chat.intent,
      timestamp: chat.timestamp,
      confidence: chat.confidence
    }));

    // Extract recent topics/keywords
    const recentTopics = this.extractTopics(history.slice(-3));

    return {
      dominantIntent,
      intentDistribution: intentCounts,
      conversationFlow,
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      recentTopics,
      conversationLength: history.length,
      lastInteraction: history[history.length - 1]?.timestamp
    };
  }

  extractTopics(recentHistory) {
    const topics = [];
    const keywords = [
      'property', 'house', 'apartment', 'condo', 'mortgage', 'loan',
      'buy', 'sell', 'rent', 'price', 'location', 'neighborhood',
      'bedroom', 'bathroom', 'investment', 'market', 'financing'
    ];

    recentHistory.forEach(chat => {
      if (chat.userMessage) {
        const message = chat.userMessage.toLowerCase();
        keywords.forEach(keyword => {
          if (message.includes(keyword) && !topics.includes(keyword)) {
            topics.push(keyword);
          }
        });
      }
    });

    return topics;
  }
}

module.exports = GetUserChatHistoryTool;