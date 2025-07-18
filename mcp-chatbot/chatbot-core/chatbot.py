#!/usr/bin/env python3
"""
Core Chatbot Application
Integrates with MCP client to provide intelligent conversation capabilities
"""

import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple, Union
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

# Import MCP client
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from mcp_client.client import MCPChatbotClient, ChatbotMCPInterface, create_default_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Types of messages in the chat"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    ERROR = "error"

@dataclass
class ChatResponse:
    """Response from the chatbot"""
    content: str
    message_type: MessageType
    metadata: Dict[str, Any]
    timestamp: datetime

class IntentClassifier:
    """Simple intent classification for chatbot messages"""
    
    def __init__(self):
        self.patterns = {
            'greeting': [
                r'\b(hello|hi|hey|good morning|good afternoon|good evening)\b',
                r'\b(how are you|what\'s up|how\'s it going)\b'
            ],
            'question': [
                r'\b(what|how|when|where|why|who|which)\b',
                r'\?'
            ],
            'help': [
                r'\b(help|assist|support|guide)\b',
                r'\b(how do i|can you help|need help)\b'
            ],
            'search': [
                r'\b(search|find|look for|show me)\b',
                r'\b(history|previous|past)\b'
            ],
            'settings': [
                r'\b(settings|preferences|config|configure)\b',
                r'\b(change|update|modify)\b'
            ],
            'goodbye': [
                r'\b(bye|goodbye|see you|farewell|exit|quit)\b',
                r'\b(thanks|thank you|that\'s all)\b'
            ]
        }
    
    def classify(self, message: str) -> str:
        """Classify the intent of a message"""
        message_lower = message.lower()
        
        for intent, patterns in self.patterns.items():
            for pattern in patterns:
                if re.search(pattern, message_lower):
                    return intent
        
        return 'general'

class ResponseGenerator:
    """Generates responses based on intent and context"""
    
    def __init__(self):
        self.templates = {
            'greeting': [
                "Hello! How can I help you today?",
                "Hi there! What can I do for you?",
                "Good to see you! How may I assist you?"
            ],
            'help': [
                "I'm here to help! You can ask me questions, search through our conversation history, or update your preferences.",
                "I can assist you with various tasks like answering questions, searching messages, and managing settings.",
                "Here are some things I can help with:\n- Answer questions\n- Search conversation history\n- Manage your preferences\n- Provide information"
            ],
            'search_no_results': [
                "I couldn't find any messages matching your search.",
                "No results found for your search query.",
                "Sorry, I didn't find any matching messages."
            ],
            'error': [
                "I'm sorry, I encountered an error. Please try again.",
                "Something went wrong. Could you please rephrase your request?",
                "I'm having trouble processing that. Please try again."
            ],
            'goodbye': [
                "Goodbye! Feel free to come back anytime.",
                "See you later! Have a great day!",
                "Thanks for chatting! Take care!"
            ]
        }
    
    def generate(self, intent: str, context: Dict[str, Any] = None) -> str:
        """Generate a response based on intent and context"""
        if intent in self.templates:
            templates = self.templates[intent]
            # Simple template selection (could be more sophisticated)
            return templates[0]
        else:
            return "I understand you're asking about something, but I'm not sure how to help with that specific request."

class MCPChatbot:
    """Main chatbot class that integrates with MCP"""
    
    def __init__(self, mcp_client: MCPChatbotClient):
        self.mcp_interface = ChatbotMCPInterface(mcp_client)
        self.intent_classifier = IntentClassifier()
        self.response_generator = ResponseGenerator()
        self.conversation_context: Dict[str, Any] = {}
        self.current_session_id: Optional[str] = None
        self.current_user_id: Optional[str] = None
    
    async def initialize(self, user_id: str, session_name: Optional[str] = None) -> str:
        """Initialize the chatbot for a user session"""
        try:
            session_id = await self.mcp_interface.start_chat_session(user_id, session_name)
            self.current_session_id = session_id
            self.current_user_id = user_id
            
            # Initialize conversation context
            self.conversation_context = {
                "session_id": session_id,
                "user_id": user_id,
                "session_name": session_name,
                "start_time": datetime.now().isoformat(),
                "message_count": 0
            }
            
            logger.info(f"Initialized chatbot for user {user_id}, session {session_id}")
            return session_id
            
        except Exception as e:
            logger.error(f"Failed to initialize chatbot: {e}")
            raise
    
    async def process_message(self, message: str) -> ChatResponse:
        """Process a user message and generate a response"""
        try:
            # Update conversation context
            self.conversation_context["message_count"] += 1
            self.conversation_context["last_message_time"] = datetime.now().isoformat()
            
            # Classify intent
            intent = self.intent_classifier.classify(message)
            logger.info(f"Classified message intent: {intent}")
            
            # Store the user message
            await self.mcp_interface.send_message(message)
            
            # Handle different intents
            if intent == 'greeting':
                response_content = self.response_generator.generate('greeting')
                
            elif intent == 'help':
                response_content = self.response_generator.generate('help')
                
            elif intent == 'search':
                response_content = await self._handle_search(message)
                
            elif intent == 'settings':
                response_content = await self._handle_settings(message)
                
            elif intent == 'question':
                response_content = await self._handle_question(message)
                
            elif intent == 'goodbye':
                response_content = self.response_generator.generate('goodbye')
                
            else:
                response_content = await self._handle_general_message(message)
            
            # Store the assistant response
            await self.mcp_interface.send_message(response_content)
            
            return ChatResponse(
                content=response_content,
                message_type=MessageType.ASSISTANT,
                metadata={
                    "intent": intent,
                    "session_id": self.current_session_id,
                    "user_id": self.current_user_id,
                    "context": self.conversation_context
                },
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            error_response = self.response_generator.generate('error')
            
            return ChatResponse(
                content=error_response,
                message_type=MessageType.ERROR,
                metadata={"error": str(e)},
                timestamp=datetime.now()
            )
    
    async def _handle_search(self, message: str) -> str:
        """Handle search-related messages"""
        # Extract search query from message
        search_patterns = [
            r'search for (.+)',
            r'find (.+)',
            r'look for (.+)',
            r'show me (.+)',
            r'history of (.+)'
        ]
        
        query = None
        for pattern in search_patterns:
            match = re.search(pattern, message.lower())
            if match:
                query = match.group(1).strip()
                break
        
        if not query:
            # If no specific query found, search for keywords in the message
            words = message.split()
            # Remove common words
            stop_words = {'search', 'find', 'look', 'for', 'show', 'me', 'history', 'of', 'the', 'a', 'an', 'and', 'or', 'but'}
            query = ' '.join([word for word in words if word.lower() not in stop_words])
        
        if query:
            results = await self.mcp_interface.search_conversation(query, limit=5)
            
            if results:
                response = f"I found {len(results)} messages related to '{query}':\n\n"
                for i, msg in enumerate(results, 1):
                    timestamp = msg.get('timestamp', 'Unknown time')
                    content = msg.get('content', '')[:100] + ('...' if len(msg.get('content', '')) > 100 else '')
                    response += f"{i}. [{timestamp}] {content}\n"
                return response
            else:
                return self.response_generator.generate('search_no_results')
        else:
            return "I'd be happy to search for something. What would you like me to look for?"
    
    async def _handle_settings(self, message: str) -> str:
        """Handle settings-related messages"""
        try:
            user_settings = await self.mcp_interface.get_user_settings()
            
            if 'show' in message.lower() or 'what' in message.lower():
                # Show current settings
                settings_text = "Your current settings:\n"
                for key, value in user_settings.items():
                    if key != 'user_id':
                        settings_text += f"- {key.replace('_', ' ').title()}: {value}\n"
                return settings_text
            else:
                return "I can show you your current settings or help you change them. What would you like to do?"
                
        except Exception as e:
            logger.error(f"Error handling settings: {e}")
            return "I'm having trouble accessing your settings right now. Please try again later."
    
    async def _handle_question(self, message: str) -> str:
        """Handle question-type messages"""
        # This is a simplified handler - in a real implementation,
        # you might integrate with a knowledge base or external APIs
        
        question_lower = message.lower()
        
        if 'time' in question_lower:
            return f"The current time is {datetime.now().strftime('%I:%M %p on %B %d, %Y')}"
        
        elif 'weather' in question_lower:
            return "I don't have access to current weather information, but you could check a weather website or app for the most up-to-date forecast."
        
        elif 'name' in question_lower:
            return "I'm an AI chatbot designed to help you with various tasks and answer questions."
        
        elif 'help' in question_lower or 'do' in question_lower:
            return self.response_generator.generate('help')
        
        else:
            return "That's an interesting question! While I don't have specific information about that topic, I can help you search through our conversation history or assist with other tasks."
    
    async def _handle_general_message(self, message: str) -> str:
        """Handle general messages that don't fit specific intents"""
        # This could be enhanced with more sophisticated NLP or integration with LLMs
        
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['thank', 'thanks', 'appreciate']):
            return "You're welcome! I'm happy to help. Is there anything else you'd like to know?"
        
        elif any(word in message_lower for word in ['good', 'great', 'excellent', 'awesome']):
            return "I'm glad to hear that! How else can I assist you today?"
        
        elif any(word in message_lower for word in ['bad', 'terrible', 'awful', 'problem']):
            return "I'm sorry to hear that. Is there something I can help you with to make things better?"
        
        else:
            return "I understand you're sharing something with me. While I may not have specific information about that, I'm here to help with any questions or tasks you might have."
    
    async def get_conversation_summary(self) -> Dict[str, Any]:
        """Get a summary of the current conversation"""
        try:
            messages = await self.mcp_interface.get_recent_messages(limit=50)
            
            total_messages = len(messages)
            user_messages = len([msg for msg in messages if msg.get('user_id') == self.current_user_id])
            assistant_messages = total_messages - user_messages
            
            return {
                "session_id": self.current_session_id,
                "user_id": self.current_user_id,
                "total_messages": total_messages,
                "user_messages": user_messages,
                "assistant_messages": assistant_messages,
                "session_start": self.conversation_context.get("start_time"),
                "last_activity": self.conversation_context.get("last_message_time"),
                "context": self.conversation_context
            }
            
        except Exception as e:
            logger.error(f"Error getting conversation summary: {e}")
            return {"error": str(e)}
    
    async def end_session(self) -> str:
        """End the current chat session"""
        session_id = self.current_session_id
        self.current_session_id = None
        self.current_user_id = None
        self.conversation_context = {}
        
        return f"Session {session_id} ended. Thank you for chatting!"

async def main():
    """Example usage of the MCPChatbot"""
    # Create MCP client
    mcp_client = create_default_client()
    
    try:
        # Initialize MCP client
        await mcp_client.initialize()
        
        # Create chatbot
        chatbot = MCPChatbot(mcp_client)
        
        # Initialize chatbot session
        session_id = await chatbot.initialize("user123", "Demo Session")
        print(f"Started chatbot session: {session_id}")
        
        # Simulate conversation
        test_messages = [
            "Hello!",
            "Can you help me?",
            "Search for previous messages",
            "What are my settings?",
            "What time is it?",
            "Thanks for your help!",
            "Goodbye!"
        ]
        
        for message in test_messages:
            print(f"\nUser: {message}")
            response = await chatbot.process_message(message)
            print(f"Assistant: {response.content}")
            print(f"Intent: {response.metadata.get('intent', 'unknown')}")
        
        # Get conversation summary
        summary = await chatbot.get_conversation_summary()
        print(f"\nConversation Summary: {json.dumps(summary, indent=2)}")
        
        # End session
        end_message = await chatbot.end_session()
        print(f"\n{end_message}")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")
    finally:
        await mcp_client.close()

if __name__ == "__main__":
    asyncio.run(main())