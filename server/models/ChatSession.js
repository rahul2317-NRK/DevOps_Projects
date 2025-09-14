const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    trim: true
  },
  sessionId: {
    type: String,
    required: true,
    trim: true
  },
  userMessage: {
    type: String,
    required: true,
    trim: true
  },
  botResponse: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  intent: {
    type: String,
    trim: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  processingTime: {
    type: Number, // in milliseconds
    min: 0
  },
  toolsUsed: [{
    toolName: String,
    executionTime: Number,
    success: Boolean
  }],
  metadata: {
    userAgent: String,
    ipAddress: String,
    platform: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatSessionSchema.index({ userId: 1, sessionId: 1 });
chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ intent: 1 });
chatSessionSchema.index({ createdAt: -1 });

// Static method to get user chat history
chatSessionSchema.statics.getUserHistory = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('userMessage botResponse intent confidence createdAt sessionId');
};

// Static method to get session history
chatSessionSchema.statics.getSessionHistory = function(userId, sessionId) {
  return this.find({ userId, sessionId })
    .sort({ createdAt: 1 })
    .select('userMessage botResponse intent confidence createdAt');
};

// Static method to get analytics data
chatSessionSchema.statics.getAnalytics = function(startDate, endDate) {
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          intent: '$intent'
        },
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        avgProcessingTime: { $avg: '$processingTime' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        totalMessages: { $sum: '$count' },
        intents: {
          $push: {
            intent: '$_id.intent',
            count: '$count',
            avgConfidence: '$avgConfidence'
          }
        },
        avgProcessingTime: { $avg: '$avgProcessingTime' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

module.exports = mongoose.model('ChatSession', chatSessionSchema);