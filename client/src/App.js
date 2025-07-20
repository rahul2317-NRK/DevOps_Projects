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
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  CheckCircle as ConnectedIcon,
  Error as DisconnectedIcon
} from '@mui/icons-material';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking');
  const messagesEndRef = useRef(null);
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
    // Check API status on load
    checkApiStatus();
    
    // Add welcome message
    const welcomeMessage = {
      id: 'welcome',
      text: 'Welcome to Blue Pixel AI! I\'m here to help you with all your real estate needs.',
      sender: 'bot',
      timestamp: new Date(),
      data: {
        suggestions: [
          'Show me houses in San Francisco',
          'Calculate mortgage for $500,000',
          'What are current interest rates?',
          'Find 3-bedroom apartments'
        ]
      }
    };
    
    setMessages([welcomeMessage]);
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      if (response.ok) {
        const data = await response.json();
        setApiStatus('connected');
        console.log('API Status:', data);
      } else {
        setApiStatus('error');
      }
    } catch (error) {
      console.error('API check failed:', error);
      setApiStatus('error');
    }
  };

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
      // Use REST API for Vercel deployment
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
      setApiStatus('connected');
    } catch (error) {
      console.error('API test failed:', error);
      setError('API connection failed');
      setApiStatus('error');
    }
  };

  const testPropertySearch = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/property/search?city=San Francisco&maxPrice=900000`);
      const data = await response.json();
      
      if (data.success && data.properties.length > 0) {
        const property = data.properties[0];
        const propertyMessage = {
          id: Date.now(),
          text: `Found ${data.total} properties! Here's one: ${property.address}, ${property.city}, ${property.state} - $${property.price.toLocaleString()} - ${property.bedrooms}bed/${property.bathrooms}bath - ${property.description}`,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, propertyMessage]);
      } else {
        throw new Error('No properties found');
      }
    } catch (error) {
      console.error('Property search failed:', error);
      setError('Property search failed');
    }
  };

  const testMortgageCalculation = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/mortgage/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loanAmount: 500000,
          interestRate: 6.5,
          loanTerm: 30,
          downPayment: 100000
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const calc = data.calculation;
        const mortgageMessage = {
          id: Date.now(),
          text: `Mortgage Calculation: For a $${calc.loanDetails.loanAmount.toLocaleString()} loan at ${calc.loanDetails.interestRate}% for ${calc.loanDetails.loanTerm} years with $${calc.loanDetails.downPayment.toLocaleString()} down payment: Monthly Payment: $${calc.monthlyPayment.toLocaleString()}, Total Interest: $${calc.totalInterest.toLocaleString()}`,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, mortgageMessage]);
      } else {
        throw new Error('Calculation failed');
      }
    } catch (error) {
      console.error('Mortgage calculation failed:', error);
      setError('Mortgage calculation failed');
    }
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'connected': return 'success';
      case 'error': return 'error';
      default: return 'warning';
    }
  };

  const getStatusLabel = () => {
    switch (apiStatus) {
      case 'connected': return 'API Connected';
      case 'error': return 'API Error';
      default: return 'Checking...';
    }
  };

  const getStatusIcon = () => {
    switch (apiStatus) {
      case 'connected': return <ConnectedIcon />;
      case 'error': return <DisconnectedIcon />;
      default: return <CircularProgress size={16} />;
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
            Your Real Estate Assistant (REST API Mode)
          </Typography>
          <Box display="flex" alignItems="center" gap={1} mt={1} flexWrap="wrap">
            <Chip 
              label={getStatusLabel()}
              color={getStatusColor()}
              size="small"
              icon={getStatusIcon()}
            />
            <Button 
              size="small" 
              variant="outlined" 
              onClick={testAPI}
            >
              Test API
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={testPropertySearch}
            >
              Test Properties
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={testMortgageCalculation}
            >
              Test Mortgage
            </Button>
          </Box>
        </Box>

        {/* Messages */}
        <List className="messages-list">
          {messages.length === 1 && messages[0].id === 'welcome' && (
            <ListItem>
              <Box className="welcome-message">
                <Typography variant="h6" gutterBottom>
                  👋 Welcome to Blue Pixel AI!
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  I'm here to help you with all your real estate needs. Try asking me about:
                </Typography>
                <Box mt={2} display="flex" flexWrap="wrap" gap={1}>
                  {messages[0].data?.suggestions?.map((suggestion, index) => (
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
                  Processing your request...
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