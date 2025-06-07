# backend/test_normalize_segment.py

import io
from backend.pdf_utils import extract_text_or_ocr_from_pdf, normalize_and_segment

class DummyUploadFile:
    """
    Minimal stand‐in for FastAPI's UploadFile, just carries filename and file‐like object.
    """
    def __init__(self, filename: str, file_bytes: bytes):
        self.filename = filename
        self.file = io.BytesIO(file_bytes)


def main():
    # Path to your PDF rubric
    pdf_path = "backend/test/Rubric.pdf"
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    # Extract raw text
    upload = DummyUploadFile(filename="Rubric.pdf", file_bytes=file_bytes)
    raw_text = extract_text_or_ocr_from_pdf(upload)

    # Normalize & segment into paragraphs
    paragraphs = normalize_and_segment(raw_text)

    # Print the first few paragraphs for inspection
    for i, para in enumerate(paragraphs[:5], start=1):
        print(f"Paragraph {i}:\n{para}\n")

if __name__ == "__main__":
    main()
