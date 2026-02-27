import gc
import asyncio
import ctypes
import queue
import concurrent.futures
from pathlib import Path
from typing import AsyncGenerator

from llama_cpp import Llama
from app.core.config import settings
from llama_cpp.llama_chat_format import Qwen3VLChatHandler

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
        self._model: Llama | None = None
        self._current_model_name: str | None = None
        self._lock = asyncio.Lock()
        self._request_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_REQUESTS)

    def is_model_loaded(self) -> bool:
        return self._model is not None

    @property
    def current_model_name(self) -> str | None:
        return self._current_model_name

    def _unload_sync(self):
        """Synchronous teardown executed on the CUDA thread."""
        if self._model is not None:
            # Safely dismantle vision encoder before destroying the main LLM object
            chat_handler = getattr(self._model, "chat_handler", None)
            if chat_handler is not None:
                exit_stack = getattr(chat_handler, "_exit_stack", None)
                if exit_stack is not None:
                    try:
                        exit_stack.close()
                    except Exception:
                        pass
                try:
                    self._model.chat_handler = None
                except Exception:
                    pass

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
        """Synchronous model load executed on the CUDA thread."""
        chat_handler = None
        
        # Inject Vision Projector if it's a Qwen model
        if "qwen" in model_name.lower():
            model_dir = Path(settings.MODELS_DIR)
            # Find the mmproj file in the same directory
            mmproj_path = next(model_dir.glob("mmproj-*.gguf"), None)
            if mmproj_path and mmproj_path.exists():
                print(f"Manager: Loading Qwen Vision Projector -> {mmproj_path.name}")
                chat_handler = Qwen3VLChatHandler(clip_model_path=str(mmproj_path))
            else:
                print("Manager: WARNING - Qwen model detected but no mmproj file found!")

        self._model = Llama(
            model_path=model_path,
            chat_handler=chat_handler,  # Attach the vision handler
            n_gpu_layers=settings.N_GPU_LAYERS,
            n_ctx=settings.N_CTX,
            n_threads=settings.N_THREADS,
            verbose=False,
            #type_k=16, 
            #type_v=16,
            flash_attn=True,
        )
        self._current_model_name = model_name

    async def load_model(self, model_name: str) -> None:
        """Asynchronously load a GGUF model, executing the Hangoff Protocol if swapping."""
        async with self._lock:
            if self._current_model_name == model_name and self._model is not None:
                return
            
            # Execute Hangoff Protocol: Unload existing before loading new
            if self._model is not None:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(_LLAMA_EXECUTOR, self._unload_sync)
            
            model_path = Path(settings.MODELS_DIR) / model_name
            if not model_path.exists():
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            # Load new model on dedicated CUDA thread
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                _LLAMA_EXECUTOR, 
                self._load_sync, 
                str(model_path), 
                model_name
            )

    def list_models(self) -> list[str]:
        models_dir = Path(settings.MODELS_DIR)
        if not models_dir.exists():
            return []
        return [f.name for f in models_dir.glob("*.gguf") if f.is_file()]

    async def generate_stream(
        self,
        messages: list[dict],
        max_tokens: int = 2048,
        temperature: float = 0.7,
        top_p: float = 0.95,
        stop: list[str] | None = None,
    ) -> AsyncGenerator[str, None]:
        if self._model is None:
            raise RuntimeError("No model loaded. Call load_model() first.")
            
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