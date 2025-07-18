#!/usr/bin/env python3
"""
API Gateway for MCP Chatbot
Provides REST API endpoints for the chatbot system
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

# Import MCP components
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from mcp_client.client import create_default_client, MCPChatbotClient
from chatbot_core.chatbot import MCPChatbot, MessageType

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
mcp_client: Optional[MCPChatbotClient] = None
active_chatbots: Dict[str, MCPChatbot] = {}

# Pydantic models
class ChatMessage(BaseModel):
    content: str = Field(..., description="Message content")
    user_id: str = Field(..., description="User identifier")
    session_id: Optional[str] = Field(None, description="Session identifier")

class ChatResponse(BaseModel):
    content: str
    message_type: str
    metadata: Dict[str, Any]
    timestamp: str

class SessionCreate(BaseModel):
    user_id: str = Field(..., description="User identifier")
    session_name: Optional[str] = Field(None, description="Optional session name")

class SessionResponse(BaseModel):
    session_id: str
    user_id: str
    session_name: str
    created_at: str

class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    session_id: Optional[str] = Field(None, description="Session to search in")
    limit: int = Field(10, description="Maximum number of results")

class WebSocketManager:
    """Manages WebSocket connections for real-time chat"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session: {session_id}")
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected for session: {session_id}")
    
    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending WebSocket message: {e}")
                self.disconnect(session_id)

websocket_manager = WebSocketManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global mcp_client
    
    # Startup
    logger.info("Starting MCP Chatbot API Gateway...")
    mcp_client = create_default_client()
    try:
        await mcp_client.initialize()
        logger.info("MCP client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize MCP client: {e}")
        # Continue without MCP client for now
    
    yield
    
    # Shutdown
    logger.info("Shutting down MCP Chatbot API Gateway...")
    if mcp_client:
        await mcp_client.close()
    
    # Close all active chatbots
    for chatbot in active_chatbots.values():
        try:
            await chatbot.end_session()
        except Exception as e:
            logger.error(f"Error ending chatbot session: {e}")
    
    active_chatbots.clear()

# Create FastAPI app
app = FastAPI(
    title="MCP Chatbot API",
    description="REST API for MCP-based chatbot system",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get MCP client
async def get_mcp_client() -> MCPChatbotClient:
    if mcp_client is None:
        raise HTTPException(status_code=503, detail="MCP client not available")
    return mcp_client

# Dependency to get or create chatbot
async def get_chatbot(session_id: str, user_id: str) -> MCPChatbot:
    if session_id not in active_chatbots:
        client = await get_mcp_client()
        chatbot = MCPChatbot(client)
        try:
            await chatbot.initialize(user_id, f"Session {session_id}")
            active_chatbots[session_id] = chatbot
        except Exception as e:
            logger.error(f"Failed to initialize chatbot: {e}")
            raise HTTPException(status_code=500, detail="Failed to initialize chatbot")
    
    return active_chatbots[session_id]

# API Routes

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "MCP Chatbot API Gateway", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        client = await get_mcp_client()
        status = await client.get_system_status()
        return {"status": "healthy", "mcp_status": status}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.post("/sessions", response_model=SessionResponse)
async def create_session(session_data: SessionCreate):
    """Create a new chat session"""
    try:
        client = await get_mcp_client()
        result = await client.create_session(session_data.user_id, session_data.session_name)
        
        return SessionResponse(
            session_id=result["session_id"],
            user_id=result["user_id"],
            session_name=result["session_name"],
            created_at=result["created_at"]
        )
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")

@app.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str, limit: int = 50):
    """Get messages for a session"""
    try:
        client = await get_mcp_client()
        messages = await client.get_chat_history(session_id, limit)
        return {"messages": messages}
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get messages")

@app.post("/chat", response_model=ChatResponse)
async def send_message(message: ChatMessage):
    """Send a message to the chatbot"""
    try:
        # Get or create chatbot for this session
        if not message.session_id:
            # Create a new session if none provided
            client = await get_mcp_client()
            session_result = await client.create_session(message.user_id)
            message.session_id = session_result["session_id"]
        
        chatbot = await get_chatbot(message.session_id, message.user_id)
        
        # Process the message
        response = await chatbot.process_message(message.content)
        
        # Convert response to API format
        api_response = ChatResponse(
            content=response.content,
            message_type=response.message_type.value,
            metadata=response.metadata,
            timestamp=response.timestamp.isoformat()
        )
        
        # Send to WebSocket if connected
        await websocket_manager.send_message(message.session_id, api_response.dict())
        
        return api_response
        
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        raise HTTPException(status_code=500, detail="Failed to process message")

@app.post("/search")
async def search_messages(search_request: SearchRequest):
    """Search through chat messages"""
    try:
        client = await get_mcp_client()
        results = await client.search_messages(
            query=search_request.query,
            session_id=search_request.session_id,
            limit=search_request.limit
        )
        return {"results": results}
    except Exception as e:
        logger.error(f"Error searching messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to search messages")

@app.get("/users/{user_id}/preferences")
async def get_user_preferences(user_id: str):
    """Get user preferences"""
    try:
        client = await get_mcp_client()
        preferences = await client.get_user_preferences(user_id)
        return preferences
    except Exception as e:
        logger.error(f"Error getting user preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user preferences")

@app.get("/sessions/{session_id}/summary")
async def get_session_summary(session_id: str):
    """Get session summary"""
    try:
        if session_id in active_chatbots:
            chatbot = active_chatbots[session_id]
            summary = await chatbot.get_conversation_summary()
            return summary
        else:
            # Get basic info from MCP client
            client = await get_mcp_client()
            messages = await client.get_chat_history(session_id, limit=100)
            return {
                "session_id": session_id,
                "total_messages": len(messages),
                "last_activity": messages[-1]["timestamp"] if messages else None
            }
    except Exception as e:
        logger.error(f"Error getting session summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session summary")

@app.delete("/sessions/{session_id}")
async def end_session(session_id: str):
    """End a chat session"""
    try:
        if session_id in active_chatbots:
            chatbot = active_chatbots[session_id]
            message = await chatbot.end_session()
            del active_chatbots[session_id]
            return {"message": message}
        else:
            return {"message": f"Session {session_id} was not active"}
    except Exception as e:
        logger.error(f"Error ending session: {e}")
        raise HTTPException(status_code=500, detail="Failed to end session")

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time chat"""
    await websocket_manager.connect(websocket, session_id)
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Process message through chatbot
            message = ChatMessage(
                content=message_data["content"],
                user_id=message_data["user_id"],
                session_id=session_id
            )
            
            try:
                chatbot = await get_chatbot(session_id, message.user_id)
                response = await chatbot.process_message(message.content)
                
                # Send response back
                await websocket.send_text(json.dumps({
                    "content": response.content,
                    "message_type": response.message_type.value,
                    "metadata": response.metadata,
                    "timestamp": response.timestamp.isoformat()
                }))
                
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await websocket.send_text(json.dumps({
                    "error": "Failed to process message",
                    "details": str(e)
                }))
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        websocket_manager.disconnect(session_id)

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "status_code": 500}
    )

def main():
    """Run the API gateway"""
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()