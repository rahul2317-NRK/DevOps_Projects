const express = require('express');
const router = express.Router();

// @route   GET /api/property/search
// @desc    Search properties
// @access  Public
router.get('/search', (req, res) => {
  res.json({
    success: true,
    message: 'Property search endpoint - handled by MCP tools',
    note: 'Use the chat interface to search for properties'
  });
});

// @route   GET /api/property/:id
// @desc    Get property details
// @access  Public
router.get('/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Property details endpoint - handled by MCP tools',
    note: 'Use the chat interface to get property details'
  });
});

module.exports = router;