# Deep System Audit and Feature Integration Plan

This plan addresses the full system audit, pipeline validation, and the implementation of the three requested features: InsightLaw Integration, Vector Analysis Upgrade, and LLM Prompt Hardening.

## Current Architecture Overview & Data Flow
Recent commits have established the following flow:
1. **Client (React)**: Handles file uploads and UI interactions.
2. **Node.js Gateway (Express + MongoDB)**:
   - Receives PDF uploads (`/api/upload`).
   - Forwards to Python NLP Service via `pythonClient.js`.
   - Stores metadata in MongoDB (`Upload` and `Document` collections).
3. **Python NLP Service (FastAPI + ChromaDB)**:
   - Parses PDFs (now includes `async_parsing_service.py`).
   - Embeds chunks and stores them in ChromaDB (`vector_db.py`).
   - Performs RAG via `search_service.py` and connects to the LLM (Gemini/Grok).
   - *Note*: A `laws_route.py` now exists, but currently uses the LLM to extract laws instead of the required InsightLaw API.

**Validated End-to-End Flow**:
UPLOAD (Node) → VALIDATION (Node/Python) → PARSE (Python) → CHUNK (Python) → EMBED (Python) → STORE (ChromaDB) → RETRIEVE (Python) → ANALYZE (LLM) → RESPOND.

## Identified Issues & Bugs

1. **Timeout Vulnerability**: `callParser` in `pythonClient.js` has a hardcoded 15s timeout. While an async `/parse/upload-pdf` route exists, the synchronous route is still the default in `handleUpload`. This will crash on large PDFs.
2. **Scoring Inaccuracy**: ChromaDB currently returns `1 - (distance / 2)` as the score in `search_service.py`. It lacks keyword and contextual weighting, which can lead to hallucinated or weak matches.
3. **Prompt Leakage**: `PromptBuilder.py` uses basic instructions. Without strict guardrails or context truncation, irrelevant chunks can confuse the LLM.
4. **Duplicate Chunk Storage**: If an upload is retried or parsed twice without cleanup, ChromaDB will accumulate duplicate vectors for the same text.

## Proposed Architecture Changes & Feature Integration Plan

### 1. InsightLaw API Integration
- **Service**: We will modify the recently added `nlp-service/app/features/laws/laws_route.py` (or create `insightlaw_service.py`) to call the InsightLaw API instead of just using the LLM. The LLM can still be used to extract the keywords/entities to pass to InsightLaw.
- **Mapping Logic**: Extract legal entities (e.g., "Section 138", "NDPS Act") during parsing/analysis, and query the InsightLaw API.
- **UI Addition**: Add an "Applicable Laws" tab to the frontend document viewer (or update the existing Clauses/Laws panel).
- **Resilience**: Implement Redis/In-memory caching for API responses. Keep the current LLM extraction as a graceful fallback if the InsightLaw API is unavailable.

### 2. Vector Analysis Upgrade
- **Hybrid Scoring Implementation** (`nlp-service/app/features/search/search_service.py`):
  - Over-fetch from ChromaDB (e.g., fetch top 15) and apply re-ranking.
  - **Formula**: `final_score = (0.6 * cosine) + (0.3 * keyword_match) + (0.1 * chunk_position_weight)`
  - **Keyword Match**: Simple term frequency overlap between the query and the retrieved chunks.
  - **Context Weight**: Chunks appearing earlier in a section get a slight boost.
- **Threshold Filtering**: Drop all chunks with `final_score < 0.55` before they hit the LLM.
- **Batch Embeddings**: Update `embed_and_store` in `embedding_service.py` to chunk insertions into batches of 32 for optimal memory usage.

### 3. LLM Prompt Hardening
- **Context Guard Layer**: In `chat_service.py`, if no search results pass the 0.55 threshold, bypass the LLM and return `"Not found in document"`.
- **Prompt Templates**: Rewrite `PromptBuilder` to enforce strict grounding:
  - *"Only answer from provided context."*
  - *"If answer not found → respond: 'Not found in document'."*
  - *"Do not hallucinate or infer beyond text."*
  - *"Cite chunk references in response."*
- **Context Truncation**: Enforce a strict token limit on the context injected into the prompt to prevent context window overflow.
