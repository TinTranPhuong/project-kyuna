import json
from typing import AsyncGenerator
import httpx

from app.core.config import settings

class AIServerError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


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

    async def translate_image_vision_stream(
        self, 
        image_base64: str, 
        source_language: str, 
        target_language: str
    ) -> AsyncGenerator[str | dict, None]:
        
        payload = {
            "image": image_base64,
            "source_language": source_language,
            "target_language": target_language
        }
        
        # Set timeout to None to completely disable connection dropping
        timeout_config = httpx.Timeout(None) 
        ai_url = "http://127.0.0.1:8001/v1/translate/image/stream"

        async with httpx.AsyncClient(timeout=timeout_config) as client:
            try:
                async with client.stream("POST", ai_url, json=payload) as response:
                    response.raise_for_status()
                    
                    # Use aiter_lines() to prevent SSE chunk fragmentation!
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str:
                                yield data_str
                                
            except Exception as e:
                yield {"error": f"AI Client connection error: {str(e)}", "done": True}

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

    async def ocr_pipeline(self, image_base64: str) -> list[dict]:
        """
        POST /v1/translate/ocr-pipeline
        Executes Stages 1, 2, and 3 on the AI server in one shot.
        Returns: [{"bbox": [x1,y1,x2,y2], "japanese": "text"}, ...]
        Raises AIServerError on failure.
        """
        try:
            response = await self.client.post(
                "/v1/translate/ocr-pipeline",
                json={"image": image_base64},
                timeout=120.0,
            )
            response.raise_for_status()
            return response.json()["regions"]
        except httpx.ConnectError as e:
            raise AIServerError(503, f"AI server unreachable: {e}") from e
        except httpx.HTTPStatusError as e:
            raise AIServerError(e.response.status_code, str(e)) from e


    async def translate_batch(self, regions: list[dict]) -> list[dict]:
        """
        POST /v1/translate/batch
        Triggers Hangoff Protocol on AI server side and translates.
        Returns regions with "english" field populated.
        """
        try:
            response = await self.client.post(
                "/v1/translate/batch",
                json={"regions": regions},
                timeout=600.0,   # 35B model may need time for first load + inference
            )
            response.raise_for_status()
            return response.json()["regions"]
        except httpx.ConnectError as e:
            raise AIServerError(503, f"AI server unreachable: {e}") from e
        except httpx.HTTPStatusError as e:
            raise AIServerError(e.response.status_code, str(e)) from e

# Singleton instance — import this in services
ai_client = AIServerClient()