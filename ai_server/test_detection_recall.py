import sys
import os
import cv2
from pathlib import Path

# Add project root to path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.detector_service import detector_service

def test_recall():
    # 1. Configuration
    test_images = [
        "test_manga_page_1.jpg", # Action
        "test_manga_page_2.jpg", # Slice of Life
        "test_manga_page_3.jpg"  # Title Page
    ]
    
    print("🚀 Starting Recall Test...")
    detector_service.load()
    
    for img_name in test_images:
        if not os.path.exists(img_name):
            print(f"⚠️ Skipping {img_name} (File not found)")
            continue
            
        print(f"\nProcessing {img_name}...")
        
        # Run detection
        boxes = detector_service.detect(img_name)
        
        # Load image to draw boxes
        img = cv2.imread(img_name)
        
        # Draw rectangles
        for box in boxes:
            x1, y1, x2, y2 = box
            # Draw Red Box with thickness 3
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 3)
            
        # Save output
        output_name = f"result_{img_name}"
        cv2.imwrite(output_name, img)
        print(f"✅ Found {len(boxes)} bubbles. Saved visualization to {output_name}")
        print("   -> Please open the image and manually verify if any bubbles were missed.")

if __name__ == "__main__":
    test_recall()