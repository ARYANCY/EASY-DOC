"""
Configuration and Environment Setup
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================================================
# API Configuration
# ============================================================================

# LLM Provider: 'claude' or 'openai'
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "claude")

# API Keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# ============================================================================
# Model Configuration
# ============================================================================

# Embedding model
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# spaCy model
SPACY_MODEL = "en_core_web_sm"

# LLM Model selection
LLM_MODELS = {
    "claude": "claude-3-sonnet-20240229",
    "openai": "gpt-4-turbo"
}

# ============================================================================
# Processing Configuration
# ============================================================================

# OCR Configuration
OCR_LANGUAGE = "eng"  # Tesseract language
OCR_TIMEOUT = 300  # seconds

# Document size limits
MAX_DOCUMENT_SIZE = 50 * 1024 * 1024  # 50 MB
MAX_TEXT_LENGTH = 1000000  # characters

# RAG Configuration
RAG_TOP_K = 3  # Number of relevant documents to retrieve
SIMILARITY_THRESHOLD = 0.3  # Minimum similarity score

# ============================================================================
# Output Configuration
# ============================================================================

# Output directory
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./output"))
OUTPUT_DIR.mkdir(exist_ok=True)

# Results format
EXPORT_FORMATS = ["json", "csv", "pdf"]
DEFAULT_EXPORT_FORMAT = "json"

# ============================================================================
# Logging Configuration
# ============================================================================

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = Path(os.getenv("LOG_FILE", "./logs/analysis.log"))
LOG_FILE.parent.mkdir(exist_ok=True)

# ============================================================================
# Database Configuration (optional)
# ============================================================================

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./legal_analyzer.db")

# ============================================================================
# Risk Assessment Thresholds
# ============================================================================

RISK_THRESHOLDS = {
    "critical": 0.9,
    "high": 0.7,
    "medium": 0.4,
    "low": 0.0
}

# ============================================================================
# Supported Documents
# ============================================================================

SUPPORTED_FORMATS = {
    "text": [".txt", ".md"],
    "pdf": [".pdf"],
    "image": [".png", ".jpg", ".jpeg", ".tiff", ".bmp"]
}

# ============================================================================
# Cache Configuration
# ============================================================================

ENABLE_CACHE = os.getenv("ENABLE_CACHE", "true").lower() == "true"
CACHE_DIR = Path(os.getenv("CACHE_DIR", "./cache"))
CACHE_DIR.mkdir(exist_ok=True)

# ============================================================================
# Performance
# ============================================================================

# Batch processing
BATCH_SIZE = 10
WORKERS = 4

# Timeout settings
REQUEST_TIMEOUT = 300  # seconds
LLM_TIMEOUT = 60  # seconds

print(f"✓ Configuration loaded")
print(f"  LLM Provider: {LLM_PROVIDER}")
print(f"  Embedding Model: {EMBEDDING_MODEL}")
print(f"  Output Directory: {OUTPUT_DIR}")
