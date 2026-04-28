"""
Advanced PDF Parsing Service with maximum accuracy.
Supports both digital and scanned PDFs with intelligent preprocessing.
"""
import io
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum

import pdfplumber
from pdf2image import convert_from_bytes
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import cv2
import numpy as np

from app.preprocessing.clean import clean_text, enhance_legal_text
from app.preprocessing.chunk import chunk_text_semantic

# Configure logging
logger = logging.getLogger(__name__)

# Thread pools for different operations
_thread_executor = ThreadPoolExecutor(max_workers=4)
_process_executor = ProcessPoolExecutor(max_workers=2)


class DocumentType(Enum):
    DIGITAL = "digital"
    SCANNED = "scanned"
    MIXED = "mixed"


@dataclass
class PageInfo:
    page_num: int
    text: str
    has_images: bool
    confidence: float


@dataclass
class ParsedDocument:
    filename: str
    doc_type: DocumentType
    total_pages: int
    text: str
    chunks: List[str]
    metadata: Dict[str, Any]
    pages: List[PageInfo]


async def parse_document(content: bytes, filename: str) -> Dict[str, Any]:
    """
    Main entry point for document parsing with maximum accuracy.
    
    Args:
        content: PDF file bytes
        filename: Original filename
        
    Returns:
        Parsed document data with extracted text and metadata
    """
    logger.info(f"Starting parse of {filename}")
    
    try:
        # Detect document type with confidence scoring
        doc_type, confidence = await detect_document_type_advanced(content)
        logger.info(f"Detected document type: {doc_type.value} (confidence: {confidence:.2f})")
        
        # Extract based on document type
        if doc_type == DocumentType.DIGITAL:
            parsed = await extract_digital_advanced(content, filename)
        elif doc_type == DocumentType.MIXED:
            parsed = await extract_mixed(content, filename)
        else:
            parsed = await extract_ocr_advanced(content, filename)
        
        # Post-process and enhance
        enhanced_text = enhance_legal_text(parsed.text)
        semantic_chunks = chunk_text_semantic(enhanced_text)
        
        result = {
            "filename": filename,
            "document_type": doc_type.value,
            "confidence": confidence,
            "total_pages": parsed.total_pages,
            "text": enhanced_text,
            "chunks": semantic_chunks,
            "chunk_count": len(semantic_chunks),
            "metadata": parsed.metadata,
            "page_count": len(parsed.pages)
        }
        
        logger.info(f"Successfully parsed {filename}: {len(enhanced_text)} chars, {len(semantic_chunks)} chunks")
        return result
        
    except Exception as e:
        logger.error(f"Parse failed for {filename}: {str(e)}")
        raise


async def detect_document_type_advanced(content: bytes) -> Tuple[DocumentType, float]:
    """
    Advanced document type detection with confidence scoring.
    Analyzes multiple pages and image presence.
    """
    def _analyze():
        text_scores = []
        image_scores = []
        
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            pages_to_check = min(len(pdf.pages), 5)
            
            for i in range(pages_to_check):
                page = pdf.pages[i]
                
                # Text extraction check
                text = page.extract_text() or ""
                text_len = len(text.strip())
                text_scores.append(min(text_len / 500, 1.0))  # Normalize to 0-1
                
                # Image detection
                images = page.images
                image_scores.append(1.0 if len(images) > 0 else 0.0)
        
        avg_text_score = sum(text_scores) / len(text_scores) if text_scores else 0
        avg_image_score = sum(image_scores) / len(image_scores) if image_scores else 0
        
        # Decision logic
        if avg_text_score > 0.8 and avg_image_score < 0.3:
            return DocumentType.DIGITAL, avg_text_score
        elif avg_text_score < 0.2 and avg_image_score > 0.5:
            return DocumentType.SCANNED, 1 - avg_text_score
        else:
            return DocumentType.MIXED, 0.5
    
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_thread_executor, _analyze)


async def extract_digital_advanced(content: bytes, filename: str) -> ParsedDocument:
    """
    Extract text from digital PDFs with layout preservation and table detection.
    """
    def _extract():
        pages = []
        full_text_parts = []
        metadata = {"tables": [], "links": [], "fonts": set()}
        
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = ""
                
                # Extract text with layout
                text = page.extract_text(layout=True) or ""
                page_text += text
                
                # Extract tables
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        table_text = "\n".join([" | ".join(str(cell or "") for cell in row) for row in table])
                        page_text += f"\n\n[TABLE]\n{table_text}\n[/TABLE]\n"
                        metadata["tables"].append({"page": i + 1, "rows": len(table)})
                
                # Extract links
                for link in page.hyperlinks:
                    metadata["links"].append({
                        "page": i + 1,
                        "url": link.get("uri", ""),
                        "text": link.get("text", "")
                    })
                
                # Track fonts
                if page.chars:
                    for char in page.chars[:100]:  # Sample first 100 chars
                        metadata["fonts"].add(char.get("fontname", "unknown"))
                
                page_info = PageInfo(
                    page_num=i + 1,
                    text=page_text,
                    has_images=len(page.images) > 0,
                    confidence=1.0
                )
                pages.append(page_info)
                full_text_parts.append(page_text)
        
        metadata["fonts"] = list(metadata["fonts"])
        
        return ParsedDocument(
            filename=filename,
            doc_type=DocumentType.DIGITAL,
            total_pages=len(pages),
            text="\n\n---PAGE BREAK---\n\n".join(full_text_parts),
            chunks=[],  # Will be chunked later
            metadata=metadata,
            pages=pages
        )
    
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_thread_executor, _extract)


async def extract_ocr_advanced(content: bytes, filename: str) -> ParsedDocument:
    """
    Advanced OCR extraction with multiple preprocessing techniques and quality scoring.
    """
    def _convert_images():
        # High DPI for better OCR accuracy
        return convert_from_bytes(content, dpi=300, fmt='PNG')
    
    loop = asyncio.get_event_loop()
    images = await loop.run_in_executor(_thread_executor, _convert_images)
    
    # Process images with multiple techniques
    pages = []
    full_text_parts = []
    
    for i, image in enumerate(images):
        # Try multiple preprocessing approaches and combine results
        text_variants = await _ocr_with_variants(image)
        
        # Select best result based on confidence
        best_text = max(text_variants, key=lambda x: x[1])[0]
        confidence = max(text_variants, key=lambda x: x[1])[1]
        
        page_info = PageInfo(
            page_num=i + 1,
            text=best_text,
            has_images=True,
            confidence=confidence
        )
        pages.append(page_info)
        full_text_parts.append(best_text)
    
    return ParsedDocument(
        filename=filename,
        doc_type=DocumentType.SCANNED,
        total_pages=len(pages),
        text="\n\n---PAGE BREAK---\n\n".join(full_text_parts),
        chunks=[],
        metadata={"ocr_method": "advanced_multi_variant", "pages_processed": len(pages)},
        pages=pages
    )


async def _ocr_with_variants(image: Image.Image) -> List[Tuple[str, float]]:
    """
    Apply multiple OCR preprocessing variants and return results with confidence scores.
    """
    variants = []
    
    # Variant 1: Basic grayscale
    def variant1(img):
        gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return Image.fromarray(thresh)
    
    # Variant 2: Denoised
    def variant2(img):
        gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return Image.fromarray(thresh)
    
    # Variant 3: Enhanced contrast
    def variant3(img):
        enhancer = ImageEnhance.Contrast(img)
        enhanced = enhancer.enhance(2.0)
        gray = cv2.cvtColor(np.array(enhanced), cv2.COLOR_RGB2GRAY)
        return Image.fromarray(gray)
    
    # Variant 4: Deskew (if needed)
    def variant4(img):
        gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
        # Simple deskew using moments
        coords = np.column_stack(np.where(gray > 0))
        if len(coords) > 0:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            if abs(angle) > 0.5:
                (h, w) = gray.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                rotated = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
                return Image.fromarray(rotated)
        return Image.fromarray(gray)
    
    # Process all variants in parallel
    loop = asyncio.get_event_loop()
    variant_funcs = [variant1, variant2, variant3, variant4]
    
    for func in variant_funcs:
        try:
            processed = await loop.run_in_executor(_thread_executor, func, image)
            text = await loop.run_in_executor(
                _thread_executor, 
                lambda img: pytesseract.image_to_string(img, config='--psm 6'),
                processed
            )
            
            # Calculate confidence based on text quality
            confidence = _calculate_text_confidence(text)
            variants.append((text, confidence))
        except Exception as e:
            logger.warning(f"OCR variant failed: {e}")
            variants.append(("", 0.0))
    
    return variants if variants else [("", 0.0)]


def _calculate_text_confidence(text: str) -> float:
    """
    Calculate confidence score based on text quality metrics.
    """
    if not text:
        return 0.0
    
    # Metrics
    length_score = min(len(text) / 1000, 1.0)
    
    # Word density (words per character)
    words = text.split()
    word_count = len(words)
    char_count = len(text)
    word_density = word_count / max(char_count, 1)
    word_score = 1.0 if 0.1 < word_density < 0.25 else 0.5
    
    # Check for common OCR errors
    ocr_errors = ['|', '_', '@', '#', '$', '%']
    error_count = sum(text.count(e) for e in ocr_errors)
    error_score = max(0, 1.0 - (error_count / max(len(text), 1)))
    
    # Combined score
    return (length_score * 0.3 + word_score * 0.4 + error_score * 0.3)


async def extract_mixed(content: bytes, filename: str) -> ParsedDocument:
    """
    Handle mixed documents (some pages digital, some scanned).
    """
    # First try digital extraction
    digital_result = await extract_digital_advanced(content, filename)
    
    # Check which pages have low text confidence and re-OCR them
    pages_to_ocr = [p for p in digital_result.pages if len(p.text.strip()) < 50]
    
    if pages_to_ocr:
        # Convert specific pages
        def _convert_specific():
            page_nums = [p.page_num for p in pages_to_ocr]
            return convert_from_bytes(content, dpi=300, first_page=min(page_nums), last_page=max(page_nums))
        
        loop = asyncio.get_event_loop()
        images = await loop.run_in_executor(_thread_executor, _convert_specific)
        
        # OCR the low-confidence pages
        for page_info, image in zip(pages_to_ocr, images):
            ocr_text = await _ocr_single_page(image)
            page_info.text = ocr_text
    
    # Rebuild full text
    full_text = "\n\n---PAGE BREAK---\n\n".join([p.text for p in digital_result.pages])
    digital_result.text = full_text
    digital_result.doc_type = DocumentType.MIXED
    
    return digital_result


async def _ocr_single_page(image: Image.Image) -> str:
    """OCR a single page with best preprocessing."""
    loop = asyncio.get_event_loop()
    
    def _process():
        # Best preprocessing for legal documents
        gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return Image.fromarray(thresh)
    
    processed = await loop.run_in_executor(_thread_executor, _process)
    text = await loop.run_in_executor(
        _thread_executor,
        lambda: pytesseract.image_to_string(processed, config='--psm 6 -l eng'),
        processed
    )
    return text


# Legacy compatibility
async def detect_if_scanned(content: bytes) -> bool:
    """Legacy function - use detect_document_type_advanced instead."""
    doc_type, _ = await detect_document_type_advanced(content)
    return doc_type == DocumentType.SCANNED


async def extract_digital(content: bytes) -> str:
    """Legacy function - use extract_digital_advanced instead."""
    result = await extract_digital_advanced(content, "legacy")
    return result.text


async def extract_ocr(content: bytes) -> str:
    """Legacy function - use extract_ocr_advanced instead."""
    result = await extract_ocr_advanced(content, "legacy")
    return result.text


def preprocess_image(image: Image.Image) -> Image.Image:
    """Legacy preprocessing function."""
    img_array = np.array(image)
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return Image.fromarray(thresh)
