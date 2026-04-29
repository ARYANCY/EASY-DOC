import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.core.llm.provider import get_llm_response
from app.core.llm.prompt_builder import PromptBuilder
import json
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter()

class AnalyzeLawsRequest(BaseModel):
    document_id: str
    text: str
    jurisdiction: Optional[str] = None

class LawReference(BaseModel):
    law_name: str
    section: Optional[str] = None
    article: Optional[str] = None
    context: str
    link: str
    importance: str  # high|medium|low
    category: str    # statute|regulation|case_law|constitutional

class AnalyzeLawsResponse(BaseModel):
    success: bool
    document_id: str
    laws: List[LawReference]
    generated_at: str
    cached: bool

@router.post("/analyze", response_model=AnalyzeLawsResponse)
async def analyze_laws(request: AnalyzeLawsRequest):
    """Analyze a legal document and extract relevant laws and statutes."""
    try:
        # Prompt for LLM
        prompt = f"""You are a legal document analysis AI. Extract all legal references from the provided document text.

Instructions:
1. Identify specific laws, statutes, acts, regulations mentioned
2. Note sections, articles, clauses referenced
3. Include brief context (1-2 sentences) from the document
4. Provide official/public legal database links (e.g., indiankanoon.org, law.cornell.edu, legislation.gov.uk)
5. Categorize importance based on document relevance

Output Format - JSON Array:
[
  {{
    "law_name": "Full official name of law/act",
    "section": "Specific section number or name (if mentioned)",
    "article": "Article number (if constitutional)",
    "context": "Exact quote or paraphrase from document",
    "link": "Direct URL to official legal source",
    "importance": "high|medium|low",
    "category": "statute|regulation|case_law|constitutional"
  }}
]

Constraints:
- Only include laws actually mentioned/referenced in text
- Verify links are real legal databases
- Limit to 10 most relevant if many found
- Use null for optional fields not present
- Output ONLY the raw JSON array.

Document Text (excerpt):
{request.text[:8000]}
"""

        if request.jurisdiction:
            prompt += f"\nJurisdiction Context: {request.jurisdiction}"

        # Call LLM
        response_text = await get_llm_response(prompt, temperature=0.3)
        
        # Parse JSON
        import re
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if json_match:
            laws_data = json.loads(json_match.group(0))
        else:
            laws_data = json.loads(response_text)
            
        laws = [LawReference(**law) for law in laws_data]

        return AnalyzeLawsResponse(
            success=True,
            document_id=request.document_id,
            laws=laws,
            generated_at=datetime.now(timezone.utc).isoformat(),
            cached=False
        )

    except Exception as e:
        logger.error(f"Law analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze laws: {str(e)}")
