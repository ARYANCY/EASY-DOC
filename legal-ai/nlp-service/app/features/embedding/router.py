from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.features.search.vector_search import embed_document

router = APIRouter(prefix="/embed", tags=["embedding"])

class EmbedRequest(BaseModel):
    doc_id: str
    chunks: list[str]

@router.post("")
async def embed(req: EmbedRequest):
    try:
        embed_document(req.doc_id, req.chunks)
        return {"success": True, "data": {"embedded": len(req.chunks)}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
