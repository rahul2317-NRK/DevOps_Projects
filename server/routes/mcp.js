const express = require('express');
const MCPServer = require('../mcp/server');
const router = express.Router();

// @route   GET /api/mcp/tools
// @desc    Get available MCP tools
// @access  Public
router.get('/tools', (req, res) => {
  try {
    const mcpServer = new MCPServer();
    mcpServer.initialize();
    const toolsInfo = mcpServer.getToolsInfo();
    
    res.json({
      success: true,
      data: toolsInfo,
      totalTools: Object.keys(toolsInfo).length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve MCP tools information'
    });
  }
});

// @route   POST /api/mcp/test
// @desc    Test MCP message processing
// @access  Public
router.post('/test', async (req, res) => {
  try {
    const { message, userId = 'test-user', sessionId = 'test-session' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    const mcpServer = new MCPServer();
    mcpServer.initialize();
    
    const response = await mcpServer.processMessage({
      message,
      userId,
      sessionId,
      userContext: {}
    });
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process MCP message'
    });
  }
});

module.exports = router;