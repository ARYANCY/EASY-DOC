from fastapi import APIRouter, UploadFile, File, HTTPException
from app.features.parsing.parsing_service import parse_document
from app.features.embedding.embedding_service import embed_and_store
from app.features.parsing.async_parsing_service import get_async_parsing_service
import uuid
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Async (non-blocking) endpoints  — preferred for large PDFs
# ---------------------------------------------------------------------------

@router.post("/upload-pdf")
async def upload_pdf_async(file: UploadFile = File(...)):
    """Upload a PDF for async background processing.

    Returns a job_id immediately. Client polls /status/{job_id} for progress.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    contents = await file.read()

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    if len(contents) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 20MB limit")

    # Save to disk for background processing
    os.makedirs("uploads", exist_ok=True)
    temp_id = str(uuid.uuid4())
    file_path = f"uploads/{temp_id}.pdf"
    with open(file_path, "wb") as f:
        f.write(contents)

    # Queue for async processing
    svc = get_async_parsing_service()
    job_id = await svc.start_parsing(file_path, file.filename)

    return {
        "success": True,
        "job_id": job_id,
        "status": "processing",
        "message": "PDF uploaded and queued for processing",
    }


@router.get("/status/{job_id}")
async def get_parse_status(job_id: str):
    """Poll the status of an async parsing job."""
    svc = get_async_parsing_service()
    status = await svc.get_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status


# ---------------------------------------------------------------------------
# Synchronous (blocking) endpoint  — kept for backward compatibility
# ---------------------------------------------------------------------------

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """Upload and parse PDF with parallel processing (synchronous)."""
    try:
        # Validate file
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        if len(content) > 20 * 1024 * 1024:  # 20MB limit (unified)
            raise HTTPException(status_code=400, detail="File size exceeds 20MB limit")
        
        logger.info(f"Processing upload: {file.filename} ({len(content)} bytes)")
        
        # Parse document (with parallel OCR if needed)
        result = await parse_document(content, file.filename)
        
        if not result or not result.get("text"):
            logger.warning(f"No text extracted from {file.filename}")
        
        # Generate document ID (Node.js will store in MongoDB)
        doc_id = str(uuid.uuid4())
        
        # Store embeddings in vector DB only (not in MongoDB - Node.js handles that)
        try:
            await embed_and_store(doc_id, result.get("chunks", []))
            logger.info(f"Embeddings stored for {file.filename}")
        except Exception as embed_error:
            logger.warning(f"Failed to store embeddings: {embed_error}")
        
        logger.info(f"Successfully processed {file.filename} -> {doc_id}")
        
        # Return full result for Node.js to store
        return {
            "document_id": doc_id,
            "filename": file.filename,
            "document_type": result.get("document_type", "unknown"),
            "chunk_count": result.get("chunk_count", 0),
            "text_length": len(result.get("text", "")),
            "text": result.get("text", ""),
            "chunks": result.get("chunks", []),
            "total_pages": result.get("total_pages", 0),
            "page_count": result.get("page_count", 0),
            "confidence": result.get("confidence", 0),
            "metadata": result.get("metadata", {})
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed for {file.filename}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
