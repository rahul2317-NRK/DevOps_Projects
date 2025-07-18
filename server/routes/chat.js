const express = require('express');
const ChatController = require('../controllers/chatController');
const router = express.Router();

const chatController = new ChatController();

// @route   GET /api/chat/history
// @desc    Get chat history for a user
// @access  Public (should be protected in production)
router.get('/history', chatController.getChatHistory);

// @route   GET /api/chat/analytics
// @desc    Get chat analytics
// @access  Public (should be protected in production)
router.get('/analytics', chatController.getChatAnalytics);

// @route   DELETE /api/chat/history
// @desc    Clear chat history
// @access  Public (should be protected in production)
router.delete('/history', chatController.clearChatHistory);

// @route   GET /api/chat/sessions/:userId
// @desc    Get user sessions
// @access  Public (should be protected in production)
router.get('/sessions/:userId', chatController.getUserSessions);

module.exports = router;