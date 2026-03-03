import gc
import asyncio
import ctypes
import queue
import concurrent.futures
import os
from pathlib import Path
from typing import AsyncGenerator

from llama_cpp import Llama
from app.core.config import settings
from llama_cpp.llama_chat_format import Qwen3VLChatHandler

# ══════════════════════════════════════════════════════════════════════════
#  .env Parsers (From your test.py)
# ══════════════════════════════════════════════════════════════════════════
def _b(k, d="false"): return os.environ.get(k, str(d)).strip().lower() in ("true", "1", "yes")
def _i(k, d):
    try:    return int(os.environ.get(k, str(d)))
    except: return int(d)
def _f(k, d):
    try:    return float(os.environ.get(k, str(d)))
    except: return float(d)


# Dedicated thread for all Llama/CUDA operations to prevent VRAM fragmentation
_LLAMA_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
    max_workers=1,
    thread_name_prefix="llama_cuda_worker"
)

def _windows_force_vram_release():
    """Aggressively purges residual memory allocations on Windows."""
    try:
        nvcuda = ctypes.WinDLL("nvcuda.dll")
        nvcuda.cuCtxSynchronize()
    except Exception:
        pass

    try:
        handle = ctypes.windll.kernel32.GetCurrentProcess()
        ctypes.windll.psapi.EmptyWorkingSet(handle)
    except Exception:
        pass

    gc.collect()
    gc.collect()

class ModelManager:
    """Thread-safe singleton managing GGUF model lifecycles with strict VRAM Hangoff Protocol."""
    
    def __init__(self):
        # --- Text Model Slot ---
        self._model: Llama | None = None
        self._current_model_name: str | None = None
        self._lock = asyncio.Lock()
        
        # --- Vision Model Slot ---
        self._vision_model: Llama | None = None
        self._vision_model_name: str | None = None
        self._vision_lock = asyncio.Lock()
        
        # Shared concurrency limiter
        self._request_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_REQUESTS)

    # ==========================================
    # TEXT MODEL MANAGEMENT
    # ==========================================
    def is_model_loaded(self) -> bool:
        return self._model is not None

    @property
    def is_translation_model_loaded(self) -> bool:
        """
        True if the currently-loaded model is the configured TRANSLATION_MODEL.
        Used by /translate/batch endpoint to skip unnecessary reload.
        """
        return (
            self._model is not None
            and self._current_model_name == getattr(settings, "TRANSLATION_MODEL", None)
        )

    @property
    def current_model_name(self) -> str | None:
        return self._current_model_name

    def _unload_sync(self):
        """Synchronous teardown executed on the CUDA thread."""
        if self._model is not None:
            self._model.close()
            del self._model
            self._model = None
            self._current_model_name = None
            _windows_force_vram_release()

    def unload(self):
        """Public method to trigger the unload sequence."""
        if self._model is not None:
            future = _LLAMA_EXECUTOR.submit(self._unload_sync)
            future.result(timeout=60)

    def _load_sync(self, model_path: str, model_name: str):
        """Synchronous model load executed on the CUDA thread using pure .env config."""
        self._model = Llama(
            model_path   = model_path,
            n_gpu_layers = _i("N_GPU_LAYERS", -1),
            n_ctx        = _i("N_CTX", 32768),
            n_threads    = _i("N_THREADS", 8),
            n_batch      = _i("N_BATCH", 512),
            n_ubatch     = _i("N_UBATCH", 512),
            type_k       = _i("KV_TYPE_K", 2),
            type_v       = _i("KV_TYPE_V", 2),
            flash_attn   = _b("FLASH_ATTN", "true"),
            use_mmap     = _b("USE_MMAP", "true"),
            use_mlock    = _b("USE_MLOCK", "false"),
            verbose      = _b("VERBOSE", "false"),
        )
        self._current_model_name = model_name

    async def load_model(self, model_name: str) -> None:
        """Asynchronously load a GGUF text model, executing the Hangoff Protocol if swapping."""
        async with self._lock:
            if self._current_model_name == model_name and self._model is not None:
                return
            
            if self._vision_model is not None:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(_LLAMA_EXECUTOR, self._unload_vision_sync)
            
            if self._model is not None:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(_LLAMA_EXECUTOR, self._unload_sync)
            
            model_path = Path(settings.MODELS_DIR) / model_name
            if not model_path.exists():
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                _LLAMA_EXECUTOR, 
                self._load_sync, 
                str(model_path), 
                model_name
            )

    # ==========================================
    # VISION MODEL MANAGEMENT
    # ==========================================
    @property
    def is_vision_model_loaded(self) -> bool:
        return self._vision_model is not None

    @property
    def current_vision_model_name(self) -> str | None:
        return self._vision_model_name

    def _unload_vision_sync(self):
        """Synchronous teardown executed on the CUDA thread for the vision model."""
        if self._vision_model is not None:
            chat_handler = getattr(self._vision_model, "chat_handler", None)
            if chat_handler is not None:
                exit_stack = getattr(chat_handler, "_exit_stack", None)
                if exit_stack is not None:
                    try:
                        exit_stack.close()
                    except Exception:
                        pass
                try:
                    self._vision_model.chat_handler = None
                except Exception:
                    pass

            self._vision_model.close()
            del self._vision_model
            self._vision_model = None
            self._vision_model_name = None
            _windows_force_vram_release()

    def _load_vision_sync(self, model_path: str, model_name: str, mmproj_path: str):
        """Synchronous vision model load executed on the CUDA thread using safe defaults."""
        chat_handler = Qwen3VLChatHandler(clip_model_path=mmproj_path)

        self._vision_model = Llama(
            model_path   = model_path,
            chat_handler = chat_handler,
            n_gpu_layers = _i("N_GPU_LAYERS", -1),
            n_ctx        = 4096,   # Safe default, llama.cpp auto-scales this for images
            n_threads    = _i("N_THREADS", 8),
            flash_attn   = False,  # MAGIC FIX: Restores exact bounding box coordinates!
            verbose      = True,   # Turn on so we can see the C++ startup logs
        )
        self._vision_model_name = model_name

    async def load_vision_model(self, model_name: str) -> None:
        """Asynchronously load a GGUF vision model."""
        async with self._vision_lock:
            if self._vision_model_name == model_name and self._vision_model is not None:
                return 
            
            if self._model is not None:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(_LLAMA_EXECUTOR, self._unload_sync)

            if self._vision_model is not None:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(_LLAMA_EXECUTOR, self._unload_vision_sync)

            model_path = Path(settings.MODELS_DIR) / model_name
            mmproj_filename = getattr(settings, 'MMPROJ_FILE', None)
            if mmproj_filename:
                mmproj_path = Path(settings.MODELS_DIR) / mmproj_filename
            else:
                mmproj_path = next(Path(settings.MODELS_DIR).glob("mmproj-*.gguf"), None)

            if not model_path.exists():
                raise FileNotFoundError(f"Vision model not found: {model_path}")
            if not mmproj_path or not mmproj_path.exists():
                raise FileNotFoundError(f"MMPROJ file not found: {mmproj_path}")

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                _LLAMA_EXECUTOR, 
                self._load_vision_sync, 
                str(model_path), 
                model_name,
                str(mmproj_path)
            )

    # ==========================================
    # GENERATION & INFERENCE
    # ==========================================
    def list_models(self) -> list[str]:
        models_dir = Path(settings.MODELS_DIR)
        if not models_dir.exists():
            return []
        return [f.name for f in models_dir.glob("*.gguf") if f.is_file()]

    # ... inside ModelManager class ...

    async def generate_stream(
        self,
        messages: list[dict],
        max_tokens: int | None = None,
        temperature: float | None = None,
        top_p: float | None = None,
        # NEW: Allow overriding these parameters dynamically
        top_k: int | None = None,
        min_p: float | None = None,
        repeat_penalty: float | None = None,
        stop: list[str] | None = None,
    ) -> AsyncGenerator[str, None]:
        if self._model is None:
            raise RuntimeError("No text model loaded. Call load_model() first.")
            
        # Prioritize passed args, fallback to .env 
        max_tokens = max_tokens if max_tokens is not None else _i("MAX_TOKENS", 2048)
        temperature = temperature if temperature is not None else _f("TEMPERATURE", 0.7)
        top_p = top_p if top_p is not None else _f("TOP_P", 0.9)
        
        # UPDATED: Check argument first, then .env, then default
        top_k = top_k if top_k is not None else _i("TOP_K", 40)
        min_p = min_p if min_p is not None else _f("MIN_P", 0.05)
        repeat_penalty = repeat_penalty if repeat_penalty is not None else _f("REPEAT_PENALTY", 1.1)

        async with self._request_semaphore:
            token_queue: queue.Queue = queue.Queue()
            _DONE = object()
            llm_ref = self._model
            
            def _inference():
                try:
                    response = llm_ref.create_chat_completion(
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        top_p=top_p,
                        top_k=top_k,
                        min_p=min_p,         # Pass min_p to llama.cpp
                        repeat_penalty=repeat_penalty,
                        stop=stop or [],
                        stream=True,
                    )
                    for chunk in response:
                        if isinstance(chunk, dict):
                            choices = chunk.get("choices", [])
                            if choices:
                                content = choices[0].get("delta", {}).get("content", "")
                                if content:
                                    token_queue.put(content)
                except Exception as e:
                    token_queue.put(RuntimeError(f"Inference error: {e}"))
                finally:
                    token_queue.put(_DONE)

            _LLAMA_EXECUTOR.submit(_inference)
            
            while True:
                try:
                    item = token_queue.get_nowait()
                except queue.Empty:
                    await asyncio.sleep(0.005)
                    continue
                    
                if item is _DONE:
                    break
                if isinstance(item, Exception):
                    raise item
                yield item

    async def generate_vision_stream(
        self,
        messages: list[dict],
        max_tokens: int | None = None,
        temperature: float | None = None,
        top_p: float | None = None,
        stop: list[str] | None = None,
    ) -> AsyncGenerator[str, None]:
        if self._vision_model is None:
            raise RuntimeError("No vision model loaded. Call load_vision_model() first.")
            
        # Prioritize passed args, fallback to .env
        max_tokens = max_tokens if max_tokens is not None else _i("MAX_TOKENS", 2048)
        temperature = temperature if temperature is not None else _f("TEMPERATURE", 0.7)
        top_p = top_p if top_p is not None else _f("TOP_P", 0.9)
        top_k = _i("TOP_K", 40)
        repeat_penalty = _f("REPEAT_PENALTY", 1.1)

        async with self._request_semaphore:
            token_queue: queue.Queue = queue.Queue()
            _DONE = object()
            llm_ref = self._vision_model 
            
            def _inference():
                try:
                    response = llm_ref.create_chat_completion(
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        top_p=top_p,
                        top_k=top_k,
                        repeat_penalty=repeat_penalty,
                        stop=stop or [],
                        stream=True,
                    )
                    for chunk in response:
                        if isinstance(chunk, dict):
                            choices = chunk.get("choices", [])
                            if choices:
                                content = choices[0].get("delta", {}).get("content", "")
                                if content:
                                    token_queue.put(content)
                except Exception as e:
                    token_queue.put(RuntimeError(f"Inference error: {e}"))
                finally:
                    token_queue.put(_DONE)

            _LLAMA_EXECUTOR.submit(_inference)
            
            while True:
                try:
                    item = token_queue.get_nowait()
                except queue.Empty:
                    await asyncio.sleep(0.005)
                    continue
                    
                if item is _DONE:
                    break
                if isinstance(item, Exception):
                    raise item
                yield item

    def get_vram_usage(self) -> int | None:
        try:
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            return info.used // (1024 * 1024)
        except ImportError:
            return None

model_manager = ModelManager()