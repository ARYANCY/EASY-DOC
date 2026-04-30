# Legal AI Platform - Implementation Plan

## Document Status: PHASE 1 COMPLETE - PENDING APPROVAL

**Generated**: April 2026  
**Purpose**: Full system audit + RAG integration roadmap  
**Constraint**: ⛔ DO NOT IMPLEMENT until user approval  

---

## Executive Summary

This document provides a comprehensive audit of the current Legal AI codebase and a detailed implementation plan for:
- RAG (Retrieval Augmented Generation) pipeline integration
- PDF ingestion and parsing pipeline
- Dataset training pipeline (with empty `datasets/` folder)
- Multi-LLM fallback system (Groq → Gemini)
- Performance optimizations and timeout fixes
- Production-grade reliability improvements

---

## 1. Current Architecture Breakdown

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  Next.js 14 + React 18 + Tailwind CSS + TypeScript                         │
│  ├── timeout: 30s (axiosInstance.ts)                                        │
│  └── Token-based auth (JWT stored in localStorage)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTP REST API
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NODE.JS API SERVER (Port 5000)                        │
│  Express.js + MongoDB (Mongoose)                                            │
│                                                                             │
│  Services:                                                                  │
│  ├── pythonClient.js → FastAPI bridge (timeout: 120s-180s)                 │
│  ├── Upload service (disk storage)                                         │
│  └── Document service (CRUD + file serving)                                │
│                                                                             │
│  Routes:                                                                    │
│  ├── POST /upload          → Upload PDF                                    │
│  ├── GET  /documents       → List documents                                │
│  ├── GET  /documents/:id   → Get document                                 │
│  ├── GET  /documents/:id/file → Serve PDF file                            │
│  ├── POST /chat            → Chat with document                           │
│  ├── POST /risk            → Risk analysis                                │
│  ├── POST /simplify        → Text simplification                          │
│  ├── POST /search          → Document search                               │
│  └── POST /clause          → Clause extraction                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTP / FormData
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PYTHON NLP SERVICE (Port 8000)                         │
│  FastAPI + Uvicorn + asyncio                                                │
│                                                                             │
│  Features:                                                                  │
│  ├── /parse/     → PDF text extraction (pdfplumber + OCR)                  │
│  ├── /chat/      → RAG chat with document                                  │
│  ├── /risk/      → Risk analysis                                           │
│  ├── /simplify/  → Text simplification                                     │
│  ├── /search/    → Vector similarity search                                │
│  ├── /clause/    → Clause extraction                                      │
│  ├── /embedding/ → Generate & store embeddings                             │
│  └── /health/    → Service health check (MISSING)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ API Calls
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                                   │
│  ├── Groq API      (Primary LLM)                                           │
│  ├── Gemini API    (Fallback LLM)                                         │
│  ├── MongoDB       (Document metadata)                                     │
│  └── ChromaDB      (Vector DB - needs verification)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Current Route Map

#### Node.js Server Routes (server/features/)

| Route | Method | Handler | Issues |
|-------|--------|---------|--------|
| `/upload` | POST | upload.route.js | ✅ Uses disk storage |
| `/documents` | GET | document.route.js | ✅ Working |
| `/documents/:id` | GET | document.route.js | ✅ Working |
| `/documents/:id/file` | GET | document.route.js | ✅ Serves PDF files |
| `/chat` | POST | chat.route.js | ⚠️ Calls Python service |
| `/risk` | POST | risk.route.js | ⚠️ Calls Python service |
| `/simplify` | POST | simplify.route.js | ⚠️ Calls Python service |
| `/search` | POST | search.route.js | ⚠️ Calls Python service |
| `/clause` | POST | clause.route.js | ⚠️ Calls Python service |
| `/health` | GET | ❌ MISSING | 🔴 No health check endpoint |

#### Python NLP Service Routes (nlp-service/app/features/)

| Route | Method | Handler | Status |
|-------|--------|---------|--------|
| `/parse/` | POST | parsing/parsing_route.py | ✅ Working |
| `/chat/` | POST | chat/chat_route.py | ✅ Working |
| `/risk/` | POST | risk/risk_route.py | ✅ Working |
| `/simplify/` | POST | simplify/simplify_route.py | ✅ Working |
| `/search/` | POST | search/search_route.py | ✅ RAG working |
| `/clause/` | POST | clause/clause_route.py | ✅ Working |
| `/embedding/` | POST | embedding/embedding_route.py | ✅ Working |
| `/health` | GET | ❌ MISSING | 🔴 No health check |

---

## 2. Identified Bugs & Issues

### 🔴 CRITICAL Issues

#### 2.1 Missing Health Check Endpoint
**Issue**: No `/health` route on either server  
**Impact**: Cannot verify service status, load balancers fail  
**Fix**: Add health check routes to both services

#### 2.2 Timeout Mismatch
**Issue**: Client timeout (30s) < Server timeout (120s) < PDF parsing timeout (180s)  
**Impact**: Client gives up before server responds  
**Fix**: Implement progressive timeouts + async processing

```
Current:  Client: 30s → Server: 120s → PDF: 180s  [MISMATCH]
Target:   Client: 15s → Server: 15s → PDF: async  [CORRECT]
```

#### 2.3 No Request Timeout Protection
**Issue**: Routes can hang indefinitely if LLM API fails  
**Impact**: Memory leaks, blocked connections  
**Fix**: Add AbortController/timeout to all LLM calls

#### 2.4 Missing Dataset Pipeline
**Issue**: No `datasets/` folder or training script  
**Impact**: Cannot batch-train on custom data  
**Fix**: Create datasets folder + train.py script

### 🟡 MEDIUM Issues

#### 2.5 Incomplete RAG Pipeline
**Issue**: RAG exists but lacks query endpoint with full context  
**Impact**: Cannot query across all documents  
**Fix**: Create `/query` endpoint with full RAG flow

#### 2.6 No File Size Validation on Dataset Upload
**Issue**: No limits on dataset file sizes  
**Impact**: Memory exhaustion with large files  
**Fix**: Add 20MB file size limit

#### 2.7 Error Handling Inconsistency
**Issue**: Some routes return plain text, others JSON  
**Impact**: Client parsing failures  
**Fix**: Standardize all error responses

#### 2.8 Vector DB Using FAISS (File-based)
**Issue**: Current FAISS is file-based, not persistent/scalable  
**Impact**: Data loss on restart, no concurrency  
**Fix**: Migrate to ChromaDB with persistence

### 🟢 LOW Issues

#### 2.9 No Request Logging
**Issue**: No structured logging of requests/responses  
**Impact**: Difficult debugging  
**Fix**: Add request logging middleware

#### 2.10 Missing CORS Configuration Review
**Issue**: CORS is basic, may need origin restrictions  
**Impact**: Security concern  
**Fix**: Review and tighten CORS settings

---

## 3. Fix Plan for Each Issue

### 3.1 Add Health Check Endpoints

**Priority**: 🔴 CRITICAL  
**Effort**: 30 minutes  
**Implementation**:

```python
# nlp-service/app/main.py - Add:
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "nlp-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
```

```javascript
// server/app.js - Add:
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'api-server',
        timestamp: new Date().toISOString()
    });
});
```

### 3.2 Fix Timeout Configuration

**Priority**: 🔴 CRITICAL  
**Effort**: 1 hour  
**Implementation**:

```typescript
// client/lib/axiosInstance.ts
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 15000, // ⬇️ Reduced from 30000
  headers: {
    'Content-Type': 'application/json',
  },
});
```

```javascript
// server/core/services/pythonClient.js
const pythonApi = axios.create({
  baseURL: config.fastApiUrl,
  timeout: 15000, // ⬇️ Reduced from 120000
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 3.3 Implement Async PDF Processing

**Priority**: 🔴 CRITICAL  
**Effort**: 4 hours  
**Implementation**:

```python
# New: nlp-service/app/features/parsing/async_parsing_service.py
import asyncio
from typing import Optional
import uuid

class AsyncParsingService:
    def __init__(self):
        self.jobs = {}  # In-memory job store (use Redis in production)
    
    async def start_parsing(self, file_path: str) -> str:
        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {"status": "processing", "result": None}
        
        # Start background task
        asyncio.create_task(self._process_pdf(job_id, file_path))
        return job_id
    
    async def _process_pdf(self, job_id: str, file_path: str):
        try:
            # Actual parsing logic here
            result = await self._extract_text(file_path)
            self.jobs[job_id] = {"status": "completed", "result": result}
        except Exception as e:
            self.jobs[job_id] = {"status": "failed", "error": str(e)}
    
    async def get_status(self, job_id: str) -> Optional[dict]:
        return self.jobs.get(job_id)
```

### 3.4 Add LLM Timeout Protection

**Priority**: 🔴 CRITICAL  
**Effort**: 2 hours  
**Implementation**:

```python
# nlp-service/app/core/llm/provider.py - Add timeout wrapper:
import asyncio
from typing import Optional

async def call_llm_with_timeout(prompt: str, timeout: float = 10.0) -> Optional[str]:
    try:
        return await asyncio.wait_for(
            get_llm_response(prompt),
            timeout=timeout
        )
    except asyncio.TimeoutError:
        logger.error(f"LLM call timed out after {timeout}s")
        return None
```

---

## 4. PDF Upload + Parsing Design

### 4.1 Flow Architecture

```
User Upload
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 1. VALIDATE                                              │
│    ├── File type: PDF only                               │
│    ├── File size: ≤ 20MB                                │
│    └── Virus scan (optional)                             │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 2. STORE                                                 │
│    ├── Save to uploads/ with UUID filename               │
│    └── Return file_path                                  │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 3. QUEUE FOR PARSING                                     │
│    ├── Create async job                                  │
│    ├── Return job_id immediately (non-blocking)        │
│    └── Status: "processing"                              │
└──────────────────────────────────────────────────────────┘
    │
    ▼ Background Processing
┌──────────────────────────────────────────────────────────┐
│ 4. PARSE (Background)                                    │
│    ├── pdfplumber extract text                           │
│    ├── OCR if needed (pytesseract)                       │
│    ├── Clean + normalize                                 │
│    └── Chunk into 512 tokens                             │
└──────────────────────────────────────────────────────────┘
    │
    ▼ Parallel
┌──────────────────────────────────────────────────────────┐
│ 5. EMBED (Background)                                    │
│    ├── Generate embeddings (batch)                       │
│    └── Store in ChromaDB                                 │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 6. COMPLETE                                              │
│    ├── Status: "completed"                               │
│    ├── Return preview (first 1000 chars)                 │
│    └── Notify client (WebSocket or polling)              │
└──────────────────────────────────────────────────────────┘
```

### 4.2 API Endpoints

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/upload-pdf` | POST | Upload PDF file | `{ job_id, status: "processing" }` |
| `/parse-pdf/:job_id` | GET | Check parsing status | `{ status, result?\|error? }` |
| `/parse-pdf/:job_id/preview` | GET | Get text preview | `{ preview: "first 1000 chars" }` |

### 4.3 Request/Response Schema

```typescript
// POST /upload-pdf Request
interface UploadPDFRequest {
    file: File;  // multipart/form-data
}

// POST /upload-pdf Response
interface UploadPDFResponse {
    success: boolean;
    job_id: string;
    status: "processing" | "completed" | "failed";
    message: string;
}

// GET /parse-pdf/:job_id Response
interface ParseStatusResponse {
    job_id: string;
    status: "processing" | "completed" | "failed";
    progress?: number;  // 0-100
    result?: {
        document_id: string;
        filename: string;
        total_pages: number;
        text_length: number;
        chunk_count: number;
    };
    error?: string;
    created_at: string;
    completed_at?: string;
}
```

### 4.4 Implementation Code

```python
# nlp-service/app/features/parsing/parsing_route.py
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import uuid
import os
from typing import Optional

router = APIRouter()
parsing_service = AsyncParsingService()

@router.post("/upload-pdf")
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    # Validation
    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "Only PDF files allowed")
    
    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:  # 20MB
        raise HTTPException(400, "File size exceeds 20MB limit")
    
    # Save file
    job_id = str(uuid.uuid4())
    file_path = f"uploads/{job_id}.pdf"
    os.makedirs("uploads", exist_ok=True)
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Queue for processing
    await parsing_service.start_parsing(job_id, file_path)
    
    return {
        "success": True,
        "job_id": job_id,
        "status": "processing",
        "message": "PDF uploaded and queued for processing"
    }

@router.get("/parse-pdf/{job_id}")
async def get_parse_status(job_id: str):
    status = await parsing_service.get_status(job_id)
    if not status:
        raise HTTPException(404, "Job not found")
    return status
```

---

## 5. Dataset Ingestion Design

### 5.1 Folder Structure

```
datasets/
├── README.md           # Instructions for adding data
├── .gitignore         # Ignore processed files
└── raw/               # User drops files here
    ├── contracts/
    ├── legal_docs/
    └── case_law/
```

### 5.2 Dataset Pipeline Flow

```
datasets/raw/
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 1. DISCOVER                                              │
│    ├── Scan all subdirectories                           │
│    └── Supported: .pdf, .txt, .json, .docx              │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 2. PARSE                                                 │
│    ├── PDF: pdfplumber                                   │
│    ├── TXT: direct read                                  │
│    ├── JSON: extract text field                          │
│    └── DOCX: python-docx                                 │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 3. CLEAN                                                 │
│    ├── Remove noise (headers/footers)                    │
│    ├── Normalize whitespace                              │
│    └── Fix encoding issues                               │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 4. CHUNK                                                 │
│    ├── Size: 512 tokens                                  │
│    ├── Overlap: 50 tokens                                │
│    └── Metadata: source, page, section                     │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 5. EMBED                                                 │
│    ├── Batch size: 32                                    │
│    ├── Model: sentence-transformers                      │
│    └── Check for existing (idempotent)                   │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 6. STORE                                                 │
│    ├── ChromaDB collection                               │
│    └── Metadata indexing                                 │
└──────────────────────────────────────────────────────────┘
    │
    ▼
Log results: processed, failed, skipped (duplicates)
```

### 5.3 train.py Implementation

```python
# train.py
import os
import json
import logging
from pathlib import Path
from typing import List, Dict
import asyncio
from tqdm import tqdm

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('datasets/training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Supported file types
SUPPORTED_EXTENSIONS = {'.pdf', '.txt', '.json', '.docx'}

class DatasetTrainer:
    def __init__(self, dataset_path: str = "datasets/raw"):
        self.dataset_path = Path(dataset_path)
        self.processed_log = Path("datasets/processed.json")
        self.stats = {
            "total_files": 0,
            "processed": 0,
            "failed": 0,
            "skipped": 0,
            "chunks_created": 0
        }
        
    def load_processed_hashes(self) -> set:
        """Load already processed file hashes for idempotency."""
        if self.processed_log.exists():
            with open(self.processed_log) as f:
                data = json.load(f)
                return set(data.get("hashes", []))
        return set()
    
    def save_processed_hash(self, file_hash: str):
        """Save processed file hash."""
        hashes = self.load_processed_hashes()
        hashes.add(file_hash)
        with open(self.processed_log, 'w') as f:
            json.dump({"hashes": list(hashes)}, f)
    
    def discover_files(self) -> List[Path]:
        """Discover all supported files in dataset folder."""
        files = []
        for ext in SUPPORTED_EXTENSIONS:
            files.extend(self.dataset_path.rglob(f"*{ext}"))
        return files
    
    async def parse_file(self, file_path: Path) -> str:
        """Parse file based on extension."""
        ext = file_path.suffix.lower()
        
        if ext == '.pdf':
            return await self._parse_pdf(file_path)
        elif ext == '.txt':
            return await self._parse_txt(file_path)
        elif ext == '.json':
            return await self._parse_json(file_path)
        elif ext == '.docx':
            return await self._parse_docx(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    
    async def _parse_pdf(self, path: Path) -> str:
        """Parse PDF using pdfplumber."""
        import pdfplumber
        text = ""
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    
    async def _parse_txt(self, path: Path) -> str:
        """Parse plain text file."""
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    
    async def _parse_json(self, path: Path) -> str:
        """Parse JSON and extract text field."""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Try common text fields
            for field in ['text', 'content', 'document', 'body']:
                if field in data:
                    return data[field]
            return json.dumps(data)
    
    async def _parse_docx(self, path: Path) -> str:
        """Parse DOCX file."""
        from docx import Document
        doc = Document(path)
        return "\n".join([para.text for para in doc.paragraphs])
    
    def chunk_text(self, text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks."""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = words[i:i + chunk_size]
            chunks.append(" ".join(chunk))
            
            if i + chunk_size >= len(words):
                break
        
        return chunks
    
    async def generate_embeddings(self, chunks: List[str]) -> List[List[float]]:
        """Generate embeddings for chunks."""
        from sentence_transformers import SentenceTransformer
        
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Process in batches
        batch_size = 32
        all_embeddings = []
        
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            embeddings = model.encode(batch, show_progress_bar=False)
            all_embeddings.extend(embeddings.tolist())
        
        return all_embeddings
    
    async def store_in_chroma(self, chunks: List[str], embeddings: List[List[float]], 
                               source: str, metadata: Dict):
        """Store embeddings in ChromaDB."""
        import chromadb
        from chromadb.config import Settings
        
        client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory="./chroma_db"
        ))
        
        collection = client.get_or_create_collection(
            name="legal_documents",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Add to collection
        ids = [f"{source}_{i}" for i in range(len(chunks))]
        metadatas = [{"source": source, **metadata, "chunk_index": i} 
                    for i in range(len(chunks))]
        
        collection.add(
            embeddings=embeddings,
            documents=chunks,
            ids=ids,
            metadatas=metadatas
        )
    
    async def process_file(self, file_path: Path, processed_hashes: set):
        """Process a single file through the pipeline."""
        import hashlib
        
        # Calculate hash for idempotency
        with open(file_path, 'rb') as f:
            file_hash = hashlib.md5(f.read()).hexdigest()
        
        if file_hash in processed_hashes:
            logger.info(f"Skipping {file_path} (already processed)")
            self.stats["skipped"] += 1
            return
        
        try:
            logger.info(f"Processing {file_path}")
            
            # Step 1: Parse
            text = await self.parse_file(file_path)
            if not text.strip():
                logger.warning(f"No text extracted from {file_path}")
                self.stats["failed"] += 1
                return
            
            # Step 2: Clean
            text = self.clean_text(text)
            
            # Step 3: Chunk
            chunks = self.chunk_text(text)
            self.stats["chunks_created"] += len(chunks)
            
            # Step 4: Embed
            embeddings = await self.generate_embeddings(chunks)
            
            # Step 5: Store
            await self.store_in_chroma(
                chunks, embeddings, 
                source=str(file_path),
                metadata={
                    "filename": file_path.name,
                    "type": file_path.suffix,
                    "size": os.path.getsize(file_path)
                }
            )
            
            # Mark as processed
            self.save_processed_hash(file_hash)
            self.stats["processed"] += 1
            logger.info(f"✓ Successfully processed {file_path} ({len(chunks)} chunks)")
            
        except Exception as e:
            logger.error(f"✗ Failed to process {file_path}: {str(e)}")
            self.stats["failed"] += 1
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        import re
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep legal symbols
        text = re.sub(r'[^\w\s.,;:!?()\-\'/"§]', '', text)
        
        return text.strip()
    
    async def train(self):
        """Main training pipeline."""
        logger.info("=" * 60)
        logger.info("Starting Dataset Training Pipeline")
        logger.info("=" * 60)
        
        # Discover files
        files = self.discover_files()
        self.stats["total_files"] = len(files)
        logger.info(f"Found {len(files)} files to process")
        
        if not files:
            logger.warning("No files found in datasets/raw/")
            return
        
        # Load processed hashes for idempotency
        processed_hashes = self.load_processed_hashes()
        logger.info(f"Found {len(processed_hashes)} already processed files")
        
        # Process files
        for file_path in tqdm(files, desc="Processing files"):
            await self.process_file(file_path, processed_hashes)
        
        # Print summary
        logger.info("=" * 60)
        logger.info("Training Complete")
        logger.info("=" * 60)
        logger.info(f"Total files: {self.stats['total_files']}")
        logger.info(f"Processed: {self.stats['processed']}")
        logger.info(f"Failed: {self.stats['failed']}")
        logger.info(f"Skipped (duplicates): {self.stats['skipped']}")
        logger.info(f"Total chunks created: {self.stats['chunks_created']}")

async def main():
    trainer = DatasetTrainer()
    await trainer.train()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 6. RAG Pipeline Integration Plan

### 6.1 RAG Query Flow

```
User Query
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 1. EMBED QUERY                                           │
│    ├── Convert to vector (same model as documents)       │
│    └── Shape: (1, 384) or (1, 768)                       │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 2. RETRIEVE                                              │
│    ├── Vector similarity search (cosine)                 │
│    ├── Top-k = 5 chunks                                  │
│    └── Filter: threshold > 0.7                           │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 3. RERANK (Optional)                                     │
│    ├── Cross-encoder scoring                             │
│    └── Select top 3 most relevant                        │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 4. CONSTRUCT PROMPT                                      │
│    ├── System prompt (legal assistant context)           │
│    ├── Retrieved context (chunks with citations)          │
│    └── User query                                          │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 5. GENERATE RESPONSE                                     │
│    ├── Call LLM (Groq → Gemini fallback)                 │
│    ├── Timeout: 10s max                                   │
│    └── Stream response (optional)                          │
└──────────────────────────────────────────────────────────┘
    │
    ▼
Response + Source Citations
```

### 6.2 RAG Prompt Template

```python
RAG_SYSTEM_PROMPT = """You are a legal document analysis assistant. Your task is to answer questions based on the provided legal document context.

Instructions:
1. Answer ONLY using the provided context below
2. If the answer is not in the context, say "I cannot find this information in the provided documents"
3. Cite the source document when providing information (use [Source: filename])
4. Be concise but complete
5. Use legal terminology appropriately

Context:
{context}

Question: {question}

Answer:"""
```

### 6.3 RAG API Endpoint

```python
# nlp-service/app/features/rag/rag_route.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class RAGQueryRequest(BaseModel):
    query: str
    document_id: Optional[str] = None  # Optional: restrict to specific doc
    top_k: int = 5
    include_citations: bool = True

class RAGSource(BaseModel):
    document_id: str
    filename: str
    chunk_index: int
    text: str
    score: float

class RAGQueryResponse(BaseModel):
    answer: str
    sources: List[RAGSource]
    query_time_ms: float
    model_used: str  # groq or gemini

@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(request: RAGQueryRequest):
    start_time = time.time()
    
    try:
        # 1. Embed query
        query_embedding = await embed_query(request.query)
        
        # 2. Retrieve relevant chunks
        results = await search_documents(
            query_embedding, 
            document_id=request.document_id,
            top_k=request.top_k
        )
        
        if not results:
            return RAGQueryResponse(
                answer="I could not find relevant information in the documents.",
                sources=[],
                query_time_ms=(time.time() - start_time) * 1000,
                model_used="none"
            )
        
        # 3. Construct context
        context = "\n\n".join([
            f"[Source: {r['filename']}]\n{r['text']}" 
            for r in results
        ])
        
        # 4. Generate prompt
        prompt = RAG_SYSTEM_PROMPT.format(
            context=context,
            question=request.query
        )
        
        # 5. Call LLM with fallback
        answer, model_used = await llm_with_fallback(prompt, timeout=10.0)
        
        query_time = (time.time() - start_time) * 1000
        
        return RAGQueryResponse(
            answer=answer,
            sources=[RAGSource(**r) for r in results] if request.include_citations else [],
            query_time_ms=query_time,
            model_used=model_used
        )
        
    except Exception as e:
        logger.error(f"RAG query failed: {str(e)}")
        raise HTTPException(500, f"Query processing failed: {str(e)}")
```

---

## 7. Vector DB Integration Plan

### 7.1 ChromaDB Configuration

```python
# nlp-service/app/core/vector_db.py
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Optional

class VectorDB:
    def __init__(self, persist_dir: str = "./chroma_db"):
        self.client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=persist_dir
        ))
        self.collection = self.client.get_or_create_collection(
            name="legal_documents",
            metadata={"hnsw:space": "cosine"}
        )
    
    async def add_documents(
        self, 
        documents: List[str], 
        embeddings: List[List[float]],
        ids: List[str],
        metadatas: Optional[List[Dict]] = None
    ):
        """Add documents with embeddings."""
        self.collection.add(
            embeddings=embeddings,
            documents=documents,
            ids=ids,
            metadatas=metadatas
        )
    
    async def search(
        self, 
        query_embedding: List[float], 
        top_k: int = 5,
        threshold: float = 0.7,
        where_filter: Optional[Dict] = None
    ) -> List[Dict]:
        """Search for similar documents."""
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter
        )
        
        # Format results
        formatted = []
        for i in range(len(results['ids'][0])):
            score = results['distances'][0][i]
            if score >= threshold:
                formatted.append({
                    'id': results['ids'][0][i],
                    'text': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'score': score
                })
        
        return formatted
    
    async def delete_document(self, document_id: str):
        """Delete all chunks for a document."""
        self.collection.delete(
            where={"document_id": document_id}
        )
```

### 7.2 Embedding Service

```python
# nlp-service/app/core/embeddings.py
from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np

class EmbeddingService:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)
        self.dimension = 384  # all-MiniLM-L6-v2
    
    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """Generate embeddings for texts."""
        return self.model.encode(
            texts, 
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True
        )
    
    def encode_query(self, text: str) -> List[float]:
        """Generate embedding for single query."""
        return self.model.encode(text).tolist()

# Singleton instance
embedding_service = EmbeddingService()
```

---

## 8. Multi-LLM Fallback System (Groq → Gemini)

### 8.1 Fallback Architecture

```
Request
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 1. TRY GROQ KEYS (Round Robin)                             │
│    ├── Key 1: Attempt 1                                    │
│    ├── Key 1: Attempt 2 (retry)                          │
│    ├── Key 2: Attempt 1                                    │
│    └── ...                                                 │
│    All failed? → Continue                                   │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 2. TRY GEMINI KEYS (Round Robin)                           │
│    ├── Key 1: Attempt 1                                    │
│    ├── Key 1: Attempt 2 (retry)                          │
│    └── ...                                                 │
│    All failed? → Continue                                   │
└──────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 3. FALLBACK RESPONSE                                       │
│    "Unable to generate response. Please try again later."  │
└──────────────────────────────────────────────────────────┘
```

### 8.2 Implementation

```python
# nlp-service/app/core/llm/fallback_provider.py
import os
import asyncio
from typing import List, Tuple, Optional
from tenacity import retry, stop_after_attempt, wait_exponential
import groq
import google.generativeai as genai

class MultiLLMProvider:
    def __init__(self):
        # Load multiple API keys (comma-separated)
        self.groq_keys = [k.strip() for k in os.getenv("GROQ_API_KEY", "").split(",") if k.strip()]
        self.gemini_keys = [k.strip() for k in os.getenv("GEMINI_API_KEY", "").split(",") if k.strip()]
        
        self.groq_index = 0
        self.gemini_index = 0
        
        self.timeout = 10.0  # seconds
    
    def _get_next_groq_key(self) -> str:
        key = self.groq_keys[self.groq_index % len(self.groq_keys)]
        self.groq_index += 1
        return key
    
    def _get_next_gemini_key(self) -> str:
        key = self.gemini_keys[self.gemini_index % len(self.gemini_keys)]
        self.gemini_index += 1
        return key
    
    async def _call_groq(self, prompt: str, api_key: str) -> str:
        """Call Groq API with timeout."""
        client = groq.Groq(api_key=api_key)
        
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Fastest model
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
            temperature=0.7
        )
        
        return completion.choices[0].message.content
    
    async def _call_gemini(self, prompt: str, api_key: str) -> str:
        """Call Gemini API with timeout."""
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        response = model.generate_content(prompt)
        return response.text
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def _try_groq_with_key(self, prompt: str, api_key: str) -> Optional[str]:
        """Try Groq with a specific key."""
        try:
            return await asyncio.wait_for(
                self._call_groq(prompt, api_key),
                timeout=self.timeout
            )
        except asyncio.TimeoutError:
            logger.warning(f"Groq key timeout")
            return None
        except Exception as e:
            logger.warning(f"Groq key failed: {str(e)}")
            return None
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
    async def _try_gemini_with_key(self, prompt: str, api_key: str) -> Optional[str]:
        """Try Gemini with a specific key."""
        try:
            return await asyncio.wait_for(
                self._call_gemini(prompt, api_key),
                timeout=self.timeout
            )
        except asyncio.TimeoutError:
            logger.warning(f"Gemini key timeout")
            return None
        except Exception as e:
            logger.warning(f"Gemini key failed: {str(e)}")
            return None
    
    async def generate(self, prompt: str) -> Tuple[str, str]:
        """
        Generate response with fallback.
        Returns: (response_text, model_used)
        """
        # Try all Groq keys
        for i in range(len(self.groq_keys)):
            key = self._get_next_groq_key()
            logger.info(f"Trying Groq key {i+1}/{len(self.groq_keys)}")
            
            result = await self._try_groq_with_key(prompt, key)
            if result:
                return result, "groq"
        
        # Try all Gemini keys
        for i in range(len(self.gemini_keys)):
            key = self._get_next_gemini_key()
            logger.info(f"Trying Gemini key {i+1}/{len(self.gemini_keys)}")
            
            result = await self._try_gemini_with_key(prompt, key)
            if result:
                return result, "gemini"
        
        # All providers failed
        logger.error("All LLM providers failed")
        return (
            "Unable to generate response. All AI providers are currently unavailable. "
            "Please try again later.",
            "none"
        )

# Singleton
llm_provider = MultiLLMProvider()
```

---

## 9. Folder Structure Changes

### 9.1 New Folder Structure

```
legal-ai/
├── client/                    # Existing (no changes)
│
├── server/                    # Existing + minor updates
│   ├── app.js                # Add health route
│   └── core/
│       └── services/
│           └── pythonClient.js  # Reduce timeout to 15s
│
├── nlp-service/              # Major updates
│   ├── app/
│   │   ├── main.py           # Add health route, RAG router
│   │   ├── core/
│   │   │   ├── llm/
│   │   │   │   └── fallback_provider.py  # NEW
│   │   │   ├── vector_db.py             # NEW
│   │   │   └── embeddings.py              # NEW
│   │   └── features/
│   │       └── rag/
│   │           ├── rag_route.py          # NEW
│   │           └── rag_service.py        # NEW
│   └── datasets/              # NEW (empty initially)
│       ├── raw/               # User drops files here
│       ├── README.md          # Instructions
│       └── .gitignore         # Ignore processed files
│
└── implementation_plan.md     # This document
```

---

## 10. Execution Order (Step-by-Step)

### Phase 1: Foundation (Critical)

| Step | Task | Duration | Priority |
|------|------|----------|----------|
| 1.1 | Add `/health` endpoints to both services | 30 min | 🔴 |
| 1.2 | Fix timeout configurations (15s max) | 30 min | 🔴 |
| 1.3 | Create `datasets/` folder structure | 15 min | 🔴 |
| 1.4 | Create empty `train.py` skeleton | 15 min | 🔴 |
| 1.5 | Create `uploads/` folder with .gitignore | 15 min | 🔴 |

**Phase 1 Total: ~2 hours**

### Phase 2: Core Pipeline (Critical)

| Step | Task | Duration | Priority |
|------|------|----------|----------|
| 2.1 | Implement async PDF parsing service | 2 hours | 🔴 |
| 2.2 | Create `/upload-pdf` endpoint | 1 hour | 🔴 |
| 2.3 | Create `/parse-pdf/{job_id}` endpoint | 1 hour | 🔴 |
| 2.4 | Add file size validation (20MB) | 30 min | 🔴 |
| 2.5 | Add file type validation | 30 min | 🔴 |

**Phase 2 Total: ~5 hours**

### Phase 3: Vector DB & Embeddings (Critical)

| Step | Task | Duration | Priority |
|------|------|----------|----------|
| 3.1 | Implement ChromaDB vector service | 2 hours | 🔴 |
| 3.2 | Implement embedding service | 1.5 hours | 🔴 |
| 3.3 | Integrate embedding generation in PDF parsing | 1 hour | 🔴 |
| 3.4 | Test vector search functionality | 1 hour | 🔴 |

**Phase 3 Total: ~5.5 hours**

### Phase 4: RAG Pipeline (Critical)

| Step | Task | Duration | Priority |
|------|------|----------|----------|
| 4.1 | Create RAG query endpoint | 2 hours | 🔴 |
| 4.2 | Implement prompt templates | 1 hour | 🔴 |
| 4.3 | Integrate with LLM fallback | 1 hour | 🔴 |
| 4.4 | Add source citations | 1 hour | 🟡 |
| 4.5 | Test end-to-end RAG flow | 1 hour | 🔴 |

**Phase 4 Total: ~6 hours**

### Phase 5: Multi-LLM Fallback (Critical)

| Step | Task | Duration | Priority |
|------|------|----------|----------|
| 5.1 | Implement MultiLLMProvider class | 2 hours | 🔴 |
| 5.2 | Add round-robin key management | 1 hour | 🔴 |
| 5.3 | Add retry logic with tenacity | 1 hour | 🔴 |
| 5.4 | Replace existing LLM calls with fallback | 1 hour | 🔴 |
| 5.5 | Test fallback scenarios | 1 hour | 🔴 |

**Phase 5 Total: ~6 hours**

### Phase 6: Dataset Training (Medium)

| Step | Task | Duration | Priority |
|------|------|----------|----------|
| 6.1 | Complete `train.py` implementation | 3 hours | 🟡 |
| 6.2 | Add batch processing | 1.5 hours | 🟡 |
| 6.3 | Add idempotency (hash tracking) | 1 hour | 🟡 |
| 6.4 | Add progress logging | 30 min | 🟢 |
| 6.5 | Test with sample data | 1 hour | 🟡 |

**Phase 6 Total: ~7 hours**

### Phase 7: Testing & Validation (Critical)

| Step | Task | Duration | Priority |
|------|------|----------|----------|
| 7.1 | Test all new routes | 2 hours | 🔴 |
| 7.2 | Load test with 100 concurrent requests | 2 hours | 🔴 |
| 7.3 | Test timeout handling | 1 hour | 🔴 |
| 7.4 | Test LLM fallback scenarios | 1 hour | 🔴 |
| 7.5 | Test PDF parsing with various files | 2 hours | 🔴 |
| 7.6 | Verify no hanging requests | 1 hour | 🔴 |
| 7.7 | Document all endpoints | 1 hour | 🟢 |

**Phase 7 Total: ~10 hours**

### Total Project Duration

| Phase | Duration |
|-------|----------|
| Phase 1: Foundation | 2 hours |
| Phase 2: Core Pipeline | 5 hours |
| Phase 3: Vector DB | 5.5 hours |
| Phase 4: RAG Pipeline | 6 hours |
| Phase 5: LLM Fallback | 6 hours |
| Phase 6: Dataset Training | 7 hours |
| Phase 7: Testing | 10 hours |
| **Total** | **~42 hours (1 week)** |

---

## 11. Risk Points & Mitigation

### 11.1 Critical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| LLM API rate limits | Service outage | High | Multiple keys, fallback, caching |
| Large PDF processing >20MB | Memory crash | Medium | File size limits, streaming parse |
| Vector DB corruption | Data loss | Low | Regular backups, persistence |
| Async job queue overflow | Memory leak | Medium | Job limits, TTL, Redis |
| Timeout cascade | System hang | High | Proper timeout hierarchy |

### 11.2 Mitigation Strategies

1. **Rate Limiting Protection**
   ```python
   # Implement token bucket for API calls
   from slowapi import Limiter
   limiter = Limiter(key_func=lambda: "global")
   
   @router.post("/query")
   @limiter.limit("10/minute")
   async def query(...):
       ...
   ```

2. **Circuit Breaker Pattern**
   ```python
   from circuitbreaker import circuit
   
   @circuit(failure_threshold=5, recovery_timeout=60)
   async def call_llm(prompt):
       ...
   ```

3. **Graceful Degradation**
   ```python
   if vector_search_fails:
       # Fallback to keyword search
       return await keyword_search(query)
   ```

---

## 12. Approval Checklist

Before proceeding with implementation, verify:

- [ ] Reviewed Phase 1-7 execution order
- [ ] Understood timeout hierarchy (client:15s → server:15s → PDF: async)
- [ ] Approved `/health` endpoint addition
- [ ] Approved folder structure changes
- [ ] Understood LLM fallback architecture
- [ ] Reviewed risk mitigation strategies
- [ ] Allocated ~1 week for completion
- [ ] Confirmed `datasets/` folder creation

---

## APPROVAL GATE

**🛑 STOP HERE - DO NOT IMPLEMENT UNTIL APPROVED**

**To proceed, reply with:**
```
"APPROVED - Proceed with implementation"
```

**Or request modifications:**
```
"MODIFY - [specific changes needed]"
```

---

## 13. Parsing Timeout Solution Flow (UPDATED)

### 13.1 Current Problem Analysis

**The Timeout Cascade Issue:**
```
Client: 30s timeout
    ↓
Node.js Server: 120s timeout (waits for Python)
    ↓
Python Parser: 180s timeout (PDF processing)
    ↓
RESULT: Client gives up at 30s while server still processing
```

**Root Causes:**
1. PDF parsing is synchronous and blocking
2. Large PDFs (>5MB) take 60-180 seconds to parse
3. No progress feedback to client
4. Embeddings generation is done inline (adds 30-60s)

### 13.2 Solution Architecture - Async Job Queue

**New Non-Blocking Flow:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ASYNC PDF PROCESSING PIPELINE                       │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: INSTANT RESPONSE (Within 2 seconds)
┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────────────┐
│   Client    │───▶│   Upload    │───▶│  Return {job_id, status: "queued"}  │
│   Upload    │    │   Endpoint  │    │  Immediately                        │
└─────────────┘    └─────────────┘    └─────────────────────────────────────┘
                                              │
                                              ▼ (Don't wait)
                                        ┌─────────────┐
                                        │  Background │
                                        │  Job Queue  │
                                        └─────────────┘

Step 2: BACKGROUND PROCESSING (Async, no timeout pressure)
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Extract   │───▶│    Chunk    │───▶│   Generate  │───▶│    Store    │
│    Text     │    │    Text     │    │  Embeddings │    │  Vectors    │
│  (pdfplumber)│    │ (512 tok)   │    │  (batch)    │    │ (ChromaDB)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
    Time: 5-30s         Time: 1s          Time: 10-30s       Time: 2s

Step 3: CLIENT POLLING (Progress tracking)
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │ ───────▶ │  /status/   │ ◀────── │  Job Status │
│   Poll      │  2s interval  │   {job_id}  │         │  {progress} │
└─────────────┘         └─────────────┘         └─────────────┘
                             │
                             ▼
                    {status: "processing", progress: 45%}
                    {status: "completed", document_id: "xxx"}
                    {status: "failed", error: "..."}
```

### 13.3 Timeout Configuration Fix

**Unified Timeout Hierarchy:**
```
Layer           Old Timeout    New Timeout    Reason
─────────────────────────────────────────────────────────────────
Client          30s            15s            Fast feedback
Node.js         120s           15s            Fail fast to client
Python API      180s           15s            Quick responses
LLM Calls       N/A            10s            Groq is fast (<3s)
PDF Background  N/A            No limit       Async, no timeout
```

### 13.4 Job State Machine

```
                    ┌─────────────┐
         ┌─────────│   QUEUED    │◀──────── Upload received
         │         │  (0-2s)     │
         │         └─────────────┘
         │                │
         │                ▼ Start worker
         │         ┌─────────────┐
         │         │ PROCESSING  │◀──────── PDF parsing
         │         │  (2-60s)    │         Text extraction
         │         └─────────────┘         Chunking
         │                │
         │       ┌────────┴────────┐
         │       ▼                 ▼
    ┌────────┐              ┌─────────────┐
    │RETRY   │◀───Fail────│   FAILED    │
    │(max 2) │            │  (error)    │
    └────┬───┘            └─────────────┘
         │
         └─────────────────┐
                           ▼ Success
                    ┌─────────────┐
         ┌─────────│  COMPLETED  │◀──────── Embeddings stored
         │         │  (success)   │         Vector DB updated
         │         └─────────────┘
         │
    Client notified
    via polling
```

### 13.5 Memory & Performance Optimization

**Chunked Processing for Large PDFs:**
```
Large PDF (50MB, 500 pages)
    │
    ├──▶ Stream read (don't load all in memory)
    │
    ├──▶ Process 10 pages at a time
    │
    ├──▶ Generate embeddings in batches of 32
    │
    └──▶ Store incrementally (don't wait for all)
```

**Resource Limits:**
- Max file size: 20MB (configurable)
- Max pages per batch: 50
- Max concurrent jobs: 4
- Memory cap per job: 512MB

---

## 14. Law Tab Feature Specification (NEW)

### 14.1 Feature Overview

**Purpose:** AI-identified legal references with clickable links to official sources

**Location:** Document viewer (`/document/[id]`) - New tab alongside PDF, Parsed Text, etc.

### 14.2 User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DOCUMENT VIEWER - LAW TAB                             │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "Law" tab
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Backend Trigger (on tab open or document load)                                │
│                                                                             │
│ POST /analyze-laws                                                           │
│ {                                                                            │
│   "document_id": "doc_123",                                                  │
│   "text": "...full document text..."                                         │
│ }                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼ (Async, cached)
┌─────────────────────────────────────────────────────────────────────────────┐
│ LLM Analysis (Groq → Gemini fallback)                                       │
│                                                                             │
│ Prompt: "Analyze this legal document and identify:                         │
│   1. All laws/statutes mentioned                                           │
│   2. Legal sections/articles referenced                                     │
│   3. Court cases cited                                                      │
│   4. Jurisdiction-specific regulations                                      │
│                                                                             │
│ Return JSON: [{"law_name": "...", "section": "...",                         │
│                "context": "brief mention context",                            │
│                "link": "official_url", "importance": "high|medium|low"}]"    │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼ Response (cached 24h)
┌─────────────────────────────────────────────────────────────────────────────┐
│ UI Rendering - Law List                                                     │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Relevant Laws & Regulations (5 found)                                │ │
│ │                                                                          │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 📋 Indian Contract Act, 1872                     [HIGH]     ▼        │ │ │
│ │ │ Section 10 - What agreements are contracts                          │ │ │
│ │ │ "Mentioned in the validity clause of your agreement..."            │ │ │
│ │ │                                                                      │ │ │
│ │ │ 🔗 Official Link: https://indiankanoon.org/doc/...                  │ │ │
│ │ │ 📖 Read more about this law                                         │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                          │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 📋 Information Technology Act, 2000              [MEDIUM]   ▶     │ │ │
│ │ │ Section 43A - Data protection responsibilities                        │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                          │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 📋 Companies Act, 2013                           [HIGH]     ▶     │ │ │
│ │ └─────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.3 Component Structure

**Law Tab Layout:**
```
┌────────────────────────────────────────────┐
│ Tab Bar: [PDF] [Parsed] [Simplified] [Laws] [Clauses] [Summary] │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│ Law Analysis Panel                         │
│ ┌────────────────────────────────────────┐ │
│ │ Header: "Relevant Laws & Regulations"  │ │
│ │ Sub: "AI-identified legal references"  │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Law List Container                     │ │
│ │  ┌──────────────────────────────────┐  │ │
│ │  │ Law Card (Collapsed)             │  │ │
│ │  │ ├─ Law Name + Importance Badge │  │ │
│ │  │ ├─ Section/Article               │  │ │
│ │  │ └─ ▼ Expand Button              │  │ │
│ │  └──────────────────────────────────┘  │ │
│ │                                          │ │
│ │  ┌──────────────────────────────────┐  │ │
│ │  │ Law Card (Expanded)              │  │ │
│ │  │ ├─ Law Name + Badge              │  │ │
│ │  │ ├─ Section/Article               │  │ │
│ │  │ ├─ Context Quote                 │  │ │
│ │  │ ├─ 🔗 Official Link (hidden)     │  │ │
│ │  │ └─ ▲ Collapse Button              │  │ │
│ │  └──────────────────────────────────┘  │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### 14.4 Data Schema

**Request:**
```typescript
interface AnalyzeLawsRequest {
  document_id: string;
  text: string;           // Full document text
  jurisdiction?: string;  // Optional: "IN", "US", "UK", etc.
}
```

**Response:**
```typescript
interface LawReference {
  law_name: string;           // "Indian Contract Act, 1872"
  section?: string;           // "Section 10"
  article?: string;           // "Article 21" (for constitutional)
  context: string;           // Brief quote from document
  link: string;              // Official/legal URL
  importance: 'high' | 'medium' | 'low';
  category: 'statute' | 'regulation' | 'case_law' | 'constitutional';
}

interface AnalyzeLawsResponse {
  success: boolean;
  document_id: string;
  laws: LawReference[];
  generated_at: string;
  cached: boolean;
}
```

### 14.5 API Endpoint Specification

**Endpoint:** `POST /api/laws/analyze`

**Flow:**
```
Client Request
    │
    ├──▶ Check Cache (Redis/Mongo)
    │      ├── Cache Hit → Return cached (24h TTL)
    │      └── Cache Miss → Continue
    │
    ├──▶ Send to Python NLP Service
    │      POST /laws/analyze
    │      {document_id, text, jurisdiction}
    │
    ├──▶ LLM Analysis (10s timeout)
    │      Groq → Gemini fallback
    │      Structured JSON extraction
    │
    ├──▶ Validate & Clean URLs
    │      Remove broken links
    │      Normalize format
    │
    └──▶ Store & Return
           Cache for 24 hours
           Return to client
```

### 14.6 LLM Prompt Design

**System Prompt:**
```
You are a legal document analysis AI. Extract all legal references from the provided document text.

Instructions:
1. Identify specific laws, statutes, acts, regulations mentioned
2. Note sections, articles, clauses referenced
3. Include brief context (1-2 sentences) from the document
4. Provide official/public legal database links (e.g., indiankanoon.org, law.cornell.edu, legislation.gov.uk)
5. Categorize importance based on document relevance

Output Format - JSON Array:
[
  {
    "law_name": "Full official name of law/act",
    "section": "Specific section number or name (if mentioned)",
    "article": "Article number (if constitutional)",
    "context": "Exact quote or paraphrase from document",
    "link": "Direct URL to official legal source",
    "importance": "high|medium|low",
    "category": "statute|regulation|case_law|constitutional"
  }
]

Constraints:
- Only include laws actually mentioned/referenced in text
- Verify links are real legal databases
- Limit to 10 most relevant if many found
- Use null for optional fields not present
```

### 14.7 UI Interaction Specification

**Collapsible Law Cards:**
```
┌─────────────────────────────────────────────────────────┐
│ 📋 Indian Contract Act, 1872            [HIGH]     ▼    │  ◀── Click to expand
│ Section 10 - What agreements are contracts              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ Click expands to:
┌─────────────────────────────────────────────────────────┐
│ 📋 Indian Contract Act, 1872            [HIGH]     ▲    │  ◀── Click to collapse
│ Section 10 - What agreements are contracts              │
│                                                          │
│ "The document states that all parties must adhere to     │
│  the requirements of Section 10 of the Indian Contract   │
│  Act for the agreement to be valid..."                 │
│                                                          │
│ 🔗 Official Source:                                     │
│ https://indiankanoon.org/doc/1872-Indian-Contract-Act/  │
│                                                          │
│ [📖 Read Full Act] [📋 Copy Citation]                    │
└─────────────────────────────────────────────────────────┘
```

**Importance Badges:**
- 🔴 HIGH - Critical to document understanding
- 🟡 MEDIUM - Relevant but secondary
- 🟢 LOW - Mentioned in passing

### 14.8 Caching Strategy

```
Cache Key: law_analysis:{document_id}:{text_hash(100)}
TTL: 24 hours
Store: MongoDB (persistent) + In-memory (fast)

Invalidation:
- Document re-uploaded
- Manual refresh requested
- 24h expiration
```

### 14.9 Error Handling

| Scenario | Response | UI Behavior |
|----------|----------|-------------|
| LLM timeout | Return cached or "Analysis pending" | Show "Analyzing..." with retry |
| No laws found | Empty array | Show "No specific laws identified" |
| Invalid document | 400 error | Show error message |
| LLM all fail | Use fallback generic list | Show warning badge |

---

## Appendix A: Environment Variables

```bash
# Required
GROQ_API_KEY="key1,key2,key3"
GEMINI_API_KEY="key1,key2"

# Optional
MAX_FILE_SIZE_MB=20
LLM_TIMEOUT_SECONDS=10
CHUNK_SIZE=512
CHUNK_OVERLAP=50
VECTOR_DB_PATH="./chroma_db"
```

## Appendix B: Dependencies to Add

```txt
# nlp-service/requirements.txt additions
chromadb>=0.4.18
tenacity>=8.2.0
python-docx>=0.8.11
tqdm>=4.66.1
slowapi>=0.1.9
circuitbreaker>=1.4.0
```

## Appendix C: Testing Commands

```bash
# Health check
curl http://localhost:5000/health
curl http://localhost:8000/health

# Upload PDF
curl -X POST -F "file=@test.pdf" http://localhost:5000/api/upload-pdf

# Query RAG
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the termination clauses?", "top_k": 5}'

# Run dataset training
python train.py
```

---

**End of Implementation Plan**
