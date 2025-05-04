# cs338_rubric

essay editing app based on rubric

## Backend Setup

### 1. Create & activate a virtual environment

```bash
python3 -m venv venv

# macOS/Linux
source venv/bin/activate

# Windows (PowerShell)
\venv\Scripts\activate


2. Install Python dependencies
pip install -r requirements.txt
3. Run the FastAPI server

uvicorn main:app --reload
The API will be live at: http://localhost:8000

Interactive docs: http://localhost:8000/docs

Frontend Setup
In a separate terminal, from the project root:

1. Install JS dependencies
npm install
2. Start the dev server
npm run dev
Your frontend will typically be available at http://localhost:3000

Verification
Backend: open http://localhost:8000/docs to inspect and call endpoints.

Frontend: navigate to http://localhost:3000 (or the URL shown in your console).

Shutting Down
1. Stop servers
Backend terminal: Ctrl+C

Frontend terminal: Ctrl+C

2. Deactivate virtual environment
deactivate
```
