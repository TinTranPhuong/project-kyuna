import easyocr
import numpy as np
from dataclasses import dataclass

@dataclass
class TextRegion:
    bbox: list[list[int]]    # [[x1,y1],[x2,y1],[x2,y2],[x1,y2]]
    text: str
    confidence: float

class OCRService:
    """Wrapper around EasyOCR with lazy initialization."""
    
    def __init__(self):
        self._reader: easyocr.Reader | None = None
        self._loaded_languages: list[str] = []

    def initialize(self, languages: list[str] = ['ja', 'en']) -> None:
        """Initialize OCR reader. Call once on startup. GPU if available."""
        if self._reader is not None and self._loaded_languages == languages:
            return
            
        # Initializes PyTorch models in the background
        self._reader = easyocr.Reader(languages, gpu=True)
        self._loaded_languages = languages

    def extract_text(self, image_path: str, min_confidence: float = 0.3) -> list[TextRegion]:
        """
        Run OCR on an image file.
        Returns list of TextRegion — only includes results above min_confidence threshold.
        """
        if self._reader is None:
            self.initialize()
            
        results = self._reader.readtext(image_path, detail=1)
        
        return [
            TextRegion(bbox=r[0], text=r[1], confidence=r[2])
            for r in results
            if r[2] >= min_confidence
        ]

    def extract_text_from_array(self, img_array: np.ndarray) -> list[TextRegion]:
        """Same as extract_text but accepts a numpy array (for in-memory processing)."""
        if self._reader is None:
            self.initialize()
            
        results = self._reader.readtext(img_array, detail=1)
        
        return [
            TextRegion(bbox=r[0], text=r[1], confidence=r[2]) 
            for r in results 
            if r[2] >= 0.3
        ]

# Singleton instance
ocr_service = OCRService()