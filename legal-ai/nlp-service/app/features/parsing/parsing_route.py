from fastapi import APIRouter, UploadFile, File, HTTPException
from app.features.parsing.parsing_service import parse_document
from app.features.embedding.embedding_service import embed_and_store
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """Upload and parse PDF with parallel processing."""
    try:
        # Validate file
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        if len(content) > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(status_code=400, detail="File too large. Max 50MB")
        
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
