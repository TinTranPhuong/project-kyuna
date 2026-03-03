import json
from typing import List, Dict, Optional, Any
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.model_manager import model_manager
from app.core.config import settings

router = APIRouter()

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Dict[str, Any]]
    stream: bool = True
    max_tokens: int = 2048
    temperature: float = 0.7
    top_p: float = 0.95
    stop: Optional[List[str]] = None

async def ensure_text_model_loaded(requested_model: str):
    """Helper to lazy-load the text model if it isn't running or if a swap is needed."""
    model_to_load = requested_model if requested_model else settings.DEFAULT_MODEL
    
    if not model_to_load:
        raise HTTPException(
            status_code=503, 
            detail="No text model specified in request and no DEFAULT_MODEL configured in .env"
        )
        
    if model_manager.current_model_name != model_to_load:
        print(f"Lazy-loading text model: {model_to_load}...")
        await model_manager.load_model(model_to_load)


@router.post("/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """
    OpenAI-compatible chat completion endpoint.
    Automatically handles VRAM model swapping via the Hangoff Protocol.
    """
    # 1. Lazy load text model if needed
    await ensure_text_model_loaded(request.model)

    if request.stream:
        async def event_generator():
            try:
                async for token in model_manager.generate_stream(
                    messages=request.messages,
                    max_tokens=request.max_tokens,
                    temperature=request.temperature,
                    top_p=request.top_p,
                    stop=request.stop,
                ):
                    # OpenAI SSE format
                    chunk = {"choices": [{"delta": {"content": token}}]}
                    yield f"data: {json.dumps(chunk)}\n\n"
            except Exception as e:
                error_chunk = {"error": str(e)}
                yield f"data: {json.dumps(error_chunk)}\n\n"
            finally:
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",  # disable Nginx buffering for SSE
            }
        )
    else:
        # Non-streaming mode: accumulate all tokens before returning
        full_text = ""
        async for token in model_manager.generate_stream(
            messages=request.messages,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            stop=request.stop,
        ):
            full_text += token

        return {
            "id": "chatcmpl-local",
            "object": "chat.completion",
            "model": request.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": full_text
                    },
                    "finish_reason": "stop"
                }
            ]
        }