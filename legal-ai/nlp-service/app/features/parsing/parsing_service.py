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
    
def group_words_into_lines(words: List[Dict], tolerance: int = 3) -> List[Any]:
    if not words:
        return []
    # Sort by top coordinate
    words.sort(key=lambda x: x['top'])
    lines = []
    current_line = [words[0]]
    for i in range(1, len(words)):
        if abs(words[i]['top'] - current_line[-1]['top']) <= tolerance:
            current_line.append(words[i])
        else:
            lines.append(current_line)
            current_line = [words[i]]
    lines.append(current_line)
    
    # Merge words in each line
    from app.features.parsing.parsing_service import TextBlock
    merged_blocks = []
    for line in lines:
        line.sort(key=lambda x: x['x0'])
        text = " ".join([w['text'] for w in line])
        x0 = min([w['x0'] for w in line])
        top = min([w['top'] for w in line])
        x1 = max([w['x1'] for w in line])
        bottom = max([w['bottom'] for w in line])
        font_size = sum([w.get('size', 10) for w in line]) / len(line)
        font_name = line[0].get('fontname', 'unknown')
        
        merged_blocks.append(TextBlock(
            text=text,
            x=float(x0),
            y=float(top),
            width=float(x1 - x0),
            height=float(bottom - top),
            font_size=float(font_size),
            font_name=font_name
        ))
    return merged_blocks

def extract_structured_pages_fast(file_path: str) -> List[Dict]:
    """Uses PyMuPDF (fitz) for ultra-fast structured parsing (10-100x faster than pdfplumber)"""
    try:
        doc = fitz.open(file_path)
        pages = []
        for i, page in enumerate(doc):
            blocks = []
            page_dict = page.get_text("dict")
            for b in page_dict.get("blocks", []):
                if b["type"] == 0: # Text block
                    for l in b["lines"]:
                        # Merge spans in a line for efficiency
                        line_text = ""
                        x0, y0, x1, y1 = float('inf'), float('inf'), float('-inf'), float('-inf')
                        max_size = 0
                        font_name = "unknown"
                        
                        for s in l["spans"]:
                            line_text += s["text"]
                            x0 = min(x0, s["bbox"][0])
                            y0 = min(y0, s["bbox"][1])
                            x1 = max(x1, s["bbox"][2])
                            y1 = max(y1, s["bbox"][3])
                            max_size = max(max_size, s["size"])
                            font_name = s["font"]
                        
                        if line_text.strip():
                            blocks.append({
                                "text": line_text,
                                "x": float(x0),
                                "y": float(y0),
                                "width": float(x1 - x0),
                                "height": float(y1 - y0),
                                "font_size": float(max_size),
                                "font_name": font_name
                            })
            pages.append({
                "page_num": i + 1,
                "text": page.get_text("text"),
                "blocks": blocks
            })
        doc.close()
        return pages
    except Exception as e:
        logging.error(f"PyMuPDF parsing failed: {e}")
        return []


@dataclass
class TextBlock:
    text: str
    x: float
    y: float
    width: float
    height: float
    font_size: float
    font_name: str

@dataclass
class PageInfo:
    page_num: int
    text: str
    has_images: bool
    confidence: float
    blocks: List[TextBlock] = None


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
        try:
            doc_type, confidence = await detect_document_type_advanced(content)
            logger.info(f"Detected document type: {doc_type.value} (confidence: {confidence:.2f})")
        except Exception as e:
            logger.warning(f"Document type detection failed: {e}. Defaulting to DIGITAL.")
            doc_type = DocumentType.DIGITAL
            confidence = 0.5
        
        # Extract based on document type
        try:
            if doc_type == DocumentType.DIGITAL:
                parsed = await extract_digital_advanced(content, filename)
            elif doc_type == DocumentType.MIXED:
                parsed = await extract_mixed(content, filename)
            else:
                parsed = await extract_ocr_advanced(content, filename)
        except Exception as e:
            logger.warning(f"Primary extraction failed: {e}. Falling back to basic extraction.")
            parsed = await _fallback_extraction(content, filename)
        
        # Post-process and enhance
        enhanced_text = enhance_legal_text(parsed.text) if parsed.text else ""
        semantic_chunks = chunk_text_semantic(enhanced_text) if enhanced_text else []
        
        result = {
            "filename": filename,
            "document_type": doc_type.value,
            "confidence": confidence,
            "total_pages": parsed.total_pages if parsed else 0,
            "text": enhanced_text,
            "chunks": semantic_chunks,
            "chunk_count": len(semantic_chunks),
            "metadata": parsed.metadata if parsed else {},
            "page_count": len(parsed.pages) if parsed and parsed.pages else 0,
            "pages": [
                {
                    "page_num": p.page_num,
                    "text": p.text,
                    "has_images": p.has_images,
                    "confidence": p.confidence,
                    "blocks": [
                        {
                            "text": b.text,
                            "x": b.x,
                            "y": b.y,
                            "width": b.width,
                            "height": b.height,
                            "font_size": b.font_size,
                            "font_name": b.font_name
                        } for b in (p.blocks or [])
                    ]
                } for p in (parsed.pages or [])
            ] if parsed else []
        }
        
        logger.info(f"Successfully parsed {filename}: {len(enhanced_text)} chars, {len(semantic_chunks)} chunks")
        return result
        
    except Exception as e:
        logger.error(f"Parse failed for {filename}: {str(e)}")
        # Return minimal valid result instead of crashing
        return {
            "filename": filename,
            "document_type": "unknown",
            "confidence": 0,
            "total_pages": 0,
            "text": "",
            "chunks": [],
            "chunk_count": 0,
            "metadata": {"error": str(e)},
            "page_count": 0
        }


async def _fallback_extraction(content: bytes, filename: str) -> ParsedDocument:
    """Fallback basic extraction when primary methods fail."""
    logger.info(f"Using fallback extraction for {filename}")
    
    def _basic_extract():
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                pages = []
                full_text_parts = []
                
                for i, page in enumerate(pdf.pages):
                    try:
                        text = page.extract_text() or ""
                        full_text_parts.append(text)
                        pages.append(PageInfo(
                            page_num=i + 1,
                            text=text,
                            has_images=False,
                            confidence=0.5
                        ))
                    except Exception as page_error:
                        logger.warning(f"Failed to extract page {i+1}: {page_error}")
                
                return ParsedDocument(
                    filename=filename,
                    doc_type=DocumentType.DIGITAL,
                    total_pages=len(pdf.pages),
                    text="\n\n".join(full_text_parts),
                    chunks=[],
                    metadata={"extraction_method": "fallback"},
                    pages=pages
                )
        except Exception as e:
            logger.error(f"Fallback extraction also failed: {e}")
            # Return empty document as last resort
            return ParsedDocument(
                filename=filename,
                doc_type=DocumentType.DIGITAL,
                total_pages=0,
                text="",
                chunks=[],
                metadata={"error": str(e), "extraction_method": "failed"},
                pages=[]
            )
    
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_thread_executor, _basic_extract)


async def detect_document_type_advanced(content: bytes) -> Tuple[DocumentType, float]:
    """
    Advanced document type detection with confidence scoring.
    Analyzes multiple pages and image presence.
    """
    def _analyze():
        text_scores = []
        image_scores = []
        
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                if not pdf.pages:
                    logger.warning("PDF has no pages")
                    return DocumentType.DIGITAL, 0.5
                    
                pages_to_check = min(len(pdf.pages), 5)
                
                for i in range(pages_to_check):
                    try:
                        page = pdf.pages[i]
                        
                        # Text extraction check
                        text = page.extract_text() or ""
                        text_len = len(text.strip())
                        text_scores.append(min(text_len / 500, 1.0))  # Normalize to 0-1
                        
                        # Image detection
                        images = page.images
                        image_scores.append(1.0 if len(images) > 0 else 0.0)
                    except Exception as page_error:
                        logger.warning(f"Error analyzing page {i+1}: {page_error}")
                        text_scores.append(0)
                        image_scores.append(0)
        except Exception as e:
            logger.error(f"Failed to open PDF for type detection: {e}")
            return DocumentType.DIGITAL, 0.5  # Default to digital with medium confidence
        
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
        start_time = time.time()
        try:
            # Fast path with PyMuPDF
            doc = fitz.open(stream=content, filetype="pdf")
            pages = []
            full_text_parts = []
            metadata = {"tables": [], "links": [], "fonts": set(), "parser": "pymupdf_fast"}
            
            for i, page in enumerate(doc):
                blocks = []
                page_dict = page.get_text("dict")
                page_text = page.get_text("text")
                
                # Extract links from PyMuPDF
                for link in page.get_links():
                    metadata["links"].append({
                        "page": i + 1,
                        "url": link.get("uri", ""),
                        "text": "" # fitz doesn't give link text easily in get_links
                    })

                for b in page_dict.get("blocks", []):
                    if b["type"] == 0: # Text block
                        for l in b["lines"]:
                            line_text = ""
                            x0, y0, x1, y1 = 10000, 10000, -10000, -10000
                            max_size = 0
                            font_name = "unknown"
                            
                            for s in l["spans"]:
                                line_text += s["text"]
                                x0 = min(x0, s["bbox"][0])
                                y0 = min(y0, s["bbox"][1])
                                x1 = max(x1, s["bbox"][2])
                                y1 = max(y1, s["bbox"][3])
                                max_size = max(max_size, s["size"])
                                font_name = s["font"]
                                metadata["fonts"].add(font_name)
                            
                            if line_text.strip():
                                blocks.append(TextBlock(
                                    text=line_text,
                                    x=float(x0),
                                    y=float(y0),
                                    width=float(x1 - x0),
                                    height=float(y1 - y0),
                                    font_size=float(max_size),
                                    font_name=font_name
                                ))
                
                pages.append(PageInfo(
                    page_num=i + 1,
                    text=page_text,
                    has_images=len(page.get_images()) > 0,
                    confidence=1.0,
                    blocks=blocks
                ))
                full_text_parts.append(page_text)
            
            doc.close()
            metadata["fonts"] = list(metadata["fonts"])
            metadata["parsing_time"] = time.time() - start_time
            
            return ParsedDocument(
                filename=filename,
                doc_type=DocumentType.DIGITAL,
                total_pages=len(pages),
                text="\n\n---PAGE BREAK---\n\n".join(full_text_parts),
                chunks=[],
                metadata=metadata,
                pages=pages
            )
        except Exception as e:
            logger.error(f"PyMuPDF extraction failed: {e}")
            raise
    
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_thread_executor, _extract)


async def extract_ocr_advanced(content: bytes, filename: str) -> ParsedDocument:
    """
    Advanced OCR extraction with multiple preprocessing techniques and quality scoring.
    """
    def _convert_images():
        try:
            # High DPI for better OCR accuracy
            return convert_from_bytes(content, dpi=300, fmt='PNG')
        except Exception as e:
            logger.error(f"Failed to convert PDF to images: {e}")
            return []
    
    loop = asyncio.get_event_loop()
    
    try:
        images = await loop.run_in_executor(_thread_executor, _convert_images)
    except Exception as e:
        logger.error(f"Image conversion failed: {e}")
        images = []
    
    # Process images with multiple techniques
    pages = []
    full_text_parts = []
    
    if not images:
        logger.warning(f"No images extracted from {filename}, returning empty OCR result")
        return ParsedDocument(
            filename=filename,
            doc_type=DocumentType.SCANNED,
            total_pages=0,
            text="",
            chunks=[],
            metadata={"ocr_method": "failed", "error": "No images extracted"},
            pages=[]
        )
    
    for i, image in enumerate(images):
        try:
            # Try multiple preprocessing approaches and combine results
            text_variants = await _ocr_with_variants(image)
            
            if text_variants:
                # Select best result based on confidence
                best_text = max(text_variants, key=lambda x: x[1])[0]
                confidence = max(text_variants, key=lambda x: x[1])[1]
            else:
                best_text = ""
                confidence = 0.0
            
            page_info = PageInfo(
                page_num=i + 1,
                text=best_text,
                has_images=True,
                confidence=confidence
            )
            pages.append(page_info)
            full_text_parts.append(best_text)
        except Exception as e:
            logger.warning(f"OCR failed for page {i+1}: {e}")
            pages.append(PageInfo(
                page_num=i + 1,
                text="",
                has_images=True,
                confidence=0.0
            ))
            full_text_parts.append("")
    
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
