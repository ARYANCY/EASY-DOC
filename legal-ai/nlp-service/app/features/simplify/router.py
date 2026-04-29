from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.features.simplify.simplifier import simplify_text
from app.db.store import get_document

router = APIRouter(prefix="/simplify", tags=["simplify"])

class SimplifyRequest(BaseModel):
    text: str = ""
    doc_id: str = ""

@router.post("")
async def simplify(req: SimplifyRequest):
    try:
        if req.doc_id and not req.text:
            doc = get_document(req.doc_id)
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
            # Simplify all clauses
            sections = doc.get("sections", [])
            simplified_sections = []
            for section in sections:
                simplified_clauses = []
                for clause in section.get("clauses", []):
                    simplified = await simplify_text(clause["text"])
                    simplified_clauses.append({**clause, "simplified": simplified})
                simplified_sections.append({**section, "clauses": simplified_clauses})
            return {"success": True, "data": {"sections": simplified_sections}}

        simplified = await simplify_text(req.text)
        return {"success": True, "data": {"simplified": simplified}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
