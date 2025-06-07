# backend/test_parse_criteria.py

import io
from backend.pdf_utils import (
    extract_text_or_ocr_from_pdf, 
    normalize_and_segment, 
    parse_criteria_from_paragraphs
)

class DummyUploadFile:
    def __init__(self, filename: str, file_bytes: bytes):
        self.filename = filename
        self.file = io.BytesIO(file_bytes)

def main():
    pdf_path = "backend/test/Rubric.pdf"
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    upload = DummyUploadFile("Rubric (1).pdf", file_bytes)
    raw_text = extract_text_or_ocr_from_pdf(upload)
    paragraphs = normalize_and_segment(raw_text)
    criteria = parse_criteria_from_paragraphs(paragraphs)

    print("Extracted criteria:")
    for crit in criteria:
        print(f"- {crit}")

if __name__ == "__main__":
    main()
