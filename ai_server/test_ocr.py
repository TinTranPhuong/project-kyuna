import json
import time
from app.services.ocr_pipeline_service import ocr_pipeline_service

def test_pipeline():
    image_path = "test.jpg"
    
    print("🚀 Starting OCR Pipeline Test...")
    start_time = time.time()
    
    # Run the merged Stage 1+2+3
    results = ocr_pipeline_service.run(image_path)
    
    end_time = time.time()
    
    print("\n✅ Extraction Complete!")
    print(f"⏱️ Time taken: {end_time - start_time:.2f} seconds")
    print(f"📦 Bubbles found: {len(results)}\n")
    
    # Print the beautiful JSON output
    print(json.dumps(results, indent=2, ensure_ascii=False))
    
    print("\n🧹 Testing Hangoff Protocol (Unloading...)")
    ocr_pipeline_service.unload()
    print("✅ VRAM Cleared successfully!")

if __name__ == "__main__":
    test_pipeline()