# ── backend/main.py ─────────────────────────────────────────────────────────

import os
import json
import traceback
import re
import hashlib
import logging
from typing import List, Optional

from google.genai import types
import google.genai as genai
from google.genai.types import HttpOptions

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.pdf_utils import (
    extract_text_or_ocr_from_pdf,
    normalize_and_segment,
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check Google Cloud setup
try:
    import google.auth
    credentials, project = google.auth.default()
    logger.info(f"Google Cloud project: {project}")
    logger.info("Google Cloud credentials found")
except Exception as e:
    logger.error(f"Google Cloud setup issue: {e}")

os.environ["GOOGLE_CLOUD_PROJECT"] = "rubric-analyzer"
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

try:
    genai_client = genai.Client(http_options=HttpOptions(api_version="v1"))
    logger.info("Generative AI client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Generative AI client: {e}")
    genai_client = None

parsed_rubrics = {}  # In-memory store: rubric_id -> parsed rubric JSON

class TextIn(BaseModel):
    text: str

class RubricIn(BaseModel):
    rubric_text: str

class ScoreIn(BaseModel):
    rubric_id: str
    essay_text: str

class Section(BaseModel):
    name: str
    text: str

class LLMMatch(BaseModel):
    criterion: str
    score: int
    max_score: int
    snippet: Optional[str] = None
    suggestion: Optional[str] = None

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "genai_client_initialized": genai_client is not None,
        "parsed_rubrics_count": len(parsed_rubrics)
    }

@app.get("/test_ai")
async def test_ai():
    if not genai_client:
        raise HTTPException(status_code=500, detail="AI client not initialized")
    
    try:
        resp = genai_client.models.generate_content(
            model="gemini-2.0-flash-001",
            contents=["Return only this JSON without any markdown formatting: {\"message\": \"Hello, this is a test!\"}"],
            config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=100),
        )
        raw_response = resp.candidates[0].content.parts[0].text
        
        # Strip markdown formatting if present
        cleaned_response = raw_response.strip()
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith('```'):
            cleaned_response = cleaned_response[3:]
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]
        cleaned_response = cleaned_response.strip()
        
        return {"raw_response": raw_response, "cleaned_response": cleaned_response}
    except Exception as e:
        logger.error(f"AI test failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI test failed: {str(e)}")

@app.post("/parse_rubric", response_model=dict)
async def parse_rubric(data: RubricIn):
    try:
        raw = data.rubric_text
        logger.info(f"Parsing rubric, length: {len(raw)} characters")
        
        rubric_id = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]
        if rubric_id in parsed_rubrics:
            logger.info(f"Rubric {rubric_id} already exists, returning cached")
            return {"rubric_id": rubric_id}

        prompt = f"""
You are a rubric parsing assistant. Parse this rubric text and return ONLY a JSON array with no extra text, no markdown formatting.

Each criterion should be an object with:
- "key": the criterion name (string)
- "max_score": highest possible points (integer)  
- "levels": object with score numbers as keys and descriptions as values

Example format:
[
  {{
    "key": "Thesis",
    "max_score": 1,
    "levels": {{
      "1": "Clear thesis statement",
      "0": "Missing or unclear thesis"
    }}
  }}
]

Rubric text to parse:
{raw}

Return only the JSON array:"""
        
        logger.info("Sending request to Gemini...")
        
        # Check if the client is properly initialized
        if not genai_client:
            raise HTTPException(status_code=500, detail="Generative AI client not initialized")
        
        try:
            resp = genai_client.models.generate_content(
                model="gemini-2.0-flash-001",
                contents=[prompt],
                config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=800),
            )
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
        
        if not resp.candidates or not resp.candidates[0].content.parts:
            raise HTTPException(status_code=500, detail="No response from AI service")
        
        raw_response = resp.candidates[0].content.parts[0].text
        logger.info(f"Raw AI response: {raw_response[:200]}...")
        
        # Strip markdown formatting if present
        cleaned_response = raw_response.strip()
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]  # Remove ```json
        if cleaned_response.startswith('```'):
            cleaned_response = cleaned_response[3:]   # Remove ```
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]  # Remove trailing ```
        cleaned_response = cleaned_response.strip()
        
        # Fix common JSON formatting issues
        # Replace unquoted property names with quoted ones
        import re
        # Fix unquoted keys: key: -> "key":
        cleaned_response = re.sub(r'\b(\w+):', r'"\1":', cleaned_response)
        # Fix double-quoted keys that got double-quoted: ""key"": -> "key":
        cleaned_response = re.sub(r'""([^"]+)"":', r'"\1":', cleaned_response)
        # Fix already quoted keys that got quoted again: "\"key\"": -> "key":
        cleaned_response = re.sub(r'"\\"([^"]+)\\"":', r'"\1":', cleaned_response)
        
        logger.info(f"Cleaned response: {cleaned_response[:200]}...")
        
        try:
            parsed = json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            # Try one more fix - sometimes AI returns single quotes
            try:
                # Replace single quotes with double quotes (but be careful about apostrophes)
                fixed_response = cleaned_response.replace("'", '"')
                # Fix apostrophes back
                fixed_response = re.sub(r'(\w)"(\w)', r"\1'\2", fixed_response)
                parsed = json.loads(fixed_response)
                logger.info("Successfully parsed after single quote fix")
            except json.JSONDecodeError:
                logger.error(f"JSON decode error: {e}")
                logger.error(f"Raw response: {raw_response}")
                logger.error(f"Cleaned response: {cleaned_response}")
                # Try to extract just the JSON array part
                try:
                    import ast
                    # Last resort: try to extract JSON-like content
                    start = cleaned_response.find('[')
                    end = cleaned_response.rfind(']') + 1
                    if start >= 0 and end > start:
                        json_part = cleaned_response[start:end]
                        logger.info(f"Trying to parse extracted JSON: {json_part[:100]}...")
                        parsed = json.loads(json_part)
                    else:
                        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}")
                except:
                    raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}")
        
        # Validate and normalize the parsed rubric
        if not isinstance(parsed, list):
            raise HTTPException(status_code=500, detail="AI response is not a list")
        
        for i, item in enumerate(parsed):
            if not isinstance(item, dict):
                raise HTTPException(status_code=500, detail=f"Item {i} is not a dictionary")
            
            if "key" not in item or "max_score" not in item or "levels" not in item:
                raise HTTPException(status_code=500, detail=f"Item {i} missing required fields")
            
            ms = item["max_score"]
            levels_raw = item["levels"]
            
            # Convert keys to int
            levels = {}
            for k, v in levels_raw.items():
                try:
                    levels[int(k)] = v
                except (ValueError, TypeError):
                    raise HTTPException(status_code=500, detail=f"Invalid level key: {k}")
            
            if not isinstance(ms, int) or ms < 1:
                raise HTTPException(status_code=500, detail=f"Invalid max_score: {ms}")
            
            # Ensure all levels from 0 to max_score exist
            for level_num in range(ms + 1):
                if level_num not in levels:
                    logger.warning(f"Missing level {level_num} for criterion {item['key']}, adding placeholder")
                    levels[level_num] = f"Level {level_num} description (auto-generated)"
            
            item["levels"] = levels
        
        parsed_rubrics[rubric_id] = parsed
        logger.info(f"Successfully parsed rubric {rubric_id} with {len(parsed)} criteria")
        return {"rubric_id": rubric_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in parse_rubric: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/parse_rubric_pdf", response_model=dict)
async def parse_rubric_pdf(file: UploadFile = File(...)):
    try:
        logger.info(f"Parsing PDF rubric: {file.filename}")
        raw_text = extract_text_or_ocr_from_pdf(file)
        normalized = "\n".join(normalize_and_segment(raw_text))
        logger.info(f"Extracted {len(normalized)} characters from PDF")
        return await parse_rubric(RubricIn(rubric_text=normalized))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF rubric parsing error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"PDF rubric parsing error: {e}")

@app.post("/score_essay", response_model=List[LLMMatch])
async def score_essay(data: ScoreIn):
    logger.info(f"Scoring essay with rubric ID: {data.rubric_id}")
    
    if data.rubric_id not in parsed_rubrics:
        logger.error(f"Unknown rubric_id: {data.rubric_id}")
        raise HTTPException(status_code=404, detail="Unknown rubric_id")
    
    if not genai_client:
        raise HTTPException(status_code=500, detail="Generative AI client not initialized")
    
    essay_text = data.essay_text
    rubric = parsed_rubrics[data.rubric_id]
    results: List[LLMMatch] = []

    logger.info(f"Processing {len(rubric)} criteria")

    for item in rubric:
        key = item["key"]
        max_score = item["max_score"]
        levels = item["levels"]

        levels_block = ""
        for level in sorted(levels.keys(), reverse=True):
            desc = levels[level]
            levels_block += f"{level} points: \"{desc}\"\n"

        prompt = f"""
Score this essay for the criterion "{key}" (max {max_score} points).

Scoring guide:
{levels_block}

Essay text:
{essay_text}

Return ONLY this JSON format with no extra text:
{{
  "score": <integer_0_to_{max_score}>,
  "snippet": <"supporting_sentence_from_essay_or_null">,
  "suggestion": <"improvement_advice_or_null">
}}

JSON response:"""
        try:
            resp = genai_client.models.generate_content(
                model="gemini-2.0-flash-001",
                contents=[prompt],
                config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=200),
            )
            raw = resp.candidates[0].content.parts[0].text.strip()
            logger.info(f"AI response for criterion '{key}': {raw[:100]}...")
            
            # Strip markdown formatting if present
            cleaned_raw = raw.strip()
            if cleaned_raw.startswith('```json'):
                cleaned_raw = cleaned_raw[7:]  # Remove ```json
            if cleaned_raw.startswith('```'):
                cleaned_raw = cleaned_raw[3:]   # Remove ```
            if cleaned_raw.endswith('```'):
                cleaned_raw = cleaned_raw[:-3]  # Remove trailing ```
            cleaned_raw = cleaned_raw.strip()
            
            # Fix common JSON formatting issues
            import re
            # Fix unquoted keys: key: -> "key":
            cleaned_raw = re.sub(r'\b(\w+):', r'"\1":', cleaned_raw)
            # Fix double-quoted keys that got double-quoted: ""key"": -> "key":
            cleaned_raw = re.sub(r'""([^"]+)"":', r'"\1":', cleaned_raw)
            # Fix already quoted keys that got quoted again: "\"key\"": -> "key":
            cleaned_raw = re.sub(r'"\\"([^"]+)\\"":', r'"\1":', cleaned_raw)
            
            try:
                parsed = json.loads(cleaned_raw)
                score_val = int(parsed["score"])
                snippet_val = parsed.get("snippet")
                suggestion_val = parsed.get("suggestion")
                
                # Validate score range
                if score_val < 0 or score_val > max_score:
                    logger.warning(f"Score {score_val} out of range for criterion {key}, clamping")
                    score_val = max(0, min(score_val, max_score))
                
            except Exception as e:
                # Try single quote fix
                try:
                    fixed_raw = cleaned_raw.replace("'", '"')
                    fixed_raw = re.sub(r'(\w)"(\w)', r"\1'\2", fixed_raw)
                    parsed = json.loads(fixed_raw)
                    score_val = int(parsed["score"])
                    snippet_val = parsed.get("snippet")
                    suggestion_val = parsed.get("suggestion")
                    
                    if score_val < 0 or score_val > max_score:
                        logger.warning(f"Score {score_val} out of range for criterion {key}, clamping")
                        score_val = max(0, min(score_val, max_score))
                except:
                    logger.error(f"JSON parse error for {key}: {e}")
                    logger.error(f"Raw response: {raw}")
                    logger.error(f"Cleaned response: {cleaned_raw}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Scoring LLM JSON parse error for {key}: {e}\nRaw: {raw}"
                    )
            
            results.append(
                LLMMatch(
                    criterion=key,
                    score=score_val,
                    max_score=max_score,
                    snippet=snippet_val,
                    suggestion=suggestion_val,
                )
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error processing criterion {key}: {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error processing criterion {key}: {str(e)}")

    logger.info(f"Successfully scored essay with {len(results)} criteria")
    return results

@app.post("/score_essay_pdf", response_model=List[LLMMatch])
async def score_essay_pdf(
    rubric_id: str = Form(...),
    essay_file: UploadFile = File(...),
):
    logger.info(f"Scoring PDF essay with rubric ID: {rubric_id}")
    
    if rubric_id not in parsed_rubrics:
        logger.error(f"Unknown rubric_id: {rubric_id}")
        raise HTTPException(status_code=404, detail="Unknown rubric_id")
    
    try:
        essay_text = extract_text_or_ocr_from_pdf(essay_file)
        logger.info(f"Extracted {len(essay_text)} characters from PDF essay")
        return await score_essay(ScoreIn(rubric_id=rubric_id, essay_text=essay_text))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF essay scoring error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"PDF essay scoring error: {e}")

@app.post("/structure", response_model=List[Section])
async def detect_sections(data: TextIn):
    logger.info(f"Detecting sections in text of length: {len(data.text)}")
    
    lines = data.text.split("\n")
    sections, buffer = [], []
    current = "Body"
    hdr = re.compile(r"^(Introduction|Conclusion|Discussion)\b", re.I)
    
    def commit():
        nonlocal buffer, current
        if buffer:
            sections.append(Section(name=current, text="\n".join(buffer).strip()))
            buffer = []
    
    for l in lines:
        if hdr.match(l):
            commit()
            current = hdr.match(l).group(1).title()
        else:
            buffer.append(l)
    commit()
    
    logger.info(f"Detected {len(sections)} sections")
    return sections

@app.post("/structure_pdf", response_model=List[Section])
async def structure_pdf(
    essay_file: UploadFile = File(...),
):
    try:
        logger.info(f"Detecting sections in PDF: {essay_file.filename}")
        essay_text = extract_text_or_ocr_from_pdf(essay_file)
        
        lines = essay_text.split("\n")
        sections, buffer = [], []
        current = "Body"
        hdr = re.compile(r"^(Introduction|Conclusion|Discussion)\b", re.I)
        
        def commit():
            nonlocal buffer, current
            if buffer:
                sections.append(Section(name=current, text="\n".join(buffer).strip()))
                buffer = []
        
        for l in lines:
            if hdr.match(l):
                commit()
                current = hdr.match(l).group(1).title()
            else:
                buffer.append(l)
        commit()
        
        logger.info(f"Detected {len(sections)} sections in PDF")
        return sections
    except Exception as e:
        logger.error(f"PDF structure error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"PDF structure error: {e}")

# Add startup event to check configuration
@app.on_event("startup")
async def startup_event():
    logger.info("Starting Rubric Analyzer API")
    logger.info(f"Google Cloud Project: {os.environ.get('GOOGLE_CLOUD_PROJECT')}")
    logger.info(f"Google Cloud Location: {os.environ.get('GOOGLE_CLOUD_LOCATION')}")
    logger.info(f"Using Vertex AI: {os.environ.get('GOOGLE_GENAI_USE_VERTEXAI')}")
    
    if genai_client:
        logger.info("Generative AI client is ready")
    else:
        logger.error("Generative AI client failed to initialize - check your Google Cloud setup")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)