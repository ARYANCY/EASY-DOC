from app.features.embedding.embedding_service import embed_query
from app.db.faiss_store import search_similar, search_similar_by_document
from app.db.connection import get_db


async def search_documents(query: str, document_id: str | None = None, top_k: int = 5):
    """Search for relevant document chunks."""
    db = get_db()
    
    # Embed the query
    query_embedding = await embed_query(query)
    
    # Search in vector store
    if document_id:
        # Search within specific document
        results = await search_similar_by_document(query_embedding, document_id, k=top_k)
    else:
        # Search across all documents
        results = await search_similar(query_embedding, k=top_k)
    
    # Enrich results with document info
    formatted = []
    for text, score, doc_id in results:
        # Get document info from MongoDB
        doc_info = await db.documents.find_one({"documentId": doc_id})
        
        formatted.append({
            "text": text,
            "score": float(score),
            "documentId": doc_id,
            "filename": doc_info.get("filename", "Unknown") if doc_info else "Unknown",
            "snippet": text[:200] + "..." if len(text) > 200 else text
        })
    
    return formatted
