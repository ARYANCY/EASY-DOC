import uuid
from typing import Dict, Any, Optional
from app.core.config import MONGODB_URI

# In-memory store as fallback
_documents: Dict[str, Any] = {}

def save_document(doc: dict) -> str:
    doc_id = doc.get("doc_id") or str(uuid.uuid4())
    doc["doc_id"] = doc_id
    _documents[doc_id] = doc
    return doc_id

def get_document(doc_id: str) -> Optional[dict]:
    return _documents.get(doc_id)

def list_documents() -> list:
    return list(_documents.values())

def delete_document(doc_id: str) -> bool:
    if doc_id in _documents:
        del _documents[doc_id]
        return True
    return False
