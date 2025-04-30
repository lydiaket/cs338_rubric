from typing import List
from pydantic import BaseModel
import re

class Section(BaseModel):
    name: str
    text: str

def split_into_sections(text: str) -> List[Section]:
    """
    1) First pass: look for explicit headings via regex.
    2) If that only gives one section (no markers), fall back
       to paragraph-based segmentation: intro/body/conclusion.
    """
    lines = text.split("\n")
    sections: List[Section] = []
    current_name = "Body"
    buffer: List[str] = []

    def commit():
        if buffer:
            sections.append(Section(name=current_name, text="\n".join(buffer).strip()))
            buffer.clear()

    # First‐pass: explicit heading detection
    for line in lines:
        m = re.match(
            r"^(Introduction|Background|Methodology|Results|Discussion|Conclusion|In conclusion)\b",
            line,
            re.IGNORECASE,
        )
        if m:
            commit()
            current_name = m.group(1)
        else:
            buffer.append(line)
    commit()

    # If no real splits occurred, fallback to paragraphs
    if len(sections) <= 1:
        paras = [p.strip() for p in text.split("\n\n") if p.strip()]
        sections = []
        if len(paras) >= 1:
            sections.append(Section(name="Introduction", text=paras[0]))
        if len(paras) > 2:
            body = "\n\n".join(paras[1:-1])
            sections.append(Section(name="Body", text=body))
        if len(paras) >= 2:
            sections.append(Section(name="Conclusion", text=paras[-1]))

    return sections
