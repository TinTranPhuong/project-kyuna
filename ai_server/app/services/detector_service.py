import sys
import torch
import numpy as np
import cv2
import logging
from pathlib import Path
from typing import List, Union

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Library Import  ──────────────────────────────────────────────────────
DETECTOR_REPO_PATH = Path(__file__).parent.parent.parent / "comic-text-detector"
if str(DETECTOR_REPO_PATH) not in sys.path:
    sys.path.insert(0, str(DETECTOR_REPO_PATH))
try:
    from inference import TextDetector
except ImportError:
    TextDetector = None

class DetectorService:
    def __init__(self):
        self._model = None
        self._model_path = Path(settings.MODELS_DIR) / settings.DETECTOR_MODEL

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def load(self) -> None:
        if self._model is not None:
            return

        if not TextDetector:
            raise RuntimeError(f"Could not import TextDetector from {DETECTOR_REPO_PATH}")

        if not self._model_path.exists():
            raise FileNotFoundError(f"Detector model not found at: {self._model_path}")

        logger.info(f"Loading TextDetector from {self._model_path}...")
        self._model = TextDetector(
            model_path=str(self._model_path),
            input_size=1024,
            device='cuda' if torch.cuda.is_available() else 'cpu',
            act='leaky'
        )

    def unload(self) -> None:
        if self._model:
            del self._model
            self._model = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    def detect(self, image_source: Union[str, np.ndarray]) -> List[List[int]]:
        if not self.is_loaded:
            self.load()

        # ─── 1. Load & Validate Image ────────────────────────────────────────
        if isinstance(image_source, str):
            abs_path = Path(image_source).resolve()
            if not abs_path.exists():
                logger.error(f"Image file missing: {abs_path}")
                return []
            
            img_bgr = cv2.imread(str(abs_path))
            if img_bgr is None:
                logger.error(f"Could not read image (corrupt/empty): {abs_path}")
                return []
        else:
            img_bgr = image_source

        # ─── 2. Run Inference  ───────────────────────────────────────────────
        try:
            _, _, blk_list = self._model(img_bgr)
        except Exception as e:
            logger.error(f"Model inference failed: {e}")
            return []

        # ─── 3. Filter & Parse ───────────────────────────────────────────────
        final_boxes = []
        raw_count = len(blk_list)
        
        for blk in blk_list:
            score = 1.0
            if isinstance(blk, (list, np.ndarray)) and len(blk) >= 5:
                try:
                    score = float(blk[4])
                except: pass
            
            # Filter low confidence
            if score < settings.MIN_CONFIDENCE:
                continue
            # Geometry Parsing
            if isinstance(blk, np.ndarray):
                if blk.ndim == 2 and blk.shape[0] == 4:  
                    x, y, w, h = cv2.boundingRect(blk.astype(np.int32))
                    final_boxes.append([x, y, x + w, y + h])
                elif blk.ndim == 1 and len(blk) >= 4:   
                    final_boxes.append([int(blk[0]), int(blk[1]), int(blk[2]), int(blk[3])])
            elif isinstance(blk, list) and len(blk) >= 4:
                final_boxes.append([int(blk[0]), int(blk[1]), int(blk[2]), int(blk[3])])

        # Debug logging
        if raw_count > 0 and len(final_boxes) == 0:
            print(f"Found {raw_count} raw candidates, but ALL were below confidence {settings.MIN_CONFIDENCE}")
        elif raw_count > 0:
            print(f"Kept {len(final_boxes)}/{raw_count} bubbles (Threshold: {settings.MIN_CONFIDENCE})")
        
        return final_boxes

detector_service = DetectorService()