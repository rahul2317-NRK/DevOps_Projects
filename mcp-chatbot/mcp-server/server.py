#!/usr/bin/env python3
"""
MCP Server Implementation for Chatbot
Provides tools and resources for the chatbot application
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

# MCP SDK imports (would be from actual MCP SDK)
from mcp import Server, Tool, Resource, types
from mcp.server import NotificationOptions, RequestOptions
from mcp.server.models import InitializeResult
from mcp.server.session import ServerSession
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    GetResourceRequest,
    GetResourceResult,
    ListResourcesRequest,
    ListResourcesResult,
    ListToolsRequest,
    ListToolsResult,
    TextContent,
    ImageContent,
    EmbeddedResource,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ChatMessage:
    """Represents a chat message"""
    id: str
    content: str
    timestamp: datetime
    user_id: str
    session_id: str

class MCPChatbotServer:
    """Main MCP Server for Chatbot functionality"""
    
    def __init__(self):
        self.server = Server("chatbot-mcp-server")
        self.chat_history: Dict[str, List[ChatMessage]] = {}
        self.user_sessions: Dict[str, Dict[str, Any]] = {}
        self.setup_handlers()
    
    def setup_handlers(self):
        """Setup MCP server handlers"""
        
        @self.server.list_resources()
        async def handle_list_resources() -> ListResourcesResult:
            """List available resources"""
            return ListResourcesResult(
                resources=[
                    Resource(
                        uri="chatbot://chat-history",
                        name="Chat History",
                        description="Access to chat conversation history",
                        mimeType="application/json",
                    ),
                    Resource(
                        uri="chatbot://user-sessions",
                        name="User Sessions",
                        description="Active user session information",
                        mimeType="application/json",
                    ),
                    Resource(
                        uri="chatbot://system-status",
                        name="System Status",
                        description="Current system health and metrics",
                        mimeType="application/json",
                    ),
                ]
            )
        
        @self.server.get_resource()
        async def handle_get_resource(request: GetResourceRequest) -> GetResourceResult:
            """Get specific resource content"""
            uri = request.uri
            
            if uri == "chatbot://chat-history":
                return GetResourceResult(
                    contents=[
                        TextContent(
                            type="text",
                            text=json.dumps(self.chat_history, default=str, indent=2)
                        )
                    ]
                )
            elif uri == "chatbot://user-sessions":
                return GetResourceResult(
                    contents=[
                        TextContent(
                            type="text",
                            text=json.dumps(self.user_sessions, default=str, indent=2)
                        )
                    ]
                )
            elif uri == "chatbot://system-status":
                status = {
                    "active_sessions": len(self.user_sessions),
                    "total_messages": sum(len(messages) for messages in self.chat_history.values()),
                    "server_time": datetime.now().isoformat(),
                    "status": "healthy"
                }
                return GetResourceResult(
                    contents=[
                        TextContent(
                            type="text",
                            text=json.dumps(status, indent=2)
                        )
                    ]
                )
            else:
                raise ValueError(f"Unknown resource: {uri}")
        
        @self.server.list_tools()
        async def handle_list_tools() -> ListToolsResult:
            """List available tools"""
            return ListToolsResult(
                tools=[
                    Tool(
                        name="send_message",
                        description="Send a message in the chat",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "content": {"type": "string", "description": "Message content"},
                                "user_id": {"type": "string", "description": "User identifier"},
                                "session_id": {"type": "string", "description": "Session identifier"}
                            },
                            "required": ["content", "user_id", "session_id"]
                        }
                    ),
                    Tool(
                        name="get_chat_history",
                        description="Retrieve chat history for a session",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "session_id": {"type": "string", "description": "Session identifier"},
                                "limit": {"type": "integer", "description": "Maximum number of messages to return", "default": 50}
                            },
                            "required": ["session_id"]
                        }
                    ),
                    Tool(
                        name="create_session",
                        description="Create a new chat session",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "user_id": {"type": "string", "description": "User identifier"},
                                "session_name": {"type": "string", "description": "Optional session name"}
                            },
                            "required": ["user_id"]
                        }
                    ),
                    Tool(
                        name="search_messages",
                        description="Search through chat messages",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "Search query"},
                                "session_id": {"type": "string", "description": "Session to search in"},
                                "limit": {"type": "integer", "description": "Maximum results", "default": 10}
                            },
                            "required": ["query"]
                        }
                    ),
                    Tool(
                        name="get_user_preferences",
                        description="Get user preferences and settings",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "user_id": {"type": "string", "description": "User identifier"}
                            },
                            "required": ["user_id"]
                        }
                    ),
                ]
            )
        
        @self.server.call_tool()
        async def handle_call_tool(request: CallToolRequest) -> CallToolResult:
            """Handle tool execution"""
            tool_name = request.name
            arguments = request.arguments or {}
            
            try:
                if tool_name == "send_message":
                    result = await self.send_message(
                        content=arguments["content"],
                        user_id=arguments["user_id"],
                        session_id=arguments["session_id"]
                    )
                elif tool_name == "get_chat_history":
                    result = await self.get_chat_history(
                        session_id=arguments["session_id"],
                        limit=arguments.get("limit", 50)
                    )
                elif tool_name == "create_session":
                    result = await self.create_session(
                        user_id=arguments["user_id"],
                        session_name=arguments.get("session_name")
                    )
                elif tool_name == "search_messages":
                    result = await self.search_messages(
                        query=arguments["query"],
                        session_id=arguments.get("session_id"),
                        limit=arguments.get("limit", 10)
                    )
                elif tool_name == "get_user_preferences":
                    result = await self.get_user_preferences(
                        user_id=arguments["user_id"]
                    )
                else:
                    raise ValueError(f"Unknown tool: {tool_name}")
                
                return CallToolResult(
                    content=[
                        TextContent(
                            type="text",
                            text=json.dumps(result, default=str, indent=2)
                        )
                    ]
                )
            except Exception as e:
                logger.error(f"Error executing tool {tool_name}: {e}")
                return CallToolResult(
                    content=[
                        TextContent(
                            type="text",
                            text=f"Error: {str(e)}"
                        )
                    ],
                    isError=True
                )
    
    async def send_message(self, content: str, user_id: str, session_id: str) -> Dict[str, Any]:
        """Send a message to the chat"""
        message = ChatMessage(
            id=f"msg_{datetime.now().timestamp()}",
            content=content,
            timestamp=datetime.now(),
            user_id=user_id,
            session_id=session_id
        )
        
        if session_id not in self.chat_history:
            self.chat_history[session_id] = []
        
        self.chat_history[session_id].append(message)
        
        return {
            "message_id": message.id,
            "status": "sent",
            "timestamp": message.timestamp.isoformat()
        }
    
    async def get_chat_history(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get chat history for a session"""
        if session_id not in self.chat_history:
            return []
        
        messages = self.chat_history[session_id][-limit:]
        return [
            {
                "id": msg.id,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "user_id": msg.user_id,
                "session_id": msg.session_id
            }
            for msg in messages
        ]
    
    async def create_session(self, user_id: str, session_name: Optional[str] = None) -> Dict[str, Any]:
        """Create a new chat session"""
        session_id = f"session_{datetime.now().timestamp()}"
        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "session_name": session_name or f"Chat Session {len(self.user_sessions) + 1}",
            "created_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat()
        }
        
        self.user_sessions[session_id] = session_data
        self.chat_history[session_id] = []
        
        return session_data
    
    async def search_messages(self, query: str, session_id: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Search through chat messages"""
        results = []
        search_sessions = [session_id] if session_id else list(self.chat_history.keys())
        
        for sid in search_sessions:
            if sid not in self.chat_history:
                continue
                
            for msg in self.chat_history[sid]:
                if query.lower() in msg.content.lower():
                    results.append({
                        "id": msg.id,
                        "content": msg.content,
                        "timestamp": msg.timestamp.isoformat(),
                        "user_id": msg.user_id,
                        "session_id": msg.session_id
                    })
                    
                    if len(results) >= limit:
                        break
            
            if len(results) >= limit:
                break
        
        return results
    
    async def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user preferences and settings"""
        # This would typically fetch from a database
        return {
            "user_id": user_id,
            "theme": "light",
            "language": "en",
            "notifications": True,
            "auto_save": True,
            "message_history_limit": 1000
        }
    
    async def run(self, host: str = "localhost", port: int = 8000):
        """Run the MCP server"""
        logger.info(f"Starting MCP Chatbot Server on {host}:{port}")
        await self.server.run(host=host, port=port)

def main():
    """Main entry point"""
    server = MCPChatbotServer()
    asyncio.run(server.run())

if __name__ == "__main__":
    main()