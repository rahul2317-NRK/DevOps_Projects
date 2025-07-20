import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
  CircularProgress,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import {
  Send as SendIcon,
  Home as HomeIcon,
  Calculate as CalculateIcon,
  Favorite as FavoriteIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || window.location.origin;

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userId] = useState(`user-${Date.now()}`);
  const [sessionId] = useState(`session-${Date.now()}`);
  const [roomId] = useState(`room-${Date.now()}`);
  
  const socket = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    socket.current = io(SOCKET_URL);
    
    socket.current.on('connect', () => {
      setIsConnected(true);
      socket.current.emit('join-room', roomId);
      
      // Add welcome message
      setMessages([{
        id: 'welcome',
        type: 'bot',
        message: 'Welcome to Blue Pixel AI! I\'m here to help you with all your real estate needs. Ask me about properties, mortgage calculations, or market trends.',
        timestamp: new Date().toISOString(),
        suggestions: [
          'Show me houses in San Francisco',
          'Calculate mortgage for $500,000',
          'What are current interest rates?',
          'Find 3-bedroom apartments'
        ]
      }]);
    });

    socket.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.current.on('chat-response', (response) => {
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        type: 'bot',
        ...response,
        timestamp: new Date().toISOString()
      }]);
    });

    socket.current.on('error', (error) => {
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'error',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    });

    return () => {
      socket.current?.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      message: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Send via Socket.IO if connected
    if (isConnected && socket.current) {
      socket.current.emit('chat-message', {
        message: inputMessage.trim(),
        userId,
        sessionId,
        roomId
      });
    } else {
      // Fallback to REST API
      try {
        const response = await axios.post(`${API_BASE_URL}/api/mcp/test`, {
          message: inputMessage.trim(),
          userId,
          sessionId
        });

        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          type: 'bot',
          ...response.data.data,
          timestamp: new Date().toISOString()
        }]);
      } catch (error) {
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          type: 'error',
          message: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString()
        }]);
      } finally {
        setIsLoading(false);
      }
    }

    setInputMessage('');
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
  };

  const formatMessage = (message) => {
    if (typeof message === 'string') return message;
    if (message.message) return message.message;
    return JSON.stringify(message, null, 2);
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
        <Toolbar>
          <HomeIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Blue Pixel AI Chatbot
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={isConnected ? 'Connected' : 'Disconnected'}
              color={isConnected ? 'success' : 'error'}
              size="small"
              variant="outlined"
              sx={{ color: 'white', borderColor: 'white' }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Chat Area */}
      <Container maxWidth="md" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', py: 2 }}>
        <Paper elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
            <List>
              {messages.map((msg) => (
                <ListItem
                  key={msg.id}
                  sx={{
                    flexDirection: 'column',
                    alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start',
                    mb: 1
                  }}
                >
                  <Card
                    sx={{
                      maxWidth: '70%',
                      backgroundColor: msg.type === 'user' ? '#1976d2' : 
                                     msg.type === 'error' ? '#f44336' : '#f5f5f5',
                      color: msg.type === 'user' || msg.type === 'error' ? 'white' : 'black'
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="body1" component="div">
                        {formatMessage(msg)}
                      </Typography>
                      
                      {/* Suggestions */}
                      {msg.suggestions && (
                        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {msg.suggestions.map((suggestion, index) => (
                            <Chip
                              key={index}
                              label={suggestion}
                              onClick={() => handleSuggestionClick(suggestion)}
                              size="small"
                              variant="outlined"
                              sx={{ cursor: 'pointer' }}
                            />
                          ))}
                        </Box>
                      )}
                      
                      {/* Follow-up questions */}
                      {msg.data?.followUpQuestions && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                            Follow-up questions:
                          </Typography>
                          {msg.data.followUpQuestions.map((question, index) => (
                            <Chip
                              key={index}
                              label={question}
                              onClick={() => handleSuggestionClick(question)}
                              size="small"
                              variant="outlined"
                              sx={{ cursor: 'pointer', mr: 1, mb: 1 }}
                            />
                          ))}
                        </Box>
                      )}
                      
                      <Typography variant="caption" sx={{ mt: 1, opacity: 0.7, display: 'block' }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </ListItem>
              ))}
              
              {isLoading && (
                <ListItem sx={{ justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    AI is thinking...
                  </Typography>
                </ListItem>
              )}
            </List>
            <div ref={messagesEndRef} />
          </Box>

          {/* Input Area */}
          <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                startIcon={<HomeIcon />}
                onClick={() => handleSuggestionClick('Show me houses in my area')}
                size="small"
                variant="outlined"
              >
                Properties
              </Button>
              <Button
                startIcon={<CalculateIcon />}
                onClick={() => handleSuggestionClick('Calculate mortgage payment')}
                size="small"
                variant="outlined"
              >
                Mortgage
              </Button>
              <Button
                startIcon={<TrendingUpIcon />}
                onClick={() => handleSuggestionClick('What are current interest rates?')}
                size="small"
                variant="outlined"
              >
                Rates
              </Button>
              <Button
                startIcon={<FavoriteIcon />}
                onClick={() => handleSuggestionClick('Show my saved properties')}
                size="small"
                variant="outlined"
              >
                Saved
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about real estate, properties, mortgages..."
                variant="outlined"
                disabled={isLoading}
                sx={{ backgroundColor: 'white' }}
              />
              <Button
                variant="contained"
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                <SendIcon />
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default App;