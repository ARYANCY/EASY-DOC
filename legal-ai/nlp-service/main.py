from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.features.parsing.router import router as parse_router
from app.features.chat.router import router as chat_router
from app.features.risk.router import router as risk_router
from app.features.simplify.router import router as simplify_router
from app.features.search.router import router as search_router
from app.features.embedding.router import router as embed_router

app = FastAPI(title="Easy-Doc Legal AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parse_router)
app.include_router(chat_router)
app.include_router(risk_router)
app.include_router(simplify_router)
app.include_router(search_router)
app.include_router(embed_router)

@app.get("/")
def root():
    return {"status": "Easy-Doc AI Service Running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}
