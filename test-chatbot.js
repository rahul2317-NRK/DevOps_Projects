const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:5000';
const TEST_USER_ID = 'test-user-123';
const TEST_SESSION_ID = 'test-session-456';

async function testChatbot() {
  console.log('🤖 Blue Pixel AI Chatbot Test Suite');
  console.log('=====================================\n');

  // Test 1: Health Check
  console.log('1. Testing Health Check...');
  try {
    const response = await axios.get(`${SERVER_URL}/api/health`);
    console.log('✅ Health check passed:', response.data.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return;
  }

  // Test 2: MCP Tools
  console.log('\n2. Testing MCP Tools...');
  try {
    const response = await axios.get(`${SERVER_URL}/api/mcp/tools`);
    console.log('✅ MCP tools loaded:', response.data.totalTools, 'tools available');
    console.log('Available tools:', Object.keys(response.data.data));
  } catch (error) {
    console.log('❌ MCP tools test failed:', error.message);
  }

  // Test 3: MCP Message Processing
  console.log('\n3. Testing MCP Message Processing...');
  const testMessages = [
    'Hello, I am looking for properties in San Francisco',
    'Calculate mortgage for a $500,000 house with 20% down payment',
    'Show me current mortgage rates',
    'What are the best neighborhoods for families?'
  ];

  for (const message of testMessages) {
    try {
      console.log(`\nTesting: "${message}"`);
      const response = await axios.post(`${SERVER_URL}/api/mcp/test`, {
        message,
        userId: TEST_USER_ID,
        sessionId: TEST_SESSION_ID
      });
      
      if (response.data.success) {
        console.log('✅ Message processed successfully');
        console.log('Response type:', response.data.data.type);
        console.log('Intent:', response.data.data.data?.intent || 'Not detected');
      } else {
        console.log('❌ Message processing failed:', response.data.error);
      }
    } catch (error) {
      console.log('❌ Message processing error:', error.message);
    }
  }

  // Test 4: Socket.IO Connection
  console.log('\n4. Testing Socket.IO Connection...');
  const socket = io(SERVER_URL);
  
  socket.on('connect', () => {
    console.log('✅ Socket.IO connected successfully');
    
    // Join a test room
    socket.emit('join-room', 'test-room');
    
    // Send a test message
    socket.emit('chat-message', {
      message: 'Test message via Socket.IO',
      userId: TEST_USER_ID,
      sessionId: TEST_SESSION_ID,
      roomId: 'test-room'
    });
  });

  socket.on('chat-response', (response) => {
    console.log('✅ Received chat response via Socket.IO');
    console.log('Response:', response.message);
    socket.disconnect();
  });

  socket.on('connect_error', (error) => {
    console.log('❌ Socket.IO connection failed:', error.message);
  });

  socket.on('error', (error) => {
    console.log('❌ Socket.IO error:', error.message);
  });

  // Test 5: Chat History
  console.log('\n5. Testing Chat History...');
  try {
    const response = await axios.get(`${SERVER_URL}/api/chat/history`, {
      params: { userId: TEST_USER_ID, limit: 5 }
    });
    console.log('✅ Chat history retrieved:', response.data.total, 'messages');
  } catch (error) {
    console.log('❌ Chat history test failed:', error.message);
  }

  // Clean up after tests
  setTimeout(() => {
    console.log('\n🧹 Cleaning up test data...');
    axios.delete(`${SERVER_URL}/api/chat/history`, {
      data: { userId: TEST_USER_ID }
    }).then(() => {
      console.log('✅ Test data cleaned up');
      console.log('\n🎉 Test suite completed!');
      process.exit(0);
    }).catch(() => {
      console.log('⚠️ Could not clean up test data');
      process.exit(0);
    });
  }, 3000);
}

// Run the test suite
if (require.main === module) {
  testChatbot().catch(console.error);
}

module.exports = testChatbot;