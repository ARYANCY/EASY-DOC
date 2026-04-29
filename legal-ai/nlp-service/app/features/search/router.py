from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.features.search.vector_search import search

router = APIRouter(prefix="/search", tags=["search"])

class SearchRequest(BaseModel):
    doc_id: str
    query: str
    top_k: int = 5

@router.post("")
async def vector_search(req: SearchRequest):
    try:
        results = search(req.doc_id, req.query, req.top_k)
        return {"success": True, "data": {"results": results}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
