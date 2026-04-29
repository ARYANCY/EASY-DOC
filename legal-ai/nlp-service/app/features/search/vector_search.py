import math
from typing import Dict, List, Tuple
from collections import defaultdict

# In-memory vector store: doc_id -> list of (chunk_text, tfidf_vector)
_store: Dict[str, List[Tuple[str, Dict[str, float]]]] = {}

def tokenize(text: str) -> List[str]:
    import re
    return re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())

def compute_tf(tokens: List[str]) -> Dict[str, float]:
    freq = defaultdict(int)
    for t in tokens:
        freq[t] += 1
    total = len(tokens) or 1
    return {t: count / total for t, count in freq.items()}

def embed_document(doc_id: str, chunks: List[str]):
    """Store TF vectors for each chunk."""
    vectors = []
    for chunk in chunks:
        tokens = tokenize(chunk)
        tf = compute_tf(tokens)
        vectors.append((chunk, tf))
    _store[doc_id] = vectors

def cosine_similarity(v1: Dict[str, float], v2: Dict[str, float]) -> float:
    keys = set(v1) & set(v2)
    if not keys:
        return 0.0
    dot = sum(v1[k] * v2[k] for k in keys)
    mag1 = math.sqrt(sum(x**2 for x in v1.values()))
    mag2 = math.sqrt(sum(x**2 for x in v2.values()))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)

def search(doc_id: str, query: str, top_k: int = 5) -> List[str]:
    """Return top-k relevant chunks for a query."""
    if doc_id not in _store:
        return []
    query_tokens = tokenize(query)
    query_tf = compute_tf(query_tokens)
    scored = []
    for chunk_text, chunk_tf in _store[doc_id]:
        score = cosine_similarity(query_tf, chunk_tf)
        scored.append((score, chunk_text))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in scored[:top_k] if _ > 0]
