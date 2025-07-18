const ChatSession = require('../models/ChatSession');
const logger = require('../utils/logger');

class ChatController {
  // Store chat interaction
  async storeInteraction(interactionData) {
    try {
      const chatSession = new ChatSession({
        userId: interactionData.userId,
        sessionId: interactionData.sessionId,
        userMessage: interactionData.userMessage,
        botResponse: interactionData.botResponse,
        intent: interactionData.intent,
        confidence: interactionData.confidence,
        processingTime: interactionData.processingTime,
        toolsUsed: interactionData.toolsUsed,
        metadata: interactionData.metadata
      });

      await chatSession.save();
      logger.info(`Chat interaction stored for user: ${interactionData.userId}`);
      return chatSession;
    } catch (error) {
      logger.error('Error storing chat interaction:', error);
      throw error;
    }
  }

  // Get chat history
  async getChatHistory(req, res) {
    try {
      const { userId, sessionId, limit = 50 } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      let query = { userId };
      if (sessionId) {
        query.sessionId = sessionId;
      }

      const history = await ChatSession.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select('userMessage botResponse intent confidence createdAt sessionId');

      res.json({
        success: true,
        data: history.reverse(), // Return in chronological order
        total: history.length
      });
    } catch (error) {
      logger.error('Error getting chat history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve chat history'
      });
    }
  }

  // Get chat analytics
  async getChatAnalytics(req, res) {
    try {
      const { startDate, endDate, userId } = req.query;

      const matchStage = {};
      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }
      if (userId) {
        matchStage.userId = userId;
      }

      const analytics = await ChatSession.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueSessions: { $addToSet: '$sessionId' },
            avgConfidence: { $avg: '$confidence' },
            avgProcessingTime: { $avg: '$processingTime' },
            intentDistribution: {
              $push: '$intent'
            }
          }
        },
        {
          $project: {
            totalMessages: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            uniqueSessions: { $size: '$uniqueSessions' },
            avgConfidence: { $round: ['$avgConfidence', 3] },
            avgProcessingTime: { $round: ['$avgProcessingTime', 0] },
            intentDistribution: 1
          }
        }
      ]);

      // Calculate intent distribution
      let intentCounts = {};
      if (analytics.length > 0 && analytics[0].intentDistribution) {
        analytics[0].intentDistribution.forEach(intent => {
          if (intent) {
            intentCounts[intent] = (intentCounts[intent] || 0) + 1;
          }
        });
      }

      const result = analytics.length > 0 ? {
        ...analytics[0],
        intentCounts
      } : {
        totalMessages: 0,
        uniqueUsers: 0,
        uniqueSessions: 0,
        avgConfidence: 0,
        avgProcessingTime: 0,
        intentCounts: {}
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting chat analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve chat analytics'
      });
    }
  }

  // Clear chat history
  async clearChatHistory(req, res) {
    try {
      const { userId, sessionId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      let query = { userId };
      if (sessionId) {
        query.sessionId = sessionId;
      }

      const result = await ChatSession.deleteMany(query);

      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} chat messages`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      logger.error('Error clearing chat history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear chat history'
      });
    }
  }

  // Get user sessions
  async getUserSessions(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const sessions = await ChatSession.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$sessionId',
            messageCount: { $sum: 1 },
            lastMessage: { $max: '$createdAt' },
            firstMessage: { $min: '$createdAt' },
            intents: { $addToSet: '$intent' }
          }
        },
        {
          $project: {
            sessionId: '$_id',
            messageCount: 1,
            lastMessage: 1,
            firstMessage: 1,
            intents: 1,
            duration: {
              $subtract: ['$lastMessage', '$firstMessage']
            }
          }
        },
        { $sort: { lastMessage: -1 } }
      ]);

      res.json({
        success: true,
        data: sessions,
        total: sessions.length
      });
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user sessions'
      });
    }
  }
}

module.exports = ChatController;