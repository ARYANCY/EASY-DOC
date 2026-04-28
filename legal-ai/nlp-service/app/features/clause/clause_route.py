from fastapi import APIRouter
from pydantic import BaseModel
from app.features.clause.clause_service import extract_clauses

router = APIRouter()


class ClauseRequest(BaseModel):
    document_id: str
    clause_types: list | None = None


@router.post("/")
async def extract_clauses_endpoint(request: ClauseRequest):
    result = await extract_clauses(request.document_id, request.clause_types)
    return result
