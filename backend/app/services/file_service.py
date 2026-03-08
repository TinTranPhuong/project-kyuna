import os
import re
import shutil
import zipfile
from pathlib import Path
from uuid import UUID

import aiofiles
from fastapi import UploadFile

from app.core.config import settings


def get_upload_dir(user_id: UUID, job_id: UUID) -> Path:
    """Return Path object for a job's base upload directory."""
    return Path(settings.UPLOAD_DIR) / str(user_id) / str(job_id)


def natural_sort_key(s: str) -> list:
    """Helper for natural sorting of filenames containing numbers."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]


def extract_cbz(cbz_path: str, output_dir: str) -> list[str]:
    """
    CBZ is a ZIP of image files. Extract and sort them by filename.
    Returns a sorted list of extracted absolute image paths.
    """
    valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    extracted_paths = []

    os.makedirs(output_dir, exist_ok=True)

    with zipfile.ZipFile(cbz_path, 'r') as zf:
        # Filter for image files only to prevent extracting malicious scripts
        image_files = [
            f for f in zf.namelist() 
            if Path(f).suffix.lower() in valid_extensions and not f.startswith("__MACOSX")
        ]
        
        # Extract files flatly into output_dir (ignore internal folders)
        for file_info in zf.infolist():
            if file_info.filename in image_files:
                # Security: prevent directory traversal via zip slip
                safe_name = Path(file_info.filename).name
                out_path = Path(output_dir) / safe_name
                
                with zf.open(file_info) as source, open(out_path, "wb") as target:
                    shutil.copyfileobj(source, target)
                    extracted_paths.append(str(out_path))

    # Sort files naturally (page_1, page_2... page_10)
    extracted_paths.sort(key=natural_sort_key)
    return extracted_paths


def validate_file_type(file_bytes: bytes, filename: str) -> str:
    """Check magic bytes to validate real file type. Return extension or raise."""
    magic_bytes_map = {
        b'\xFF\xD8\xFF': 'jpg',
        b'\x89PNG': 'png',
        b'PK\x03\x04': 'cbz',  
    }
    
    for magic, ext in magic_bytes_map.items():
        if file_bytes.startswith(magic):
            return ext
            
    raise ValueError(f"Unsupported file type: {filename}")


async def save_upload(file: UploadFile, user_id: UUID, job_id: UUID) -> str:
    """
    Save uploaded file to disk using async chunks. 
    Returns the absolute path to the saved file.
    """
    job_dir = get_upload_dir(user_id, job_id)
    original_dir = job_dir / "original"
    original_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = original_dir / file.filename
    
    # Reset cursor just in case it was read during validation
    await file.seek(0)
    
    async with aiofiles.open(file_path, "wb") as out_file:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            await out_file.write(chunk)
            
    return str(file_path)


def delete_job_files(user_id: UUID, job_id: UUID) -> None:
    """Delete entire job directory recursively."""
    job_dir = get_upload_dir(user_id, job_id)
    if job_dir.exists() and job_dir.is_dir():
        shutil.rmtree(job_dir, ignore_errors=True)