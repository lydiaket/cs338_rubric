# backend/main.py  
# This is the main server file for our FastAPI application, responsible for setting up endpoints, loading ML models, and processing requests.

from typing import List  # Type hints for Python lists
from pydantic import BaseModel  # Data validation and serialization
from fastapi import FastAPI, HTTPException  # FastAPI framework and error handling
from fastapi.middleware.cors import CORSMiddleware  # Middleware to handle CORS
import re, traceback  # Regular expressions and error printing

import torch  # PyTorch for tensor operations
from sentence_transformers import SentenceTransformer, util  # Pre-trained transformers and utilities
import language_tool_python  # Grammar checking library

# ── FastAPI + CORS setup ───────────────────────────────────────────────
# Create the FastAPI app and allow cross-origin requests from any origin.
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Allow all domains (for dev/testing)
    allow_credentials=True,      # Allow cookies and auth headers
    allow_methods=["*"],       # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],       # Allow all HTTP headers
)

# ── Load ML Models ─────────────────────────────────────────────────────
# sentence-transformers for semantic embeddings, and a grammar tool.
nlp = SentenceTransformer("all-MiniLM-L6-v2")  # Lightweight transformer for embeddings
tool = language_tool_python.LanguageTool("en-US")  # Grammar checker initialized for English

# ── Pydantic models ─────────────────────────────────────────────────────
# These define the shape of request and response data for FastAPI.
class TextIn(BaseModel):
    text: str  # Simple input with just a text field

class AnalyzeIn(BaseModel):
    text: str           # The full essay or text to analyze
    rubric: List[str]  # List of criteria/rubric items to match against the text

class Section(BaseModel):
    name: str  # Section title (e.g. 'Introduction')
    text: str  # Text content of the section

class Snippet(BaseModel):
    sentence: str  # A sentence snippet from the text
    score: float   # Similarity or relevance score

class Match(BaseModel):
    criterion: str      # The rubric criterion being matched
    score: float        # Overall match score
    section: str        # Which section this match came from
    snippets: List[Snippet]  # Top-matching sentences for context

# ── split_into_sections helper ─────────────────────────────────────────
# Splits a long text into logical sections based on headings or paragraph breaks.
def split_into_sections(text: str) -> List[Section]:
    lines = text.split("\n")
    sections: List[Section] = []
    current_name = "Body"
    buffer: List[str] = []
    explicit_count = 0

    def commit():
        # Save the buffered lines as a Section and clear buffer
        if buffer:
            sections.append(Section(name=current_name, text="\n".join(buffer).strip()))
            buffer.clear()

    # Regex to detect common section headings (Introduction, Results, etc.)
    heading_re = re.compile(
        r"^(Introduction|Background|Methodology|Results|Discussion|Conclusion|In conclusion)\b",
        re.IGNORECASE,
    )

    for line in lines:
        m = heading_re.match(line)
        if m:
            explicit_count += 1
            commit()  # end previous section
            name = m.group(1).strip().title()
            current_name = "Conclusion" if name.lower().startswith("in conclusion") else name
        else:
            buffer.append(line)
    commit()

    # If we didn't detect at least 2 headings, fallback to naive paragraph splitting
    if explicit_count < 2:
        paras = [p.strip() for p in text.split("\n\n") if p.strip()]
        sections = []
        if len(paras) >= 1:
            sections.append(Section(name="Introduction", text=paras[0]))
        if len(paras) > 2:
            sections.append(Section(name="Body", text="\n\n".join(paras[1:-1])))
        elif len(paras) == 2:
            sections.append(Section(name="Body", text=paras[1]))
        if len(paras) >= 2:
            sections.append(Section(name="Conclusion", text=paras[-1]))

    return sections

# ── has_thesis helper ──────────────────────────────────────────────────
# Detects if the first paragraph contains a thesis statement using embeddings.
def has_thesis(text: str) -> bool:
    first_para = text.split("\n\n", 1)[0]
    sents = re.split(r'(?<=[.!?])\s+', first_para)
    prompt_emb = nlp.encode("This sentence states the main argument of the essay.", convert_to_tensor=True)
    for s in sents[:2]:
        emb = nlp.encode(s, convert_to_tensor=True)
        # Compare cosine similarity with a lower threshold to catch soft matches
        if util.cos_sim(emb, prompt_emb).item() > 0.2:
            return True
    return False

# ── has_evidence helper ─────────────────────────────────────────────────
# Uses embeddings and regex to detect supporting evidence or examples.
def has_evidence(text: str) -> bool:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    prompt_emb = nlp.encode("This sentence provides supporting evidence or examples.", convert_to_tensor=True)
    for s in sentences:
        emb = nlp.encode(s, convert_to_tensor=True)
        if util.cos_sim(emb, prompt_emb).item() > 0.3:
            return True
    # Fallback to regex for numbers, citations, etc.
    if re.search(r"\d+%|\be\.g\.\b|\[\d+\]|\([A-Z][a-z]+ et al\., \d{4}\)", text):
        return True
    return False

# ── grammar_score helper ────────────────────────────────────────────────
# Calculates a simple grammar accuracy score based on detected errors.
def grammar_score(text: str) -> float:
    matches = tool.check(text)  # List of grammar errors
    errors = len(matches)
    words = max(1, len(text.split()))
    # Score: 1.0 minus errors per 100 words, clamped between 0 and 1
    score = max(0.0, 1 - errors / (words / 100))
    return min(1.0, score)

# ── has_conclusion helper ───────────────────────────────────────────────
# Checks if the last paragraph contains conclusion indicators.
def has_conclusion(text: str) -> bool:
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paras:
        return False
    last = paras[-1]
    return bool(re.search(r"\b(in conclusion|to conclude|in summary)\b", last, re.IGNORECASE))

# ── /structure endpoint ─────────────────────────────────────────────────
@app.post("/structure", response_model=List[Section])
async def detect_sections(data: TextIn):
    """
    Endpoint to split incoming text into logical sections.
    Returns a list of Section(name, text).
    """
    return split_into_sections(data.text)

# ── /analyze endpoint ────────────────────────────────────────────────────
@app.post("/analyze", response_model=List[Match])
async def analyze(data: AnalyzeIn):
    """
    Main analysis endpoint:
    1) Splits text into sections
    2) Encodes sections, full text, and rubric items to embeddings
    3) Computes cosine similarities to match rubric criteria
    4) Applies heuristic checks (thesis, evidence, grammar, conclusion)
    """
    try:
        # 1) Section split
        sections = split_into_sections(data.text)
        section_texts = [sec.text for sec in sections]

        # 2) Compute embeddings for sections, essay, and rubric
        sec_embs   = nlp.encode(section_texts, convert_to_tensor=True)
        essay_emb  = nlp.encode(data.text,       convert_to_tensor=True)
        crit_embs  = nlp.encode(data.rubric,     convert_to_tensor=True)

        # 3) Encode individual sentences for snippet matching
        sentences  = re.split(r'(?<=[.!?])\s+', data.text.strip())
        sent_embs  = nlp.encode(sentences, convert_to_tensor=True)

        # 4) Compute cosine similarity matrices
        cos_sec   = util.cos_sim(crit_embs, sec_embs)
        cos_essay = util.cos_sim(crit_embs, essay_emb)

        threshold = 0.30
        results: List[Match] = []

        # 5) Find best-matching section or essay-level score per rubric item
        for idx, crit in enumerate(data.rubric):
            sec_row   = cos_sec[idx]
            sec_best  = sec_row.max().item()
            sec_index = sec_row.argmax().item()
            essay_score = cos_essay[idx].item()
            best_score  = max(sec_best, essay_score)

            if best_score >= threshold:
                where = (
                    sections[sec_index].name if sec_best >= essay_score else "Full essay"
                )

                # Select top-2 matching sentences for context
                crit_vec = crit_embs[idx].unsqueeze(0)
                cos_sent = util.cos_sim(crit_vec, sent_embs)[0]
                topk     = torch.topk(cos_sent, k=min(2, cos_sent.size(0)))

                snippet_list = [
                    Snippet(sentence=sentences[i], score=score)
                    for score, i in zip(topk.values.tolist(), topk.indices.tolist())
                ]

                results.append(Match(
                    criterion=crit,
                    score=best_score,
                    section=where,
                    snippets=snippet_list
                ))

        # 6) Heuristic checks: thesis, evidence, grammar, conclusion
        if has_thesis(data.text):
            results.append(Match(criterion="Thesis Statement",  score=1.0, section="Introduction", snippets=[]))

        if has_evidence(data.text):
            results.append(Match(criterion="Supporting Evidence", score=1.0, section="Full essay", snippets=[]))

        # Always include grammar score
        g = grammar_score(data.text)
        results.append(Match(criterion="Grammar and Syntax", score=g, section="Full essay", snippets=[]))

        if has_conclusion(data.text):
            results.append(Match(criterion="Conclusion Clarity", score=1.0, section="Conclusion", snippets=[]))

        return results

    except Exception as e:
        print("❌ /analyze error:", e)
        traceback.print_exc()
        # Return a 500 error if anything goes wrong
        raise HTTPException(status_code=500, detail="Internal server error")
