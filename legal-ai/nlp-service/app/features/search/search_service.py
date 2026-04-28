from app.features.embedding.embedding_service import embed_query
from app.db.faiss_store import search_similar


async def search_documents(query: str, document_id: str | None = None, top_k: int = 5):
    """Search for relevant document chunks."""
    # Embed the query
    query_embedding = await embed_query(query)
    
    # Search in vector store
    results = await search_similar(query_embedding, k=top_k)
    
    # Format results
    formatted = [
        {"text": text, "score": float(score)}
        for text, score in results
    ]
    
    return formatted
