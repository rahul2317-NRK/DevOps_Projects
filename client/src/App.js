import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import {
  Container,
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const roomId = 'demo-room-123';

  // API base URL - use current origin for Vercel deployment
  const API_BASE = process.env.NODE_ENV === 'production' 
    ? window.location.origin 
    : 'http://localhost:5000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize Socket.IO connection (fallback for real-time features)
    try {
      socketRef.current = io(API_BASE, {
        transports: ['websocket', 'polling'],
        timeout: 5000
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        socketRef.current.emit('join-room', roomId);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      socketRef.current.on('chat-response', (response) => {
        console.log('Received response:', response);
        setIsLoading(false);
        
        const botMessage = {
          id: Date.now(),
          text: response.message,
          sender: 'bot',
          timestamp: new Date(),
          data: response.data
        };
        
        setMessages(prev => [...prev, botMessage]);
        
        if (response.data?.suggestions) {
          setSuggestions(response.data.suggestions);
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.log('Connection error:', error);
        setIsConnected(false);
      });

    } catch (error) {
      console.error('Socket initialization error:', error);
      setIsConnected(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [API_BASE]);

  const sendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError('');

    try {
      // Try Socket.IO first if connected
      if (isConnected && socketRef.current) {
        socketRef.current.emit('chat-message', {
          message: messageText,
          roomId: roomId,
          userId: 'demo-user-123',
          timestamp: new Date().toISOString()
        });
      } else {
        // Fallback to REST API for Vercel deployment
        const response = await fetch(`${API_BASE}/api/mcp/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageText,
            userId: 'demo-user-123',
            roomId: roomId
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        const botMessage = {
          id: Date.now() + 1,
          text: data.message,
          sender: 'bot',
          timestamp: new Date(),
          data: data.data
        };
        
        setMessages(prev => [...prev, botMessage]);
        
        if (data.data?.suggestions) {
          setSuggestions(data.data.suggestions);
        }
        
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      setIsLoading(false);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
    setSuggestions([]);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const testAPI = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      const data = await response.json();
      console.log('API Health Check:', data);
      
      const healthMessage = {
        id: Date.now(),
        text: `API Health Check: ${data.status} - Platform: ${data.platform || 'Server'} - Version: ${data.version}`,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, healthMessage]);
    } catch (error) {
      console.error('API test failed:', error);
      setError('API connection failed');
    }
  };

  return (
    <Container maxWidth="md" className="chat-container">
      <Paper elevation={3} className="chat-paper">
        {/* Header */}
        <Box className="chat-header">
          <Typography variant="h4" component="h1" gutterBottom>
            🤖 Blue Pixel AI Chatbot
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Your Real Estate Assistant
          </Typography>
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Chip 
              label={isConnected ? "Connected" : "Offline"} 
              color={isConnected ? "success" : "warning"}
              size="small"
            />
            <Button 
              size="small" 
              variant="outlined" 
              onClick={testAPI}
            >
              Test API
            </Button>
          </Box>
        </Box>

        {/* Messages */}
        <List className="messages-list">
          {messages.length === 0 && (
            <ListItem>
              <Box className="welcome-message">
                <Typography variant="h6" gutterBottom>
                  👋 Welcome to Blue Pixel AI!
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  I'm here to help you with all your real estate needs. Try asking me about:
                </Typography>
                <Box mt={2} display="flex" flexWrap="wrap" gap={1}>
                  {['Show me houses in San Francisco', 'Calculate mortgage for $500,000', 'What are current interest rates?', 'Find 3-bedroom apartments'].map((suggestion, index) => (
                    <Chip
                      key={index}
                      label={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      clickable
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            </ListItem>
          )}
          
          {messages.map((message) => (
            <ListItem key={message.id} className={`message-item ${message.sender}`}>
              <Box className="message-content">
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Avatar className={`avatar ${message.sender}`}>
                    {message.sender === 'bot' ? <BotIcon /> : <PersonIcon />}
                  </Avatar>
                  <Box className="message-bubble">
                    <Typography variant="body1">
                      {message.text}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {message.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </ListItem>
          ))}
          
          {isLoading && (
            <ListItem>
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar className="avatar bot">
                  <BotIcon />
                </Avatar>
                <CircularProgress size={20} />
                <Typography variant="body2" color="textSecondary">
                  Thinking...
                </Typography>
              </Box>
            </ListItem>
          )}
          
          <div ref={messagesEndRef} />
        </List>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <Box className="suggestions">
            <Typography variant="subtitle2" gutterBottom>
              Suggestions:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {suggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  clickable
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Input */}
        <Box className="message-input">
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about properties, mortgages, or real estate..."
            variant="outlined"
            disabled={isLoading}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="send-button"
          >
            <SendIcon />
          </Button>
        </Box>
      </Paper>

      {/* Error Snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App;