import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.core.llm.provider import get_llm_response
from app.core.llm.prompt_builder import PromptBuilder
import json
from datetime import datetime, timezone
from app.features.laws.insightlaw_service import get_insightlaw_service

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
    importance: str 
    category: str    
    relevance_score: Optional[float] = None 
class AnalyzeLawsResponse(BaseModel):
    success: bool
    document_id: str
    laws: List[LawReference]
    generated_at: str
    cached: bool
    source: str 

@router.post("/analyze", response_model=AnalyzeLawsResponse)
async def analyze_laws(request: AnalyzeLawsRequest):
    """Analyze a legal document and extract relevant laws and statutes using InsightLaw API."""
    try:
        extract_prompt = f"""Extract a JSON list of the top 5 most important legal entities (acts, statutes, sections, cases) EXPLICITLY mentioned in this text.
        CRITICAL: ONLY extract entities that are directly written in the text. Do NOT guess or infer applicable laws.
        If NO laws or legal entities are explicitly mentioned, output an empty JSON array: []
        Output ONLY a valid JSON array of strings. Example: ["Section 138 Negotiable Instruments Act", "NDPS Act", "Kesavananda Bharati case"]
        Text (excerpt):
        {request.text[:8000]}
        """
        response_text = await get_llm_response(extract_prompt, temperature=0.1)
        
        entities = []
        try:
            import re
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                entities = json.loads(json_match.group(0))
            else:
                entities = json.loads(response_text)
        except Exception as e:
            logger.warning(f"Failed to parse entities JSON: {e}. Falling back to full LLM analysis.")
            
        # Step 2: Query InsightLaw API with extracted entities
        insightlaw_service = get_insightlaw_service()
        laws_data = []
        source = "insightlaw_api"
        
        if entities:
            api_results = await insightlaw_service.fetch_laws(entities, request.jurisdiction)
            for res in api_results:
                laws_data.append(LawReference(
                    law_name=res.get("law_name", ""),
                    section=res.get("section"),
                    article=res.get("article"),
                    context=res.get("summary", "Extracted from InsightLaw Database."),
                    link=res.get("link", ""),
                    importance=res.get("importance", "medium"),
                    category=res.get("category", "statute"),
                    relevance_score=res.get("relevance_score", 0.9)
                ))
                
        # Step 3: Fallback to detailed LLM analysis if API returns empty
        if not laws_data:
            source = "llm_fallback"
            prompt = f"""You are a legal document analysis AI. Extract all legal references EXPLICITLY mentioned in the provided document text.
            CRITICAL: ONLY extract laws, acts, statutes, or cases that are directly written in the text. Do NOT infer or guess any laws that are not explicitly stated.
            If NO laws or legal entities are explicitly mentioned, return an empty JSON array: []
            Output Format - JSON Array:
            [{{ "law_name": "...", "section": "...", "article": "...", "context": "...", "link": "...", "importance": "high|medium|low", "category": "statute|regulation|case_law|constitutional" }}]
            Constraints: Only output raw JSON array. Keep to 5 most relevant laws.
            Document Text (excerpt):
            {request.text[:8000]}
            """
            llm_response = await get_llm_response(prompt, temperature=0.3)
            
            try:
                json_match = re.search(r'\[.*\]', llm_response, re.DOTALL)
                fallback_data = json.loads(json_match.group(0)) if json_match else json.loads(llm_response)
                laws_data = [LawReference(**law) for law in fallback_data]
            except Exception as parse_e:
                logger.error(f"Fallback parsing failed: {parse_e}")
                laws_data = []

        return AnalyzeLawsResponse(
            success=True,
            document_id=request.document_id,
            laws=laws_data,
            generated_at=datetime.now(timezone.utc).isoformat(),
            cached=False,
            source=source
        )

    except Exception as e:
        logger.error(f"Law analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to analyze laws: {str(e)}")
