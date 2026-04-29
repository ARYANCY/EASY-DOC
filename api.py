"""
FastAPI web service for legal document analysis
Provides REST API endpoints for document processing
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import logging
from pathlib import Path
import tempfile

from main import LegalDocumentAnalyzer, DocumentAnalysisResult, asdict
from utils import ResultsExporter, BatchProcessor, PerformanceMetrics
import config

# Setup logging
logging.basicConfig(level=config.LOG_LEVEL)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Legal Document Analysis API",
    description="Enterprise-grade legal document analysis with OCR, NLP, and RAG",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize analyzer
logger.info(f"Initializing analyzer with {config.LLM_PROVIDER}...")
analyzer = LegalDocumentAnalyzer(llm_provider=config.LLM_PROVIDER)
batch_processor = BatchProcessor(analyzer)
metrics = PerformanceMetrics()


# ============================================================================
# Pydantic Models
# ============================================================================

class AnalysisRequest(BaseModel):
    """Request model for document analysis"""
    document_url: Optional[str] = None
    extract_summary: bool = True
    extract_risks: bool = True
    extract_entities: bool = True


class AnalysisResponse(BaseModel):
    """Response model for analysis results"""
    document_id: str
    summary: str
    overall_risk_score: float
    extracted_clauses: int
    risk_assessments: int
    processing_time: float


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    llm_provider: str
    model_version: str


# ============================================================================
# Health & System Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        llm_provider=config.LLM_PROVIDER,
        model_version=analyzer.model_version
    )


@app.get("/metrics")
async def get_metrics():
    """Get performance metrics"""
    return metrics.to_dict()


# ============================================================================
# Document Analysis Endpoints
# ============================================================================

@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    """
    Analyze a legal document
    
    - **file**: Document file (PDF, TXT, or image)
    
    Returns complete analysis with risks, clauses, and summary
    """
    try:
        # Validate file size
        content = await file.read()
        if len(content) > config.MAX_DOCUMENT_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max size: {config.MAX_DOCUMENT_SIZE / 1024 / 1024}MB"
            )
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        logger.info(f"Analyzing document: {file.filename}")
        
        # Run analysis
        result = analyzer.analyze_document(tmp_path)
        
        # Record metrics
        metrics.record_analysis(result)
        
        # Cleanup
        Path(tmp_path).unlink()
        
        return {
            "status": "success",
            "document_id": result.document_id,
            "summary": result.summary,
            "overall_risk_score": round(result.overall_risk_score, 3),
            "extracted_clauses": len(result.extracted_clauses),
            "risk_assessments": len(result.risk_assessments),
            "key_parties": result.key_parties,
            "key_dates": result.key_dates,
            "processing_time": round(result.processing_time, 2),
            "clauses": [
                {
                    "type": c.clause_type,
                    "risk_level": c.risk_level,
                    "confidence": round(c.confidence, 2),
                    "page": c.page_number
                }
                for c in result.extracted_clauses
            ],
            "risks": [
                {
                    "type": r.risk_type,
                    "severity": r.severity,
                    "description": r.description,
                    "recommendation": r.recommendation,
                    "confidence": round(r.confidence_score, 2)
                }
                for r in result.risk_assessments
            ]
        }
    
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        metrics.record_error()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/analyze/batch")
async def batch_analyze(files: List[UploadFile] = File(...)):
    """
    Analyze multiple documents in batch
    
    - **files**: Multiple document files
    
    Returns analysis for each document with summary statistics
    """
    results = []
    errors = []
    
    for file in files:
        try:
            content = await file.read()
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            
            result = analyzer.analyze_document(tmp_path)
            metrics.record_analysis(result)
            
            results.append({
                "file": file.filename,
                "document_id": result.document_id,
                "overall_risk_score": round(result.overall_risk_score, 3)
            })
            
            Path(tmp_path).unlink()
        
        except Exception as e:
            logger.error(f"Error processing {file.filename}: {str(e)}")
            errors.append({"file": file.filename, "error": str(e)})
            metrics.record_error()
    
    return {
        "status": "completed",
        "processed": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors if errors else None
    }


@app.get("/compare")
async def compare_documents(doc_ids: List[str]):
    """
    Compare risk profiles across multiple documents
    
    - **doc_ids**: List of document IDs to compare
    """
    if len(doc_ids) < 2:
        raise HTTPException(status_code=400, detail="Requires at least 2 documents to compare")
    
    return {
        "status": "success",
        "message": "Document comparison feature coming soon"
    }


# ============================================================================
# Export Endpoints
# ============================================================================

@app.post("/export/{document_id}")
async def export_results(document_id: str, format: str = "json"):
    """
    Export analysis results in specified format
    
    - **document_id**: ID of analyzed document
    - **format**: Export format (json, csv, html)
    """
    if format not in config.EXPORT_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Format must be one of: {', '.join(config.EXPORT_FORMATS)}"
        )
    
    return {
        "status": "success",
        "message": f"Export to {format} completed (feature in development)"
    }


# ============================================================================
# Search & Query Endpoints
# ============================================================================

@app.get("/search")
async def search_clauses(query: str, category: Optional[str] = None):
    """
    Search across analyzed documents for specific clause types
    
    - **query**: Search query
    - **category**: Clause category filter (liability, termination, etc.)
    """
    return {
        "status": "success",
        "query": query,
        "category": category,
        "message": "Search feature coming soon"
    }


@app.get("/templates")
async def get_templates():
    """Get list of available document templates for comparison"""
    return {
        "status": "success",
        "templates": [
            {"id": "nda", "name": "Non-Disclosure Agreement"},
            {"id": "saas", "name": "SaaS Agreement"},
            {"id": "employment", "name": "Employment Agreement"},
            {"id": "service", "name": "Service Agreement"},
            {"id": "license", "name": "License Agreement"}
        ]
    }


# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "detail": exc.detail
        }
    )


# ============================================================================
# Root Endpoint
# ============================================================================

@app.get("/")
async def root():
    """API root endpoint with documentation"""
    return {
        "name": "Legal Document Analysis API",
        "version": analyzer.model_version,
        "description": "Enterprise-grade legal document analysis system",
        "endpoints": {
            "documentation": "/docs",
            "health": "/health",
            "analyze": "/analyze (POST)",
            "batch_analyze": "/analyze/batch (POST)",
            "metrics": "/metrics",
            "templates": "/templates"
        },
        "features": [
            "OCR for PDFs and images",
            "Legal clause extraction",
            "Risk assessment and scoring",
            "Named entity extraction",
            "RAG-based analysis",
            "LLM-powered summarization",
            "Batch processing"
        ]
    }


# ============================================================================
# Startup/Shutdown Events
# ============================================================================

@app.on_event("startup")
async def startup_event():
    logger.info("Application started")
    logger.info(f"LLM Provider: {config.LLM_PROVIDER}")
    logger.info(f"Output Directory: {config.OUTPUT_DIR}")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutdown")
    logger.info(batch_processor.get_summary())


# ============================================================================
# Run the app
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level=config.LOG_LEVEL.lower()
    )
