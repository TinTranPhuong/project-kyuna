import docx

def parse_docx(file_path: str) -> list[dict]:
    """
    Returns [{"page_number": None, "text": str, "heading": str | None}].
    Detects Heading 1/2/3 styles as section boundaries.
    """
    doc = docx.Document(file_path)
    sections = []
    current_heading = None
    current_text = []
    
    for para in doc.paragraphs:
        if para.style.name.startswith("Heading"):
            if current_text:
                sections.append({
                    "page_number": None, 
                    "text": "\n".join(current_text), 
                    "heading": current_heading
                })
                current_text = []
            current_heading = para.text.strip()
        else:
            if para.text.strip():
                current_text.append(para.text.strip())
                
    if current_text:
        sections.append({
            "page_number": None, 
            "text": "\n".join(current_text), 
            "heading": current_heading
        })
        
    return sections