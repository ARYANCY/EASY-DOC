# Implementation Plan: Full System Audit + RAG/PDF/Dataset/Fallback Upgrade

## Status

Phase 1 only. This file is the requested audit and implementation plan.

No functional code changes are included yet.

---

## 1. Current Architecture Breakdown

### Current runtime shape

- There is no frontend in this repository. All request flow starts at the FastAPI service in `api.py`.
- The backend is a monolith split across:
  - `api.py`: FastAPI routes
  - `main.py`: OCR, parsing, clause extraction, pseudo-RAG, LLM, entities, orchestration
  - `utils.py`: exporters, metrics, batch helper
  - `config.py`: mostly static configuration values
  - `train_classifier.py`: standalone Naive Bayes trainer using `sample_legal_clauses.csv`

### Actual end-to-end flow today

`client -> FastAPI route -> temp file write -> LegalDocumentAnalyzer.analyze_document() -> OCR/text read -> clean/segment -> clause extraction -> in-memory RAG add_documents() -> LLM summary/risk -> entity extraction -> JSON response`

### Important reality checks

- The current "RAG" is not connected to any query route, vector DB, or grounded answer path.
- The system has no persistent document store, no persistent embeddings, and no dataset ingestion pipeline.
- The current LLM layer is Claude/OpenAI only, with no Groq/Gemini fallback.
- The current codebase is not yet aligned with the required routes:
  - Present: `/health`
  - Missing: `/upload-pdf`, `/parse-pdf`, `/train-dataset`, `/query`

---

## 2. Route Map: Current Endpoints and Flow

| Route | Method | Current flow | Status |
|---|---|---|---|
| `/health` | `GET` | Returns config provider + analyzer version from process memory | Connected |
| `/metrics` | `GET` | Returns in-memory counters from `PerformanceMetrics` | Connected but shallow |
| `/analyze` | `POST` | Reads full upload into memory, writes temp file, calls synchronous analyzer, returns ad hoc JSON | Connected but blocking |
| `/analyze/batch` | `POST` | Sequentially reads each file and synchronously analyzes each | Connected but blocking |
| `/compare` | `GET` | Returns "coming soon" message | Stub |
| `/export/{document_id}` | `POST` | Validates format then returns "feature in development" | Stub |
| `/search` | `GET` | Returns "coming soon" message | Stub |
| `/templates` | `GET` | Returns static template list | Connected |
| `/` | `GET` | Returns API metadata | Connected |

### Route trace notes

- `api.py:99-167` wires `/analyze` directly to `analyzer.analyze_document(tmp_path)`.
- `main.py:538-602` performs the full synchronous pipeline.
- `main.py:558-563` adds sentences to the in-memory RAG object, but there is no retrieval call in the request flow.
- `api.py:215-271` contains user-visible routes that return success responses without doing the advertised work.

---

## 3. Audit Findings

### Critical findings

1. Required routes are missing.
   - Missing `/upload-pdf`, `/parse-pdf`, `/train-dataset`, `/query`.
   - Only `/health` from the required set currently exists.

2. Several routes are exposed but not implemented.
   - `/compare`, `/export/{document_id}`, and `/search` return success-style placeholder responses instead of real behavior.
   - This creates broken API surface area and false-positive success responses.

3. Async endpoints are not actually non-blocking.
   - `api.py:99-167` and `api.py:170-212` are `async def` functions that call synchronous CPU-bound and I/O-bound work directly.
   - Blocking operations include:
     - `await file.read()` for entire file payload
     - temp file writes
     - `pdfplumber` parsing
     - spaCy processing
     - `SentenceTransformer.encode(...)`
     - LLM network calls
   - This can stall the event loop and cause hanging or slow concurrent requests.

4. The current RAG implementation is disconnected from answering.
   - `main.py:306-332` stores embeddings in memory only.
   - `retrieve_relevant_context()` is never used in the analysis path.
   - No vector DB, no persistent corpus, no query endpoint, no citation pipeline.

5. Global mutable analyzer state can leak across requests.
   - `api.py:41` creates one process-global `LegalDocumentAnalyzer`.
   - `main.py:558-559` mutates `self.rag.documents` and `self.rag.embeddings` on each request.
   - This is unsafe under concurrent traffic and can cross-contaminate context.

6. Section parsing is effectively broken by preprocessing order.
   - `main.py:165-171` uses `' '.join(text.split())`, which removes newlines.
   - `main.py:173-201` then tries to split on `\n` and detect uppercase section headers.
   - Because line structure was already flattened, section detection and page heuristics are largely invalid.

7. Error handling converts user and validation errors into server errors.
   - In `/analyze`, a raised `HTTPException` is caught by the broad `except Exception` block and re-raised as status `500`.
   - Example: oversized upload at `api.py:111-115` becomes a generic `500` through `api.py:164-167`.

8. Temp files are not cleaned up reliably on failures.
   - `Path(tmp_path).unlink()` is only reached on success in `/analyze` and per-file success in `/analyze/batch`.
   - Failed processing can leave temp files behind.

9. The local environment is not ready to run the service as-is.
   - `python -m py_compile ...` passed, so syntax is valid.
   - Runtime import checks failed in the current shell:
     - `api.py` import failed because `fastapi` is unavailable.
     - `main.py` import failed because `pytesseract` is unavailable.
   - `pytest` is also unavailable from the current default Python environment.

10. File upload support is incomplete at dependency level.
   - `requirements.txt` does not include `python-multipart`, which FastAPI file uploads depend on.

### High-severity findings

1. File handling reads the entire upload into memory.
   - `api.py:110` and `api.py:184` call `await file.read()` for full payloads.
   - This is a poor fit for large PDFs and batch uploads.

2. File type validation is not strict.
   - Routes do not enforce MIME type or extension allowlists before processing.
   - `UploadFile.filename` is trusted for suffix handling.

3. Supported-format logic is inconsistent.
   - `config.py:96-100` lists text formats.
   - `OCRProcessor.supported_formats` in `main.py:106` excludes `.txt` and `.md`.
   - Text files work only through a fallback path after logging an unsupported-format error.

4. PDF parsing has no true OCR fallback for scanned PDFs.
   - `main.py:119-134` uses `pdfplumber` text extraction only.
   - If extraction is empty, the code falls back to reading the binary PDF as UTF-8 text through `_read_text_file()`, which is not meaningful.

5. Timeout settings exist but are not enforced.
   - `config.py:45`, `config.py:119-120` define OCR/request/LLM timeout values.
   - The values are not passed to OCR, embedding, vector query, or LLM operations.

6. LLM integration has no production retry/fallback policy.
   - `main.py:342-477` supports Claude/OpenAI only.
   - No sequential key rotation, no retry policy, no response validation, no provider fallback chain.

7. API key handling is weak.
   - If Anthropic/OpenAI libraries are installed, clients are created even when keys are blank.
   - Failure happens late at request time instead of startup validation or health degradation.

8. Response schemas are inconsistent and mostly unenforced.
   - `AnalysisRequest` and `AnalysisResponse` are defined but not used by `/analyze`.
   - Actual `/analyze` output contains fields not described in `AnalysisResponse`.

9. Export configuration is inconsistent.
   - `api.py:241` says export supports `json, csv, html`.
   - `config.py:64` allows `json, csv, pdf`.
   - `utils.py` implements HTML export, but `/export` is not connected.

10. Results are not persisted.
   - There is no document registry keyed by `document_id`.
   - This makes compare/export/query impossible to implement on top of current state without new storage.

11. `train_classifier.py` is disconnected from the serving path.
   - The trained `clause_classifier.joblib` is not used by `main.py` or `api.py`.
   - There is no dataset ingestion/training workflow for RAG data.

### Medium-severity findings

1. CORS is too permissive and internally inconsistent.
   - `allow_origins=["*"]` with `allow_credentials=True` is not a safe production configuration.

2. Health check is shallow.
   - `/health` does not verify model readiness, parser availability, vector DB connectivity, or provider availability.

3. Metrics are in-memory and process-local.
   - They reset on restart and are not concurrency-aware.

4. `config.py` is only partially env-driven.
   - `.env.example` advertises many env settings, but `config.py` hardcodes several important values instead of parsing env input.

5. Documentation drift exists.
   - Several docs describe production-ready behaviors that are not actually wired in the code.

---

## 4. Timeout and Latency Analysis

### Current timeout status

| Area | Current state | Problem |
|---|---|---|
| API request timeout | Config value exists (`REQUEST_TIMEOUT=300`) but is unused | Requests can run indefinitely from application perspective |
| LLM timeout | Config value exists (`LLM_TIMEOUT=60`) but is unused | Long hangs or slow provider failure |
| PDF parsing timeout | No enforcement | Large/scanned PDFs can monopolize worker time |
| Embedding latency | No batching strategy, no timeout, no background queue | Large documents can block API response |
| Vector query latency | No vector DB yet | No retrieval SLA possible |

### Required solution direction

1. Keep interactive API calls under 10-15 seconds.
2. Move heavy work to background execution when it cannot fit the SLA.
3. Enforce timeouts at every external or heavy boundary.
4. Separate preview parsing from full ingestion/training.

### Proposed timeout strategy

| Operation | Target | Plan |
|---|---|---|
| `/health` | `< 200ms` | Lightweight dependency snapshot + optional deep health variant |
| `/upload-pdf` | `< 2s` | Validate, checksum, store, return file ID |
| `/parse-pdf` preview | `<= 15s` | Threadpool offload + page/text caps + timeout guard |
| `/query` | `<= 15s` | Timeout retrieval + timeout LLM + fallback path |
| `/train-dataset` | Background only | Return job ID immediately |
| Embedding batches | Tuned per provider | Batch chunk embeddings; do not embed one chunk at a time |
| Chroma retrieval | `< 500ms target` | Persistent collection + precomputed embeddings + tuned `top_k` |

### Mechanisms to introduce

- `asyncio.timeout()` or equivalent request-level guards
- `fastapi.concurrency.run_in_threadpool()` or `anyio.to_thread.run_sync()` for CPU/blocking work
- background job orchestration for training and full-corpus ingestion
- provider-specific HTTP/client timeouts
- structured retries with bounded backoff

---

## 5. Current vs Target Route Design

### Keep or adapt existing routes

- Keep `/health`
- Keep `/analyze` temporarily as a compatibility route
- Keep `/metrics` if useful for local ops
- Deprecate or re-implement `/compare`, `/export`, `/search` after persistence exists

### Required new routes

1. `POST /upload-pdf`
   - strict PDF validation
   - file size limit 10-20 MB configurable
   - checksum + storage
   - returns `file_id`, metadata, and next-step info

2. `POST /parse-pdf`
   - input: `file_id` or direct upload decision to be finalized during implementation
   - extracts text
   - returns parsed preview, page count, chunk count estimate, warnings
   - should not block indefinitely

3. `POST /train-dataset`
   - kicks off dataset ingestion from `datasets/`
   - runs as background job
   - returns job status object

4. `POST /query`
   - embeds query
   - retrieves chunks from Chroma
   - builds grounded prompt
   - invokes Groq -> Gemini fallback system
   - returns answer + citations + provider metadata

5. `GET /health`
   - retain, but expand to include dependency readiness flags

### Standardized response shape

All new routes should return a consistent envelope:

```json
{
  "status": "success|error",
  "message": "human readable summary",
  "data": {},
  "error": null,
  "request_id": "uuid"
}
```

Error responses should use one schema everywhere and preserve intended HTTP status codes.

---

## 6. PDF Upload + Parsing Design

### Proposed flow

1. Client uploads PDF to `/upload-pdf`.
2. Server validates:
   - content type
   - extension
   - size limit
   - non-empty filename
3. Server stores file in controlled upload storage with checksum-based naming.
4. Server returns `file_id`.
5. Client or server triggers `/parse-pdf`.
6. Parser extracts text using:
   - primary: PyMuPDF for speed and reliable PDF text/page access
   - fallback: `pdfplumber` if PyMuPDF parsing is problematic
   - optional OCR path for image-only pages in a later step if needed
7. Clean and normalize text while preserving page boundaries.
8. Chunk into `300-800` token windows with overlap.
9. Return preview:
   - first pages/snippets
   - total pages
   - total extracted characters
   - estimated chunk count
   - warnings for empty/image-only pages

### Non-blocking and safety rules

- Strict size limit: default `15 MB`, configurable within the requested `10-20 MB` band
- Parse preview under timeout; background heavy work if file is large
- Never read entire upload into memory if avoidable
- Clean temp storage in `finally`
- Preserve metadata:
  - filename
  - hash
  - upload timestamp
  - page numbers

### Important parser correction

The new parser must preserve structure before sectioning.

The current order in `main.py:550-553` is not reusable because `clean_text()` currently destroys line structure before segmentation.

---

## 7. Dataset Ingestion Design

### Required folder

- `datasets/`
- Empty initially
- User-managed source folder for `pdf`, `txt`, and `json`

### Required script

- `train.py`

### `train.py` responsibilities

1. Scan `datasets/` recursively or top-level only based on final implementation choice.
2. Support:
   - `.pdf`
   - `.txt`
   - `.json`
3. Parse source content into normalized text.
4. Chunk text with shared chunking utility.
5. Generate embeddings using Gemini.
6. Upsert embeddings into Chroma.
7. Log progress, successes, skips, and failures.
8. Be idempotent.

### Idempotency strategy

- Compute a file hash for each input file.
- Store ingestion metadata:
  - `source_path`
  - `file_hash`
  - `last_modified`
  - `chunk_count`
  - `embedded_at`
- Use deterministic chunk IDs such as:
  - `{file_hash}:{page_or_section}:{chunk_index}:{chunk_hash}`
- Skip unchanged chunks on reruns.

### Dataset parsing rules

- `pdf`: extract by page
- `txt`: read as UTF-8 with graceful decode handling
- `json`: configurable field extraction; default to joining string-like fields or known keys

---

## 8. RAG Pipeline Integration Plan

### Current state

- No persistent retrieval layer
- No grounded prompt assembly
- No query route
- No citations

### Target query flow

1. Receive user query at `/query`.
2. Embed query using the same Gemini embedding family used for documents.
3. Query Chroma for `top_k` chunks with metadata.
4. Build strict grounded prompt:
   - answer only from retrieved context
   - say when context is insufficient
   - cite chunk/page/source references
5. Call LLM fallback layer.
6. Validate answer format.
7. Return:
   - answer
   - citations
   - model/provider used
   - retrieval stats

### Prompting rules

- No ungrounded legal claims when context is missing
- Force "insufficient context" behavior
- Include source metadata for citation rendering
- Keep prompt size bounded with truncation strategy

### Suggested query response

```json
{
  "status": "success",
  "data": {
    "answer": "...",
    "citations": [
      {
        "source": "contract_a.pdf",
        "page": 3,
        "chunk_id": "abc:3:5",
        "snippet": "..."
      }
    ],
    "provider": "groq",
    "model": "configured-model",
    "top_k": 4,
    "latency_ms": 912
  }
}
```

---

## 9. Vector DB Integration Plan

### Target store

- Chroma persistent collection

### What will be stored

- chunk text
- embedding vector
- metadata:
  - `source_path`
  - `source_type`
  - `file_hash`
  - `chunk_id`
  - `page`
  - `section_title`
  - `created_at`

### Collection strategy

- One default collection for general corpus, for example `legal_corpus`
- Optional future separation by tenant, matter, or document set

### Performance goals

- persistent local path in repo-controlled data directory
- batched upserts
- retrieval target `< 500 ms`
- top_k default `4-6`

### Missing dependency work

`requirements.txt` must be extended post-approval to include Chroma and the selected Gemini/Groq SDKs.

---

## 10. Groq -> Gemini Fallback Design

### Required logic

1. Try Groq keys sequentially.
2. Retry each key up to `2` times.
3. On repeated failure, switch to Gemini keys.
4. Validate output before returning it.

### Proposed provider abstraction

Create a provider interface with one entrypoint such as:

- `generate_answer(prompt, timeout_seconds) -> LLMResult`

### Provider manager behavior

- Maintain ordered provider chain:
  - Groq primary
  - Gemini secondary
- Maintain key pools per provider
- Retry on:
  - timeout
  - rate limit
  - transport failure
  - empty/invalid output
- Stop on:
  - valid answer
  - exhausted provider chain

### Response validation

- non-empty text
- not just whitespace
- optional JSON/schema validity if structured response mode is used
- if citations are required, verify citation fields are present

### Operational metadata to return/log

- provider attempted
- key index or key alias
- retry count
- failure reason
- total latency

---

## 11. Folder Structure Changes

### Proposed target structure

```text
app/
  api/
    routes/
      health.py
      ingest.py
      train.py
      query.py
    schemas/
      common.py
      ingest.py
      train.py
      query.py
  core/
    config.py
    logging.py
    errors.py
  services/
    pdf_parser.py
    text_cleaner.py
    chunker.py
    embedding_service.py
    chroma_store.py
    rag_service.py
    llm_fallback.py
    dataset_trainer.py
  models/
    documents.py
    jobs.py
  workers/
    jobs.py
  storage/
    uploads/
    parsed/
    chroma/
datasets/
tests/
  test_routes.py
  test_pdf_pipeline.py
  test_train.py
  test_query.py
train.py
```

### Compatibility approach

- Keep current files intact initially.
- Add new modules beside them.
- Move route logic incrementally.
- Preserve existing `/analyze` path until the new stack is stable.

---

## 12. Fix Plan by Issue

| Issue | Fix plan |
|---|---|
| Missing required routes | Add `/upload-pdf`, `/parse-pdf`, `/train-dataset`, `/query`, preserve `/health` |
| Blocking async endpoints | Offload sync work to threadpool, background-job heavy tasks |
| Stub routes returning success | Re-implement or explicitly mark deprecated until backed by persistence |
| In-memory pseudo-RAG | Replace with shared chunking + Gemini embeddings + Chroma persistence |
| Cross-request mutable RAG state | Remove request-shared mutable corpus from singleton analyzer |
| Broken section parsing | Redesign cleaner to preserve page/line boundaries before segmentation |
| No file type validation | Add strict MIME/extension validation and file-size guardrails |
| Full-file memory reads | Stream upload to disk in chunks where possible |
| No timeout enforcement | Add request, parse, embedding, vector, and LLM timeouts |
| No provider fallback | Implement Groq sequential retry + Gemini fallback manager |
| No persistence for compare/export/query | Add storage layer for uploaded files, parsed chunks, and vector collection |
| Schema inconsistency | Add Pydantic request/response models and standardized error envelope |
| Temp file leakage | Use `try/finally` cleanup paths |
| Incomplete dependencies | Add missing upload/vector/provider packages post-approval |
| Weak health endpoint | Add deep-readiness fields for embeddings/vector DB/providers |
| Unused training path | Replace `train_classifier.py` role with `train.py` ingestion pipeline; keep old script only if explicitly needed |

---

## 13. Execution Order

1. Stabilize environment and dependencies.
2. Introduce modular app structure without deleting current code.
3. Add shared config, logging, error-envelope, and request ID plumbing.
4. Build PDF storage + validation service.
5. Build parsing service with safe preview response.
6. Build text cleaning + chunking utilities.
7. Add Chroma integration and ingestion metadata registry.
8. Implement Gemini embedding service with batching.
9. Implement `train.py` for `datasets/` ingestion.
10. Add `/train-dataset` job route.
11. Implement Groq -> Gemini fallback manager.
12. Implement `/query` with grounded prompt + citations.
13. Upgrade `/health` to include readiness checks.
14. Refactor `/analyze` to use the new internals or leave as compatibility wrapper.
15. Revisit `/compare`, `/export`, and `/search` after persistence exists.
16. Add tests for each new route and for timeout/failure scenarios.
17. Run repeated verification passes before final handoff.

---

## 14. Testing and Verification Plan

### Minimum required test coverage

1. Route tests
   - `/health`
   - `/upload-pdf`
   - `/parse-pdf`
   - `/train-dataset`
   - `/query`

2. PDF tests
   - valid PDF
   - oversized PDF
   - wrong MIME type
   - scanned/image-only PDF behavior
   - empty PDF behavior

3. Dataset tests
   - pdf/txt/json ingestion
   - duplicate rerun skip behavior
   - partial failure logging

4. RAG tests
   - retrieval returns expected chunk
   - insufficient-context response path
   - citation formatting

5. Fallback tests
   - Groq success on first key
   - Groq key rotation
   - Groq exhausted -> Gemini success
   - invalid response retry

6. Timeout tests
   - slow parser timeout
   - slow LLM timeout
   - vector query timeout/failure handling

### Current verification blockers

- The current default environment cannot import required runtime packages.
- `pytest` was not available from the current shell.
- Runtime dependency installation/setup will need to be completed before meaningful execution testing.

---

## 15. Risks and Mitigation

### Risk: large PDFs exceed latency budget

Mitigation:
- hard size limit
- preview parsing only in request path
- background ingestion for full processing

### Risk: provider instability or rate limiting

Mitigation:
- sequential key rotation
- bounded retries
- Gemini fallback
- clear provider telemetry

### Risk: duplicate embeddings and storage bloat

Mitigation:
- file hash + chunk hash based upsert strategy
- ingestion registry

### Risk: concurrency bugs from shared mutable state

Mitigation:
- remove mutable request corpus from global singleton
- keep services stateless where possible

### Risk: hanging requests

Mitigation:
- enforce 10-15s route timeout budget
- move heavy jobs off request path
- threadpool blocking work

### Risk: route/schema drift

Mitigation:
- strict Pydantic schemas
- documented response envelope
- route-level tests

### Risk: breaking current codebase

Mitigation:
- additive refactor first
- keep legacy route compatibility during transition
- change internals behind thin adapters

---

## 16. Immediate Post-Approval Deliverables

After approval, the implementation phase should produce:

1. `datasets/` folder
2. `train.py`
3. PDF upload/parsing routes
4. Chroma-backed RAG pipeline
5. Groq -> Gemini fallback layer
6. timeout/error-handling fixes
7. test coverage for all required routes and failure modes

---

## 17. Recommended First Build Slice

To minimize breakage, the first implementation slice should be:

1. shared config + error envelope
2. upload validation/storage
3. parse preview route
4. chunking utility
5. Chroma integration
6. `train.py`
7. `/query`

This gives the new ingestion/RAG path without immediately tearing apart the legacy analyzer.

