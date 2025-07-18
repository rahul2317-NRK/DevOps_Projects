#!/usr/bin/env python3
"""
MCP Client Implementation for Chatbot
Handles communication with MCP servers and provides a high-level interface
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass
from datetime import datetime

# MCP SDK imports (would be from actual MCP SDK)
from mcp import Client, ClientSession, StdioServerParameters
from mcp.client.models import InitializeResult
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
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MCPServerConfig:
    """Configuration for MCP server connection"""
    name: str
    command: str
    args: List[str]
    env: Optional[Dict[str, str]] = None

class MCPChatbotClient:
    """MCP Client for Chatbot application"""
    
    def __init__(self, server_configs: List[MCPServerConfig]):
        self.server_configs = server_configs
        self.clients: Dict[str, Client] = {}
        self.sessions: Dict[str, ClientSession] = {}
        self.available_tools: Dict[str, List[Dict[str, Any]]] = {}
        self.available_resources: Dict[str, List[Dict[str, Any]]] = {}
    
    async def initialize(self):
        """Initialize connections to all MCP servers"""
        logger.info("Initializing MCP client connections...")
        
        for config in self.server_configs:
            try:
                # Create client for this server
                client = Client(
                    StdioServerParameters(
                        command=config.command,
                        args=config.args,
                        env=config.env or {}
                    )
                )
                
                # Start session
                session = await client.start_session()
                
                # Initialize the session
                await session.initialize()
                
                # Store client and session
                self.clients[config.name] = client
                self.sessions[config.name] = session
                
                # Discover available tools and resources
                await self._discover_capabilities(config.name)
                
                logger.info(f"Connected to MCP server: {config.name}")
                
            except Exception as e:
                logger.error(f"Failed to connect to MCP server {config.name}: {e}")
                continue
    
    async def _discover_capabilities(self, server_name: str):
        """Discover tools and resources available on a server"""
        session = self.sessions.get(server_name)
        if not session:
            return
        
        try:
            # List available tools
            tools_result = await session.list_tools()
            self.available_tools[server_name] = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema
                }
                for tool in tools_result.tools
            ]
            
            # List available resources
            resources_result = await session.list_resources()
            self.available_resources[server_name] = [
                {
                    "uri": resource.uri,
                    "name": resource.name,
                    "description": resource.description,
                    "mime_type": resource.mimeType
                }
                for resource in resources_result.resources
            ]
            
            logger.info(f"Discovered {len(self.available_tools[server_name])} tools and "
                       f"{len(self.available_resources[server_name])} resources on {server_name}")
            
        except Exception as e:
            logger.error(f"Failed to discover capabilities for {server_name}: {e}")
    
    async def call_tool(self, server_name: str, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool on a specific MCP server"""
        session = self.sessions.get(server_name)
        if not session:
            raise ValueError(f"No session found for server: {server_name}")
        
        try:
            result = await session.call_tool(
                CallToolRequest(name=tool_name, arguments=arguments)
            )
            
            # Extract text content from result
            if result.content and len(result.content) > 0:
                content = result.content[0]
                if isinstance(content, TextContent):
                    return json.loads(content.text)
            
            return {"error": "No content returned from tool"}
            
        except Exception as e:
            logger.error(f"Error calling tool {tool_name} on {server_name}: {e}")
            return {"error": str(e)}
    
    async def get_resource(self, server_name: str, resource_uri: str) -> Dict[str, Any]:
        """Get a resource from a specific MCP server"""
        session = self.sessions.get(server_name)
        if not session:
            raise ValueError(f"No session found for server: {server_name}")
        
        try:
            result = await session.get_resource(
                GetResourceRequest(uri=resource_uri)
            )
            
            # Extract content from result
            if result.contents and len(result.contents) > 0:
                content = result.contents[0]
                if isinstance(content, TextContent):
                    return json.loads(content.text)
            
            return {"error": "No content returned from resource"}
            
        except Exception as e:
            logger.error(f"Error getting resource {resource_uri} from {server_name}: {e}")
            return {"error": str(e)}
    
    async def send_message(self, content: str, user_id: str, session_id: str) -> Dict[str, Any]:
        """Send a message using the chatbot MCP server"""
        return await self.call_tool(
            server_name="chatbot-server",
            tool_name="send_message",
            arguments={
                "content": content,
                "user_id": user_id,
                "session_id": session_id
            }
        )
    
    async def get_chat_history(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get chat history for a session"""
        result = await self.call_tool(
            server_name="chatbot-server",
            tool_name="get_chat_history",
            arguments={
                "session_id": session_id,
                "limit": limit
            }
        )
        
        if isinstance(result, list):
            return result
        elif isinstance(result, dict) and "error" in result:
            logger.error(f"Error getting chat history: {result['error']}")
            return []
        else:
            return []
    
    async def create_session(self, user_id: str, session_name: Optional[str] = None) -> Dict[str, Any]:
        """Create a new chat session"""
        return await self.call_tool(
            server_name="chatbot-server",
            tool_name="create_session",
            arguments={
                "user_id": user_id,
                "session_name": session_name
            }
        )
    
    async def search_messages(self, query: str, session_id: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Search through chat messages"""
        arguments = {
            "query": query,
            "limit": limit
        }
        if session_id:
            arguments["session_id"] = session_id
        
        result = await self.call_tool(
            server_name="chatbot-server",
            tool_name="search_messages",
            arguments=arguments
        )
        
        if isinstance(result, list):
            return result
        elif isinstance(result, dict) and "error" in result:
            logger.error(f"Error searching messages: {result['error']}")
            return []
        else:
            return []
    
    async def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user preferences and settings"""
        return await self.call_tool(
            server_name="chatbot-server",
            tool_name="get_user_preferences",
            arguments={"user_id": user_id}
        )
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get system status from the chatbot server"""
        return await self.get_resource(
            server_name="chatbot-server",
            resource_uri="chatbot://system-status"
        )
    
    def get_available_tools(self, server_name: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Get available tools, optionally filtered by server"""
        if server_name:
            return {server_name: self.available_tools.get(server_name, [])}
        return self.available_tools
    
    def get_available_resources(self, server_name: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Get available resources, optionally filtered by server"""
        if server_name:
            return {server_name: self.available_resources.get(server_name, [])}
        return self.available_resources
    
    async def close(self):
        """Close all MCP client connections"""
        logger.info("Closing MCP client connections...")
        
        for server_name, client in self.clients.items():
            try:
                await client.close()
                logger.info(f"Closed connection to {server_name}")
            except Exception as e:
                logger.error(f"Error closing connection to {server_name}: {e}")
        
        self.clients.clear()
        self.sessions.clear()
        self.available_tools.clear()
        self.available_resources.clear()

class ChatbotMCPInterface:
    """High-level interface for chatbot MCP operations"""
    
    def __init__(self, client: MCPChatbotClient):
        self.client = client
        self.current_session_id: Optional[str] = None
        self.current_user_id: Optional[str] = None
    
    async def start_chat_session(self, user_id: str, session_name: Optional[str] = None) -> str:
        """Start a new chat session"""
        session_data = await self.client.create_session(user_id, session_name)
        
        if "session_id" in session_data:
            self.current_session_id = session_data["session_id"]
            self.current_user_id = user_id
            return session_data["session_id"]
        else:
            raise ValueError("Failed to create chat session")
    
    async def send_message(self, content: str) -> Dict[str, Any]:
        """Send a message in the current session"""
        if not self.current_session_id or not self.current_user_id:
            raise ValueError("No active chat session")
        
        return await self.client.send_message(
            content=content,
            user_id=self.current_user_id,
            session_id=self.current_session_id
        )
    
    async def get_recent_messages(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent messages from the current session"""
        if not self.current_session_id:
            raise ValueError("No active chat session")
        
        return await self.client.get_chat_history(
            session_id=self.current_session_id,
            limit=limit
        )
    
    async def search_conversation(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search in the current conversation"""
        return await self.client.search_messages(
            query=query,
            session_id=self.current_session_id,
            limit=limit
        )
    
    async def get_user_settings(self) -> Dict[str, Any]:
        """Get settings for the current user"""
        if not self.current_user_id:
            raise ValueError("No active user")
        
        return await self.client.get_user_preferences(self.current_user_id)

def create_default_client() -> MCPChatbotClient:
    """Create a default MCP client with standard server configuration"""
    server_configs = [
        MCPServerConfig(
            name="chatbot-server",
            command="python",
            args=["-m", "mcp_chatbot.server"],
            env={"PYTHONPATH": "."}
        )
    ]
    
    return MCPChatbotClient(server_configs)

async def main():
    """Example usage of the MCP client"""
    client = create_default_client()
    
    try:
        # Initialize client
        await client.initialize()
        
        # Create chatbot interface
        chatbot = ChatbotMCPInterface(client)
        
        # Start a chat session
        session_id = await chatbot.start_chat_session("user123", "Test Session")
        print(f"Started chat session: {session_id}")
        
        # Send a message
        result = await chatbot.send_message("Hello, this is a test message!")
        print(f"Message sent: {result}")
        
        # Get recent messages
        messages = await chatbot.get_recent_messages(5)
        print(f"Recent messages: {messages}")
        
        # Get system status
        status = await client.get_system_status()
        print(f"System status: {status}")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(main())