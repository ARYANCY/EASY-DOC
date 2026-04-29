import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer

from app.db.faiss_store import add_embeddings

model = SentenceTransformer('all-MiniLM-L6-v2')
_executor = ThreadPoolExecutor(max_workers=4)


def _encode_texts(texts: List[str]) -> List[List[float]]:
    """Encode texts using sentence transformer (CPU-bound)."""
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings.tolist()


def _encode_query(query: str) -> List[float]:
    """Encode single query."""
    embedding = model.encode([query], convert_to_numpy=True)
    return embedding[0].tolist()


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed texts in parallel batches for faster processing."""
    loop = asyncio.get_event_loop()
    
    # Process in batches of 32 for optimal performance
    batch_size = 32
    batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]
    
    # Process batches in parallel
    tasks = [loop.run_in_executor(_executor, _encode_texts, batch) for batch in batches]
    results = await asyncio.gather(*tasks)
    
    # Flatten results
    all_embeddings = []
    for batch_result in results:
        all_embeddings.extend(batch_result)
    return all_embeddings


async def embed_query(query: str) -> List[float]:
    """Embed a single query."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _encode_query, query)


async def store_embeddings(document_id: str, texts: List[str], embeddings: List[List[float]]):
    """Store embeddings in vector database."""
    await add_embeddings(document_id, texts, embeddings)


async def embed_and_store(document_id: str, texts: List[str]) -> dict:
    """Embed texts and store them (convenience function)."""
    embeddings = await embed_texts(texts)
    await store_embeddings(document_id, texts, embeddings)
    return {"document_id": document_id, "chunks": len(texts)}
