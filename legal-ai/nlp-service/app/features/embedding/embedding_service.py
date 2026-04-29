from typing import List
from app.core.embeddings import get_embedding_service
from app.core.vector_db import get_vector_db

async def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed texts using the core embedding service."""
    svc = get_embedding_service()
    return await svc.encode(texts)

async def embed_query(query: str) -> List[float]:
    """Embed a single query."""
    svc = get_embedding_service()
    return await svc.encode_query(query)

async def store_embeddings(document_id: str, texts: List[str], embeddings: List[List[float]]):
    """Store embeddings in vector database."""
    db = get_vector_db()
    ids = [f"{document_id}_{i}" for i in range(len(texts))]
    metadatas = [
        {"document_id": document_id, "chunk_index": i}
        for i in range(len(texts))
    ]
    db.add_documents(texts, embeddings, ids, metadatas)

async def embed_and_store(document_id: str, texts: List[str]) -> dict:
    """Embed texts and store them (convenience function)."""
    embeddings = await embed_texts(texts)
    await store_embeddings(document_id, texts, embeddings)
    return {"document_id": document_id, "chunks": len(texts)}
