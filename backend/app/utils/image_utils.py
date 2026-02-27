import os
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def get_font(size: int) -> ImageFont.FreeTypeFont:
    """Load NotoSansCJK font for multi-language support."""
    font_path = Path(__file__).parent / "fonts" / "NotoSansCJK-Regular.ttf"
    
    try:
        return ImageFont.truetype(str(font_path), size)
    except IOError:
        # Fallback for dev environments if the font hasn't been downloaded yet
        return ImageFont.load_default()


def overlay_translations_on_image(
    image_path: str,
    text_regions: list[dict],
    output_path: str
) -> None:
    """
    Overlay translated text onto the original image.
    text_regions format: [{"bbox": [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], "translated": "Hello"}]
    """
    with Image.open(image_path) as img:
        # Convert to RGB to ensure compatibility when saving as JPEG
        img = img.convert("RGB")
        draw = ImageDraw.Draw(img)

        for region in text_regions:
            bbox = region.get("bbox")
            translated_text = region.get("translated", "")
            if not bbox or not translated_text:
                continue

            # Extract coordinates
            xs = [point[0] for point in bbox]
            ys = [point[1] for point in bbox]
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            
            box_width = max_x - min_x
            box_height = max_y - min_y

            # 1. Draw white rectangle over the original text
            draw.rectangle([min_x, min_y, max_x, max_y], fill="white")

            # 2. Determine initial font size
            target_size = int(box_height * 0.8)
            font_size = max(10, min(target_size, 48))  # Clamp between 10 and 48
            font = get_font(font_size)

            # 3. Shrink font size if text overflows the bounding box width
            while font_size > 10:
                left, top, right, bottom = draw.textbbox((0, 0), translated_text, font=font)
                text_width = right - left
                if text_width <= box_width:
                    break
                font_size -= 2
                font = get_font(font_size)

            # 4. Draw the translated text
            # Calculate vertical center approximation
            text_y = min_y + (box_height - (bottom - top)) / 2
            draw.text((min_x, text_y), translated_text, fill="black", font=font)

        # Ensure output directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path, "JPEG", quality=95)


def resize_image_for_ocr(image_path: str, max_dim: int = 2000) -> str:
    """
    Resize large images before OCR to avoid memory issues.
    Returns path to resized image temp file, or original path if small enough.
    """
    with Image.open(image_path) as img:
        width, height = img.size
        
        if max(width, height) <= max_dim:
            return image_path
            
        # Calculate new dimensions proportionally
        ratio = max_dim / max(width, height)
        new_width = int(width * ratio)
        new_height = int(height * ratio)
        
        resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Save to a temporary file
        fd, temp_path = tempfile.mkstemp(suffix=".jpg")
        os.close(fd)
        
        # Convert to RGB in case it's RGBA
        resized_img.convert("RGB").save(temp_path, "JPEG", quality=90)
        
        return temp_path