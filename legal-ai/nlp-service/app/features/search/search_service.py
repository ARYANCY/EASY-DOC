from app.core.embeddings import get_embedding_service
from app.core.vector_db import get_vector_db
from app.db.connection import get_db

async def search_documents(query: str, document_id: str | None = None, top_k: int = 5):
    """Search for relevant document chunks using ChromaDB."""
    db = get_db()
    
    # Embed the query
    embedding_svc = get_embedding_service()
    query_embedding = await embedding_svc.encode_query(query)
    
    # Search in vector store
    vector_db = get_vector_db()
    where_filter = {"document_id": document_id} if document_id else None
    
    results = vector_db.search(query_embedding, top_k=top_k, where_filter=where_filter)
    
    # Enrich results with document info from MongoDB
    formatted = []
    for r in results:
        doc_id = r["metadata"].get("document_id")
        text = r["text"]
        
        # Get document info from MongoDB
        doc_info = await db.documents.find_one({"documentId": doc_id}) if doc_id else None
        
        formatted.append({
            "text": text,
            "score": r["score"],
            "documentId": doc_id,
            "filename": doc_info.get("filename", "Unknown") if doc_info else "Unknown",
            "snippet": text[:200] + "..." if len(text) > 200 else text
        })
    
    return formatted
