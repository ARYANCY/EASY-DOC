from fastapi import APIRouter, UploadFile, File
from app.features.parsing.parsing_service import parse_document
from app.features.embedding.embedding_service import embed_and_store
from app.db.connection import get_db
import uuid
import asyncio

router = APIRouter()


@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """Upload and parse PDF with parallel processing."""
    content = await file.read()
    
    # Parse document (with parallel OCR if needed)
    result = await parse_document(content, file.filename)
    
    # Store in MongoDB
    db = get_db()
    document_id = str(uuid.uuid4())
    
    # Run DB insert and embedding in parallel
    db_task = db.documents.insert_one({
        "document_id": document_id,
        "filename": file.filename,
        "text": result["text"],
        "chunks": result["chunks"],
        "document_type": result["document_type"],
        "chunk_count": result["chunk_count"]
    })
    
    embed_task = embed_and_store(document_id, result["chunks"])
    
    # Wait for both to complete
    await asyncio.gather(db_task, embed_task)
    
    return {
        "document_id": document_id,
        "filename": file.filename,
        "document_type": result["document_type"],
        "chunk_count": result["chunk_count"]
    }
