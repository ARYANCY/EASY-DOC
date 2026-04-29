from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.features.chat.chat_handler import handle_chat

router = APIRouter(prefix="/chat", tags=["chat"])

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    doc_id: str
    query: str
    history: Optional[List[Message]] = []

@router.post("")
async def chat(req: ChatRequest):
    try:
        history = [m.dict() for m in (req.history or [])]
        answer = await handle_chat(req.doc_id, req.query, history)
        return {"success": True, "data": {"answer": answer}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
