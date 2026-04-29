from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.features.risk.risk_engine import analyze_risk
from app.db.store import get_document

router = APIRouter(prefix="/risk", tags=["risk"])

class RiskRequest(BaseModel):
    doc_id: str

@router.post("")
async def get_risk(req: RiskRequest):
    doc = get_document(req.doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    result = await analyze_risk(doc)
    return {"success": True, "data": result}

@router.get("/{doc_id}")
async def get_risk_by_id(doc_id: str):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    result = {
        "score": doc.get("risk_score", 0),
        "flags": doc.get("risk_flags", []),
    }
    return {"success": True, "data": result}
