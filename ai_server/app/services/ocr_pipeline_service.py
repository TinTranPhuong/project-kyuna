import gc
import sys
import cv2
import torch # type: ignore
import numpy as np
from pathlib import Path
from PIL import Image
from app.core.config import settings

# Inject the cloned comic-text-detector repo into the Python path
# Resolves to: ai_server/app/utils/comic-text-detector
DETECTOR_PATH = Path(__file__).parent.parent.parent / "comic-text-detector"
sys.path.insert(0, str(DETECTOR_PATH))

try:
    from inference import TextDetector # type: ignore
except ImportError as e:
    print(f"Import Error: Could not load TextDetector. Ensure it is cloned at {DETECTOR_PATH}")
    print(f"Details: {e}")

try:
    from manga_ocr import MangaOcr # type: ignore
except ImportError as e:
    print(f"Import Error: Could not load MangaOcr. Ensure it is installed via pip.")


class OcrPipelineService:
    """
    Merged Stage 1+2+3 singleton.
    Detection → in-memory PIL cropping → OCR, all in RAM.
    One call, zero disk writes, zero base64 crop round-trips.
    """
    
    def __init__(self):
        self._detector = None
        self._ocr = None

    # ── Lazy loading ──────────────────────────────────────────────────────────
    def _load_detector(self) -> None:
        if self._detector is not None:
            return
            
        # settings.MODELS_DIR from config.py
        model_path = Path(settings.MODELS_DIR) / getattr(settings, "DETECTOR_MODEL", "comictextdetector.pt")
        
        if not model_path.exists():
            raise FileNotFoundError(
                f"comic-text-detector checkpoint not found: {model_path}\n"
                f"Download comictextdetector.pt and place it in MODELS_DIR."
            )
            
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self._detector = TextDetector(
            model_path=str(model_path),
            input_size=1024,
            device=device,
            act="leaky",
        )

    def _load_ocr(self) -> None:
        if self._ocr is not None:
            return
        # auto-downloads ~430MB from HuggingFace on first run
        self._ocr = MangaOcr()   

    # ── Main pipeline method ──────────────────────────────────────────────────
    def run(self, image_path: str) -> list[dict]:
        """
        Stages 1+2+3 in a single call.
        
        Args:
            image_path: absolute path to the full manga page image on disk.
            
        Returns:
            [
              {"index": 0, "bbox": [x1, y1, x2, y2], "japanese": "どうした"},
              {"index": 1, "bbox": [320, 40, 490, 90], "japanese": "ドン"},
              ...
            ]
            Empty list if no text detected.
        """
        self._load_detector()
        self._load_ocr()

        # ── Stage 1: Detection ────────────────────────────────────────────────
        # TextDetector expects a BGR numpy array (same as cv2.imread output)
        img_bgr = cv2.imread(image_path)
        if img_bgr is None:
            raise RuntimeError(f"Could not read image: {image_path}")
            
        img_h, img_w = img_bgr.shape[:2]
        _mask, _mask_refined, blk_list = self._detector(img_bgr)
        
        if not blk_list:
            return []

        # ── Stage 2: In-memory PIL cropping ───────────────────────────────────
        # Convert once to PIL RGB for cropping (no disk writes)
        img_pil = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
        crops = []
        
        for blk in blk_list:
            x1, y1, x2, y2 = [int(v) for v in blk.xyxy]
            
            # Clamp to image bounds to prevent PIL crash
            x1 = max(0, min(x1, img_w))
            y1 = max(0, min(y1, img_h))
            x2 = max(0, min(x2, img_w))
            y2 = max(0, min(y2, img_h))
            
            # Skip degenerate/tiny boxes that detector might hallucinate
            if (x2 - x1) < 5 or (y2 - y1) < 5:
                continue
                
            crop = img_pil.crop((x1, y1, x2, y2))
            crops.append(([x1, y1, x2, y2], crop))
            
        if not crops:
            return []

        # ── Stage 3: OCR ──────────────────────────────────────────────────────
        regions = []
        for idx, (bbox, crop_img) in enumerate(crops):
            try:
                text = self._ocr(crop_img)
                text = text.strip() if text else ""
            except Exception:
                text = ""
                
            # Skip completely empty OCR results
            if not text:
                continue
                
            regions.append({
                "index": len(regions),   # re-index after empty-filter
                "bbox":  bbox,
                "japanese": text,
            })

        # Sort reading order: top-to-bottom primary, left-to-right secondary
        # (Very basic sorting, assumes vertical manga flow)
        regions.sort(key=lambda r: (r["bbox"][1] // 50, r["bbox"][0]))
        
        # Final re-index after sort
        for i, r in enumerate(regions):
            r["index"] = i
            
        return regions

    # ── Hangoff Protocol ──────────────────────────────────────────────────────
    def unload(self) -> None:
        """
        Called once by Hangoff Protocol before loading Qwen 20B.
        Unloads BOTH detector and OCR models safely.
        """
        if self._detector is not None:
            del self._detector
            self._detector = None
            
        if self._ocr is not None:
            del self._ocr
            self._ocr = None
            
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize() # Wait for CUDA to actually clear
            
        gc.collect()

    @property
    def is_loaded(self) -> bool:
        return self._detector is not None or self._ocr is not None


# Singleton — import this in translation_pipeline_service and the router
ocr_pipeline_service = OcrPipelineService()