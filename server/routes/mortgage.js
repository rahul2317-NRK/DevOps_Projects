const express = require('express');
const router = express.Router();

// @route   POST /api/mortgage/calculate
// @desc    Calculate mortgage
// @access  Public
router.post('/calculate', (req, res) => {
  res.json({
    success: true,
    message: 'Mortgage calculation endpoint - handled by MCP tools',
    note: 'Use the chat interface to calculate mortgage payments'
  });
});

// @route   GET /api/mortgage/rates
// @desc    Get current mortgage rates
// @access  Public
router.get('/rates', (req, res) => {
  res.json({
    success: true,
    message: 'Mortgage rates endpoint - handled by MCP tools',
    note: 'Use the chat interface to get current mortgage rates'
  });
});

module.exports = router;