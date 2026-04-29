from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.features.parsing.parser import parse_document
from app.features.risk.risk_engine import analyze_risk
from app.features.search.vector_search import embed_document
from app.db.store import save_document, get_document
import uuid

router = APIRouter(prefix="/parse", tags=["parsing"])

@router.post("")
async def parse(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        filename = file.filename or "document.pdf"

        parsed = await parse_document(file_bytes, filename)
        risk = await analyze_risk(parsed)
        parsed["risk_score"] = risk["score"]
        parsed["risk_flags"] = risk["flags"]

        doc_id = str(uuid.uuid4())
        parsed["doc_id"] = doc_id

        # Embed for vector search
        all_clauses = []
        for section in parsed.get("sections", []):
            for clause in section.get("clauses", []):
                all_clauses.append(clause["text"])
        embed_document(doc_id, all_clauses)

        save_document(parsed)

        return {"success": True, "doc_id": doc_id, "data": parsed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{doc_id}")
async def get_parsed(doc_id: str):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"success": True, "data": doc}
