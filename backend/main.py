import os
import json
import traceback
import re
from typing import List, Optional, Dict, Any
from google.genai import types

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.genai.types import HttpOptions
import google.genai as genai

# ── FastAPI setup ────────────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── GenAI client init ────────────────────────────────────────────────────
os.environ["GOOGLE_CLOUD_PROJECT"] = "rubric-analyzer"
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

genai_client = genai.Client(http_options=HttpOptions(api_version="v1"))

# ── Pydantic models ─────────────────────────────────────────────────────
class TextIn(BaseModel):
    text: str

class AnalyzeIn(BaseModel):
    text: str
    rubric: List[str]

class Section(BaseModel):
    name: str
    text: str

class LLMMatch(BaseModel):
    criterion: str
    score: int
    max_score: int
    snippet: Optional[str] = None
    suggestion: Optional[str] = None

# ── /structure endpoint ─────────────────────────────────────────────────
@app.post("/structure", response_model=List[Section])
async def detect_sections(data: TextIn):
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
    return sections

# ── /analyze endpoint ────────────────────────────────────────────────────
@app.post("/analyze", response_model=List[LLMMatch])
async def analyze(data: AnalyzeIn):
    if not data.rubric:
        raise HTTPException(400, "Rubric list cannot be empty.")

    # Step 1: Generate rubric schema dynamically
    rubric_list = "\n".join(f"- {crit}" for crit in data.rubric)
    parse_prompt = f"""
You are a prompt engineer. Given these rubric criteria:
{rubric_list}

Output ONLY a JSON array of objects with keys:
  "criterion": text,
  "max_score": integer max points,
  "levels": object mapping scores 0..max_score to descriptions.
Use valid JSON (double quotes) and return only the array block.
"""

    try:
        resp1 = genai_client.models.generate_content(
            model="gemini-2.0-flash-001",
            contents=[parse_prompt],
            config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=1024),
        )
        raw1 = resp1.candidates[0].content.parts[0].text
        print("Schema raw response:\n", raw1)

        # Extract the first JSON array (non-greedy)
        match = re.search(r"(\[.*?\])", raw1, re.DOTALL)
        if not match:
            raise HTTPException(500, f"No JSON array found in schema response: {raw1}")
        raw_json = match.group(1)
        print("Extracted schema JSON:\n", raw_json)

        rubric_schema = json.loads(raw_json)

        # Step 2: Grade the essay against schema
        grade_schema = json.dumps(rubric_schema)
        grade_prompt = f"""
You are an expert grader. Here is the rubric schema:
{grade_schema}

Grade this essay. For each criterion, return ONLY a JSON array of objects with keys:
  - "criterion": the rubric criterion name
  - "score": the number of points earned
  - "max_score": the maximum possible points
  - "snippet": a brief excerpt that earned those points (or null if none)
  - "suggestion": a concrete, actionable improvement that would raise the score for this criterion (even if the score is zero).
Use valid JSON (double quotes) and return only the array itself.
"""
        grade_prompt += "\n" + data.text

        resp2 = genai_client.models.generate_content(
            model="gemini-2.0-flash-001",
            contents=[grade_prompt],
            config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=1024),
        )
        raw2 = resp2.candidates[0].content.parts[0].text
        print("Grade raw response:\n", raw2)

        match2 = re.search(r"(\[.*?\])", raw2, re.DOTALL)
        if not match2:
            raise HTTPException(500, f"No JSON array found in grade response: {raw2}")
        raw2_json = match2.group(1)
        print("Extracted grade JSON:\n", raw2_json)

        results = json.loads(raw2_json)

        # Ensure all criteria present
        output = []
        for crit_obj in rubric_schema:
            crit = crit_obj.get("criterion")
            max_s = crit_obj.get("max_score")
            match_item = next((m for m in results if m.get("criterion") == crit), None)
            if match_item:
                output.append(match_item)
            else:
                output.append({
                    "criterion": crit,
                    "score": 0,
                    "max_score": max_s,
                    "snippet": None,
                    "suggestion": "No evidence found."
                })
        return [LLMMatch(**m) for m in output]

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"LLM analysis failed: {e}")
