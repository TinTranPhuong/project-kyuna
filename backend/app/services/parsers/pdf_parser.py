from pypdf import PdfReader

def parse_pdf(file_path: str) -> list[dict]:
    """
    Returns [{"page_number": int, "text": str}].
    Text-layer only — no OCR.
    Caller must check if total text is < 50 chars (scanned PDF guard).
    """
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append({"page_number": i, "text": text.strip()})
    return pages