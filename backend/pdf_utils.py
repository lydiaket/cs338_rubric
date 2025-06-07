import fitz  # PyMuPDF
import io
from PIL import Image
import pytesseract
import re
from typing import List


def extract_text_or_ocr_from_pdf(uploaded_file) -> str:
    """
    Extracts text from a PDF file-like object.
    Uses PyMuPDF for text extraction, and falls back to OCR via pytesseract if a page has no extractable text.
    """
    # Reset file pointer and read bytes
    uploaded_file.file.seek(0)
    file_bytes = uploaded_file.file.read()

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        raise ValueError(f"Could not open PDF: {e}")

    full_text = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        page_text = page.get_text()
        if not page_text.strip():
            # Fallback to OCR
            pix = page.get_pixmap()
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            page_text = pytesseract.image_to_string(img)
        full_text.append(page_text)

    return "\n\n".join(full_text)


def normalize_and_segment(text: str) -> List[str]:
    """
    Normalizes extracted text by removing headers/footers, unwrapping lines, and
    splitting into logical text blocks (paragraphs).
    Returns a list of cleaned paragraphs.
    """
    lines = text.splitlines()
    cleaned_lines = []
    header_footer_patterns = [
        r"AP® English Language and Composition.*",
        r"©\s*\d{4}\s*College Board",
        r"^Reporting$", r"^Category$", r"^Scoring Criteria$"
    ]
    for line in lines:
        if any(re.match(pat, line.strip()) for pat in header_footer_patterns):
            continue
        cleaned_lines.append(line)

    raw_paragraphs = []
    paragraph = []
    for line in cleaned_lines:
        if not line.strip():
            if paragraph:
                raw_paragraphs.append("\n".join(paragraph))
                paragraph = []
        else:
            paragraph.append(line)
    if paragraph:
        raw_paragraphs.append("\n".join(paragraph))

    normalized = []
    for para in raw_paragraphs:
        para = re.sub(r"-\s*\n", "", para)
        para = re.sub(r"\n+", " ", para)
        normalized.append(para.strip())

    return normalized


def parse_criteria_from_paragraphs(paragraphs: List[str]) -> List[str]:
    """
    Extracts rubric criterion names based on common patterns:
      - 'Row X CriterionName (0-# points)'
      - 'CriterionName (# points)'

    Returns a list of criterion names.
    """
    criteria = []
    # Pattern for table-style rows (e.g., 'Row A Thesis (0-1 points)')
    row_re = re.compile(r'^Row\s+[A-Z]\s+(.+?)\s*\(\s*\d+(?:-\d+)?\s*points?\)', re.IGNORECASE)
    # Generic pattern for 'Name (0-# points)' at start of paragraph
    generic_re = re.compile(r'^(.+?)\s*\(\s*\d+(?:-\d+)?\s*points?\)', re.IGNORECASE)

    for para in paragraphs:
        # Try the Row pattern first
        m = row_re.match(para)
        if m:
            name = m.group(1).strip()
            criteria.append(name)
            continue
        # Otherwise, try the generic pattern
        m2 = generic_re.match(para)
        if m2:
            name = m2.group(1).strip()
            if name not in criteria:
                criteria.append(name)
    return criteria
