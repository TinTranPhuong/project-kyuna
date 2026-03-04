import json
import logging
import time
from typing import List, Dict, Optional, Any, Union
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.model_manager import model_manager
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════
#  TERMINAL VISUALIZATION HELPERS
# ══════════════════════════════════════════════════════════════════════════
W = 66
def sep(c="="): print(c * W)
def header(t):  sep(); print(f"  {t}"); sep()
def row(l, v):  print(f"  {l:<34} {v}")

def print_generation_stats(stats: dict):
    print("\n")
    header("Performance Report")
    row("Model:",               f"{stats['model']}")
    row("Prompt tokens:",       f"~{stats['n_prompt']} (est)")
    row("Generated tokens:",    f"{stats['n_gen']}")
    sep("-")
    row("Time to first token:", f"{stats['ttft_ms']:.1f} ms")
    row("Generation time:",     f"{stats['gen_time_s']:.2f} s")
    row("Total time:",          f"{stats['total_time_s']:.2f} s")
    sep("-")
    row("Tokens / second:",     f"{stats['tps']:.2f} tok/s")
    row("ms / token:",          f"{stats['mpt']:.2f} ms/tok")
    
    # Check Hardware Stats
    if model_manager._model:
        try:
            llm = model_manager._model
            vram_mb = model_manager.get_vram_usage()
            if vram_mb:
                sep("-")
                row("VRAM Usage:", f"{vram_mb} MB")

            # Layer Split Check
            total_layers = 0
            if hasattr(llm, "metadata") and llm.metadata:
                for key in ["general.block_count", "llm.layer_count"]:
                    if key in llm.metadata:
                        total_layers = int(llm.metadata[key])
                        break
            
            if total_layers > 0:
                n_gpu = llm.n_gpu_layers
                n_gpu_visual = min(n_gpu, total_layers)
                n_ram = max(0, total_layers - n_gpu)
                status = "(ALL GPU - FAST)" if n_ram == 0 else "(SPLIT - SLOWER)"
                row("Layers on GPU:", f"{n_gpu_visual} / {total_layers}  {status}")
        except Exception:
            pass
    sep()
    print("\n")

# ══════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════════════════════════════════════
class ChatCompletionRequest(BaseModel):
    model: Optional[str] = None
    messages: List[Dict[str, Any]]
    stream: bool = True
    
    # ✅ FIX: Change default from 2048 to None
    # This allows the .env setting (32768) to take over below.
    max_tokens: Optional[int] = None 
    
    temperature: Optional[float] = None  # None = read from .env TEMPERATURE
    top_p: Optional[float] = None          # None = read from .env TOP_P
    stop: Optional[Union[str, List[str]]] = None

@router.post("/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """
    OpenAI-compatible chat completion endpoint.
    Dynamically loads the requested model from the filesystem.
    """
    
    # ── 1. Determine Target Model ────────────────────────────────────────────
    target_model = request.model or getattr(settings, "CHAT_MODEL", None) or settings.DEFAULT_MODEL

    if not target_model:
        raise HTTPException(503, "No model specified and no default configured.")

    # ── 2. Resolve Max Tokens (THE FIX) ──────────────────────────────────────
    # Priority: 
    # 1. Request (if frontend sends specific limit)
    # 2. .env MAX_TOKENS (e.g., 32768)
    # 3. Hard Fallback (2048) if nothing else is found
    # settings now loads from .env via absolute path in config.py
    final_max_tokens   = request.max_tokens   if request.max_tokens   is not None else settings.MAX_TOKENS
    final_temperature  = request.temperature  if request.temperature  is not None else settings.TEMPERATURE
    final_top_p        = request.top_p        if request.top_p        is not None else settings.TOP_P

    # ── 3. Validation ────────────────────────────────────────────────────────
    model_path = Path(settings.MODELS_DIR) / target_model
    if not model_path.exists():
        raise HTTPException(status_code=404, detail=f"Model '{target_model}' not found.")

    # ── 4. Lazy Load (The VRAM Swap) ─────────────────────────────────────────
    if model_manager.current_model_name != target_model:
        print(f"\n[System] Switching model to: '{target_model}'...")
        try:
            await model_manager.load_model(target_model)
        except Exception as e:
            logger.error(f"Failed to load model {target_model}: {e}")
            raise HTTPException(500, f"Failed to load model: {str(e)}")

    # ── 5. Prepare Stop Sequences ────────────────────────────────────────────
    stop_sequences = []
    if request.stop:
        stop_sequences = [request.stop] if isinstance(request.stop, str) else request.stop

    # ── 6. Streaming Response ────────────────────────────────────────────────
    if request.stream:
        async def event_generator():
            t0 = time.perf_counter()
            first_token_time = None
            n_gen = 0
            
            prompt_text = " ".join([m.get("content", "") for m in request.messages])
            n_prompt_est = len(prompt_text) // 3

            # Console Header
            print("\n")
            header(f"Generating ({target_model})")
            row("Max tokens:", final_max_tokens)  # <--- Should now show 32768
            row("Temp / Top-P:", f"{final_temperature} / {final_top_p}")
            sep("-")
            print("Output:", end=" ", flush=True)

            try:
                async for token in model_manager.generate_stream(
                    messages=request.messages,
                    max_tokens=final_max_tokens, # <--- Passing 32768 to llama_cpp
                    temperature=final_temperature,
                    top_p=final_top_p,
                    stop=stop_sequences,
                ):
                    now = time.perf_counter()
                    if first_token_time is None: first_token_time = now
                    n_gen += 1
                    
                    print(token, end="", flush=True)

                    chunk_data = {
                        "id": f"chatcmpl-{int(time.time())}",
                        "object": "chat.completion.chunk",
                        "created": int(time.time()),
                        "model": target_model,
                        "choices": [{"index": 0, "delta": {"content": token}, "finish_reason": None}]
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                
                # Stats calculation
                t_end = time.perf_counter()
                ttft = (first_token_time - t0) if first_token_time else 0
                gen_time = (t_end - first_token_time) if first_token_time else 0
                total_time = t_end - t0
                tps = n_gen / gen_time if gen_time > 0 else 0
                mpt = (gen_time / n_gen * 1000) if n_gen > 0 else 0

                stats = {
                    "model": target_model,
                    "n_prompt": n_prompt_est,
                    "n_gen": n_gen,
                    "ttft_ms": ttft * 1000,
                    "gen_time_s": gen_time,
                    "total_time_s": total_time,
                    "tps": tps,
                    "mpt": mpt
                }
                
                print_generation_stats(stats)
                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    # ── 7. Non-Streaming Fallback ────────────────────────────────────────────
    else:
        full_content = ""
        async for token in model_manager.generate_stream(
            messages=request.messages,
            max_tokens=final_max_tokens,
            temperature=final_temperature,
            top_p=final_top_p,
            stop=stop_sequences,
        ):
            full_content += token
        
        return {
            "id": f"chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": target_model,
            "choices": [{"index": 0, "message": {"role": "assistant", "content": full_content}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        }