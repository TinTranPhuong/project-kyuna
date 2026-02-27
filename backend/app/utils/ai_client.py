import json
from typing import AsyncGenerator

import httpx

from app.core.config import settings


class AIServerClient:
    """Singleton async HTTP client for communicating with the AI inference server."""
    
    def __init__(self):
        self.base_url = settings.AI_SERVER_URL
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        if not self._client:
            self._client = httpx.AsyncClient(base_url=self.base_url, timeout=300.0)
        return self._client

    async def chat_stream(
        self,
        messages: list[dict],
        model: str,
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """
        POST /v1/chat/completions with stream=True.
        Parse SSE response and yield each token string.
        """
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        async with self.client.stream("POST", "/v1/chat/completions", json=payload) as response:
            response.raise_for_status()
            
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:].strip()
                    
                    if data == "[DONE]":
                        return
                    
                    if not data:
                        continue
                        
                    try:
                        parsed = json.loads(data)
                        choices = parsed.get("choices", [])
                        if choices:
                            token = choices[0].get("delta", {}).get("content", "")
                            if token:
                                yield token
                    except json.JSONDecodeError:
                        continue

    async def translate_image(
        self,
        image_base64: str,
        source_language: str,
        target_language: str,
    ) -> dict:
        """POST /v1/translate/image. Returns {translated_text, bounding_boxes, original_text}."""
        response = await self.client.post("/v1/translate/image", json={
            "image": image_base64,
            "source_language": source_language,
            "target_language": target_language,
        })
        response.raise_for_status()
        return response.json()

    async def list_models(self) -> list[dict]:
        """GET /v1/models. Returns list of available model info."""
        response = await self.client.get("/v1/models")
        response.raise_for_status()
        return response.json().get("data", [])

    async def health_check(self) -> bool:
        """Returns True if AI server is healthy and model is loaded."""
        try:
            response = await self.client.get("/v1/health", timeout=5.0)
            return response.json().get("model_loaded", False)
        except Exception:
            return False


# Singleton instance — import this in services
ai_client = AIServerClient()