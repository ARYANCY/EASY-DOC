import re
import io
import uuid
from typing import Any, Dict, List

try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

from app.core.config import GEMINI_API_KEY, USE_MOCK

CLAUSE_CATEGORIES = {
    "liability": ["liable", "liability", "damages", "indemnif", "indemnity", "harm"],
    "termination": ["terminat", "cancel", "end of agreement", "expir", "notice period"],
    "payment": ["payment", "fee", "invoice", "compensation", "remunerat", "salary", "cost"],
    "confidentiality": ["confidential", "non-disclosure", "nda", "proprietary", "secret", "privacy"],
    "intellectual_property": ["intellectual property", "copyright", "patent", "trademark", "ip rights"],
    "governing_law": ["governing law", "jurisdiction", "dispute", "arbitration", "court"],
    "obligations": ["shall", "must", "obligat", "required", "duty", "responsible"],
    "warranties": ["warrant", "represent", "guarantee", "assur"],
}

def classify_clause(text: str) -> str:
    text_lower = text.lower()
    for category, keywords in CLAUSE_CATEGORIES.items():
        for kw in keywords:
            if kw in text_lower:
                return category
    return "general"

def extract_text_from_pdf(file_bytes: bytes) -> str:
    if not PDF_AVAILABLE:
        return ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            return "\n\n".join(pages)
    except Exception:
        return ""

def split_into_clauses(text: str) -> List[str]:
    # Split on numbered clauses, section headers, or double newlines
    patterns = [
        r'\n\d+\.\d*\s+',
        r'\n[A-Z][A-Z\s]{3,}\n',
        r'\n\n',
    ]
    clauses = re.split(r'(\n\d+[\.\)]\s+|\n[A-Z][A-Z ]{4,}\n)', text)
    result = []
    for chunk in clauses:
        chunk = chunk.strip()
        if len(chunk) > 60:
            result.append(chunk)
    return result if result else [text]

def build_sections_from_clauses(clauses: List[str]) -> List[Dict[str, Any]]:
    section_map: Dict[str, List[Dict]] = {}
    for clause_text in clauses:
        category = classify_clause(clause_text)
        if category not in section_map:
            section_map[category] = []
        section_map[category].append({
            "id": str(uuid.uuid4()),
            "text": clause_text,
            "category": category,
            "risk_flag": False,
        })

    sections = []
    for cat, clause_list in section_map.items():
        sections.append({
            "title": cat.replace("_", " ").title(),
            "category": cat,
            "clauses": clause_list,
        })
    return sections

async def parse_with_gemini(text: str, filename: str) -> Dict[str, Any]:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""You are a legal document analyzer. Analyze this legal document and return a JSON object.

Document: {filename}

Text (first 8000 chars):
{text[:8000]}

Return ONLY valid JSON in this exact format:
{{
  "document_type": "NDA | Employment Agreement | Service Agreement | Lease | Other",
  "parties": ["Party 1", "Party 2"],
  "summary": "2-3 sentence plain English summary",
  "sections": [
    {{
      "title": "Section Name",
      "category": "liability|termination|payment|confidentiality|obligations|governing_law|general",
      "clauses": [
        {{
          "id": "c1",
          "text": "exact clause text",
          "category": "same as parent section category",
          "risk_flag": true or false
        }}
      ]
    }}
  ],
  "key_clauses": [
    {{
      "label": "Confidentiality",
      "summary": "one line summary",
      "clause_ref": "Clause X"
    }}
  ],
  "total_pages": 1,
  "total_words": 100
}}"""

        response = model.generate_content(prompt)
        raw = response.text.strip()
        # Remove markdown code fences if present
        if raw.startswith("```"):
            raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()

        import json
        result = json.loads(raw)
        return result
    except Exception as e:
        return None

def mock_parse_result(filename: str, text: str) -> Dict[str, Any]:
    clauses = split_into_clauses(text) if text else [
        "The Disclosing Party may disclose certain confidential and proprietary information to the Receiving Party.",
        "The Receiving Party shall hold and maintain the Confidential Information in strict confidence.",
        "This Agreement shall remain in effect for a period of 3 (three) years from the Effective Date.",
        "Either party may terminate this Agreement with 30 days written notice.",
        "The Receiving Party shall be liable for any unauthorized disclosure of Confidential Information.",
        "This Agreement shall be governed by the laws of the State of New York.",
        "The Disclosing Party retains all intellectual property rights in the Confidential Information.",
        "Neither party shall be liable for indirect, incidental, or consequential damages.",
    ]
    sections = build_sections_from_clauses(clauses)
    word_count = len(text.split()) if text else 500

    return {
        "document_type": "Non-Disclosure Agreement",
        "parties": ["Disclosing Party", "Receiving Party"],
        "summary": f"This document ({filename}) is a Non-Disclosure Agreement between two parties. It outlines obligations of confidentiality, permitted disclosures, and the duration of the agreement. The agreement includes standard termination and governing law provisions.",
        "sections": sections,
        "key_clauses": [
            {"label": "Confidentiality", "summary": "Defines what information is considered confidential", "clause_ref": "Clause 1"},
            {"label": "Obligations", "summary": "Receiving party must maintain confidentiality", "clause_ref": "Clause 2"},
            {"label": "Term", "summary": "Confidentiality lasts 3 years from disclosure", "clause_ref": "Clause 3"},
            {"label": "Governing Law", "summary": "Agreement governed by laws of State of New York", "clause_ref": "Clause 4"},
        ],
        "total_pages": max(1, word_count // 300),
        "total_words": word_count,
    }

async def parse_document(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    text = extract_text_from_pdf(file_bytes) if filename.lower().endswith(".pdf") else file_bytes.decode("utf-8", errors="ignore")

    result = None
    if not USE_MOCK and GEMINI_API_KEY:
        result = await parse_with_gemini(text, filename)

    if not result:
        result = mock_parse_result(filename, text)

    result["raw_text"] = text
    result["filename"] = filename
    return result
