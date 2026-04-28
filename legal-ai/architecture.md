# Mermaid Architecture Diagram (Full System + API Routes + File Structure)

---

## 1. High-Level System Flow

```mermaid
flowchart TD

A[Next.js Frontend] -->|HTTP| B[Node.js API Gateway]
B -->|REST Calls| C[FastAPI AI Service]

C --> D[Parsing Layer]
C --> E[NLP Layer]
C --> F[RAG Layer]
C --> G[LLM Layer]

D --> H[Structured JSON]
E --> H

H --> I[MongoDB]
H --> J[Chunking]

J --> K[Embeddings]
K --> L[FAISS Vector DB]

A <-->|Responses| B
B <-->|Responses| C
```

---

## 2. API Routes Mapping

```mermaid
flowchart LR

subgraph Frontend
A1[/upload/]
A2[/document/:id/]
A3[/chat/]
A4[/risk/]
A5[/simplify/]
end

subgraph NodeJS_API
B1[POST /api/upload]
B2[GET /api/document/:id]
B3[POST /api/chat]
B4[GET /api/risk/:id]
B5[POST /api/simplify]
end

subgraph FastAPI
C1[POST /parse]
C2[POST /embed]
C3[POST /search]
C4[POST /chat]
C5[POST /risk]
C6[POST /simplify]
end

A1 --> B1 --> C1
A2 --> B2
A3 --> B3 --> C4
A4 --> B4 --> C5
A5 --> B5 --> C6
```

---

## 3. Parsing + NLP + RAG Pipeline

```mermaid
flowchart TD

A[Input Document] --> B{PDF Type}

B -->|Digital| C[pdfplumber]
B -->|Scanned| D[pdf2image]

D --> E[OpenCV]
E --> F[pytesseract OCR]

C --> G[Docling]
F --> G

G --> H[spaCy NLP]
H --> I[sklearn Classification]

I --> J[Structured Output]

J --> K[Chunking]
K --> L[Embeddings]

L --> M[FAISS]

N[User Query] --> O[Query Embedding]
O --> M
M --> P[Top-K Results]

P --> Q[Context Injection]
Q --> R[LLM]
R --> S[Response]
```

---

## 4. Project Folder Structure

```mermaid
flowchart TD

ROOT[legal-ai]

ROOT --> CLIENT
ROOT --> SERVER
ROOT --> NLP
ROOT --> SHARED

%% CLIENT
CLIENT[client/] --> CAPP[app/]
CLIENT --> CFEAT[features/]
CLIENT --> CLIB[lib/]

CFEAT --> CU[upload/]
CFEAT --> CD[document/]
CFEAT --> CR[risk/]
CFEAT --> CC[chat/]

%% SERVER
SERVER[server/] --> SFEAT[features/]
SERVER --> SCORE[core/]

SFEAT --> SU[upload/]
SFEAT --> SD[document/]
SFEAT --> SC[chat/]
SFEAT --> SR[risk/]
SFEAT --> SS[simplify/]

SCORE --> SCONF[config/]
SCORE --> SMID[middleware/]
SCORE --> SSERV[services/]

%% NLP SERVICE
NLP[nlp-service/] --> NAPP[app/]

NAPP --> NFEAT[features/]
NAPP --> NCORE[core/]
NAPP --> NDB[db/]
NAPP --> NPRE[preprocessing/]

NFEAT --> NPARSING[parsing/]
NFEAT --> NEMB[embedding/]
NFEAT --> NSEARCH[search/]
NFEAT --> NCHAT[chat/]
NFEAT --> NRISK[risk/]
NFEAT --> NSIMP[simplify/]

%% DATABASE
NDB --> MONGO[(MongoDB)]
NDB --> FAISS[(FAISS)]
```

---

## 5. End-to-End Execution Flow

```mermaid
sequenceDiagram

participant U as User
participant F as Frontend (Next.js)
participant N as Backend (Node.js)
participant AI as FastAPI
participant DB as MongoDB
participant VDB as FAISS
participant LLM as LLM

U->>F: Upload Document
F->>N: POST /api/upload
N->>AI: POST /parse

AI->>AI: Parsing + NLP
AI->>DB: Store structured data

AI->>AI: Chunk + Embed
AI->>VDB: Store embeddings

N->>F: Return doc_id

U->>F: Ask Question
F->>N: POST /api/chat
N->>AI: POST /chat

AI->>VDB: Retrieve context
AI->>LLM: Generate answer
LLM->>AI: Response

AI->>N: Answer
N->>F: Answer
F->>U: Display
```

---

## 6. Risk Engine Flow

```mermaid
flowchart TD

A[Clauses] --> B[Rule Engine]
A --> C[ML Classifier]
A --> D[LLM Analysis]

B --> E[Score Components]
C --> E
D --> E

E --> F[Final Risk Score 0-100]
F --> G[UI Display]
```

---

## 7. Key System Properties

* Multi-layer pipeline (Parsing → NLP → RAG → LLM)
* Strict microservice separation
* Hybrid AI (deterministic + probabilistic)
* API-driven architecture
* Scalable and modular

---

## 8. Summary

This diagram set represents:

* Full request lifecycle
* API interactions
* Internal AI pipelines
* Project structure

System type:

* Document Intelligence Engine
* RAG-based Legal AI System
* Production-grade microservice architecture

---
