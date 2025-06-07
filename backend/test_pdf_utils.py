
import io
from backend.pdf_utils import extract_text_or_ocr_from_pdf

class DummyUploadFile:
    """
    Minimal stand‐in for FastAPI's UploadFile, 
    just carries a filename and a file‐like object.
    """
    def __init__(self, filename: str, file_bytes: bytes):
        self.filename = filename
        self.file = io.BytesIO(file_bytes)

def main():
    # Adjust the path below if your PDF lives elsewhere
    pdf_path = "/Users/ehulises/cs338_rubric/backend/test/Rubric.pdf"
    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    # Wrap bytes in our DummyUploadFile to mimic an uploaded file
    upload = DummyUploadFile(filename="Rubric.pdf", file_bytes=file_bytes)
    text = extract_text_or_ocr_from_pdf(upload)

    # Print the first 1,000 chars so you can eyeball if it looks right
    print(text[:1000])

if __name__ == "__main__":
    main()
