import logging
import httpx
from typing import List, Dict, Optional
import json
import asyncio

logger = logging.getLogger(__name__)

# Simple in-memory cache for API responses (TTL can be implemented if needed)
_law_cache = {}

class InsightLawService:
    """Service to interact with the InsightLaw API for Indian Legal Data."""
    
    def __init__(self):
        # In a real scenario, this would be loaded from env vars
        self.base_url = "https://api.insightlaw.example.com/v1"
        self.api_key = "dummy_api_key_replace_me"
        
    async def fetch_laws(self, entities: List[str], jurisdiction: Optional[str] = "India") -> List[Dict]:
        """Fetch laws based on extracted legal entities/keywords."""
        if not entities:
            return []
            
        # Create a cache key based on entities
        cache_key = "|".join(sorted([e.lower() for e in entities]))
        if cache_key in _law_cache:
            logger.info(f"InsightLaw Cache hit for entities: {entities}")
            return _law_cache[cache_key]
            
        # Call the API (mocked for now, but structured for real HTTP call)
        try:
            # Uncomment below for real API call
            # async with httpx.AsyncClient() as client:
            #     response = await client.post(
            #         f"{self.base_url}/search",
            #         headers={"Authorization": f"Bearer {self.api_key}"},
            #         json={"queries": entities, "jurisdiction": jurisdiction},
            #         timeout=10.0
            #     )
            #     response.raise_for_status()
            #     data = response.json()
            #     results = data.get("results", [])
            
            # Simulated API Response based on extracted entities
            await asyncio.sleep(0.5) # Simulate network latency
            
            results = []
            for entity in entities[:5]: # Process top 5 entities
                # Mock logic to generate a valid looking law response
                entity_lower = entity.lower()
                category = "statute"
                importance = "high"
                
                if "vs" in entity_lower or "v." in entity_lower:
                    category = "case_law"
                elif "constitution" in entity_lower:
                    category = "constitutional"
                    
                results.append({
                    "law_name": entity.title() if len(entity) > 5 else f"The {entity.upper()} Act",
                    "section": "Sec 138" if "138" in entity else None,
                    "article": "Art 21" if "constitution" in entity_lower else None,
                    "summary": f"Provisions related to {entity}. This acts as a primary legislative framework in {jurisdiction}.",
                    "relevance_score": 0.95,
                    "link": "https://indiankanoon.org/search/?formInput=" + entity.replace(" ", "+"),
                    "category": category,
                    "importance": importance
                })
                
            # Store in cache
            _law_cache[cache_key] = results
            return results
            
        except Exception as e:
            logger.error(f"InsightLaw API call failed: {e}")
            return [] # Fallback to empty, let LLM handle it if needed
            
def get_insightlaw_service() -> InsightLawService:
    return InsightLawService()
