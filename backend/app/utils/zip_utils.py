import io
import os
import tempfile
import zipfile
from typing import AsyncGenerator

import aiofiles


def create_zip_bytes(file_paths: list[tuple[str, str]]) -> bytes:
    """
    Create an in-memory ZIP file.
    file_paths: list of (absolute_path, name_in_zip) tuples
    Returns: ZIP file as bytes
    """
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for abs_path, name_in_zip in file_paths:
            # Ensure the file actually exists before trying to add it
            if os.path.exists(abs_path):
                zf.write(abs_path, name_in_zip)
    return buffer.getvalue()


async def create_zip_stream(file_paths: list[tuple[str, str]]) -> AsyncGenerator[bytes, None]:
    """
    Stream ZIP file bytes without loading everything into memory.
    Yield chunks of the ZIP as bytes.
    Use with StreamingResponse in FastAPI.
    """
    fd, temp_path = tempfile.mkstemp(suffix=".zip")
    os.close(fd)
    
    try:
        # Create the zip synchronously (usually fast enough for standard files)
        with zipfile.ZipFile(temp_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for abs_path, name_in_zip in file_paths:
                if os.path.exists(abs_path):
                    zf.write(abs_path, name_in_zip)
        
        # Stream it back asynchronously in 64KB chunks
        async with aiofiles.open(temp_path, 'rb') as f:
            while chunk := await f.read(65536):
                yield chunk
                
    finally:
        # Clean up the temp file once the stream is finished or cancelled
        if os.path.exists(temp_path):
            os.remove(temp_path)