import pytest
import httpx
import json
import asyncio
from typing import AsyncGenerator

# Configuration - update these if your local AI server ports differ
BASE_URL = "http://localhost:8000/api/v1"
TEST_USER = {"username": "test_dev", "email": "dev@luna.local", "password": "password123"}

@pytest.fixture
async def auth_token():
    """Simulates the useAuthStore logic by logging in and retrieving a token."""
    async with httpx.AsyncClient() as client:
        # 1. Register/Login to get tokens
        response = await client.post(f"{BASE_URL}/auth/login", data=TEST_USER)
        if response.status_code != 200:
            # Fallback to registration if test user doesn't exist
            await client.post(f"{BASE_URL}/auth/register", json=TEST_USER)
            response = await client.post(f"{BASE_URL}/auth/login", data=TEST_USER)
        
        return response.json()["access_token"]

@pytest.mark.asyncio
async def test_chat_creation_flow(auth_token):
    """Tests the logic inside ConversationList.tsx and chatStore.ts"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    async with httpx.AsyncClient(base_url=BASE_URL, headers=headers) as client:
        # Create a new conversation
        create_res = await client.post("/chat/conversations")
        assert create_res.status_code == 200
        conv_id = create_res.json()["id"]
        
        # Verify it appears in the list (Testing ConversationList data)
        list_res = await client.get("/chat/conversations")
        assert any(c["id"] == conv_id for c in list_res.json())

@pytest.mark.asyncio
async def test_llm_streaming_response(auth_token):
    """
    Tests the logic inside useStreamResponse.ts.
    Verifies the SSE format (data: {"token": "..."}) used by your ChatWindow.
    """
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "content": "Hello, Luna! Respond with a short test message.",
        "model": "qwen-2.5-14b-gguf"  # Matches your default in chatStore.ts
    }
    
    async with httpx.AsyncClient(base_url=BASE_URL, headers=headers, timeout=30.0) as client:
        # Create a conv first
        conv = (await client.post("/chat/conversations")).json()
        
        # Test the streaming endpoint
        async with client.stream("POST", f"/chat/conversations/{conv['id']}/messages", json=payload) as response:
            assert response.status_code == 200
            
            tokens_received = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:].strip()
                    if data == "[DONE]":
                        break
                    
                    parsed = json.loads(data)
                    tokens_received.append(parsed.get("token", ""))
            
            # Verify we actually got text back from your local model
            assert len(tokens_received) > 0
            print(f"\n[LLM Stream Output]: {''.join(tokens_received)}")

@pytest.mark.asyncio
async def test_model_inventory(auth_token):
    """Tests the data source for ModelSelector.tsx"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    async with httpx.AsyncClient(base_url=BASE_URL, headers=headers) as client:
        response = await client.get("/chat/models")
        assert response.status_code == 200
        models = response.json()
        
        # Check for essential metadata you used in the UI
        for model in models:
            assert "name" in model
            assert "size" in model  # Important for your 16GB VRAM management