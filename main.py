"""
Enterprise Legal Document Analysis System
End-to-end pipeline: OCR → Parsing → NLP → RAG → LLM
"""

import os
import json
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import hashlib

# Third-party imports
import pytesseract
from PIL import Image
import numpy as np
import pandas as pd
from pathlib import Path

# NLP and embeddings
from sentence_transformers import SentenceTransformer
import spacy
from sklearn.metrics.pairwise import cosine_similarity

# LLM Integration
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# Data Models
# ============================================================================

@dataclass
class DocumentMetadata:
    """Document metadata and properties"""
    file_name: str
    file_type: str
    file_size: int
    upload_date: str
    document_type: str  # "contract", "agreement", "nda", etc.
    hash: str


@dataclass
class ExtractedClause:
    """Represents an extracted legal clause"""
    clause_type: str  # "liability", "termination", "confidentiality", etc.
    text: str
    page_number: int
    confidence: float
    risk_level: str  # "high", "medium", "low"
    explanation: str


@dataclass
class RiskAssessment:
    """Risk assessment result"""
    risk_type: str
    severity: str  # "critical", "high", "medium", "low"
    location: str  # clause/section reference
    description: str
    recommendation: str
    confidence_score: float


@dataclass
class DocumentAnalysisResult:
    """Complete document analysis output"""
    document_id: str
    metadata: DocumentMetadata
    extracted_text: str
    extracted_clauses: List[ExtractedClause]
    risk_assessments: List[RiskAssessment]
    summary: str
    key_parties: List[str]
    key_dates: List[str]
    overall_risk_score: float
    processing_time: float
    model_version: str


# ============================================================================
# Stage 1: OCR & Document Processing
# ============================================================================

class OCRProcessor:
    """Handles OCR for PDF/image documents"""
    
    def __init__(self):
        logger.info("Initializing OCR Processor")
        self.supported_formats = {'.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp'}
    
    def process_image(self, image_path: str) -> str:
        """Extract text from image using Tesseract OCR"""
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image)
            logger.info(f"Extracted {len(text)} characters from {image_path}")
            return text
        except Exception as e:
            logger.error(f"OCR error on {image_path}: {str(e)}")
            return ""
    
    def process_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF (requires pdf2image, pdfplumber, or similar)"""
        try:
            import pdfplumber
            text = ""
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
            logger.info(f"Extracted {len(text)} characters from PDF")
            return text
        except ImportError:
            logger.warning("pdfplumber not installed, falling back to image extraction")
            return ""
        except Exception as e:
            logger.error(f"PDF processing error: {str(e)}")
            return ""
    
    def process_document(self, file_path: str) -> str:
        """Route to appropriate processor based on file type"""
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.pdf':
            return self.process_pdf(file_path)
        elif file_ext in {'.png', '.jpg', '.jpeg', '.tiff', '.bmp'}:
            return self.process_image(file_path)
        else:
            logger.error(f"Unsupported file format: {file_ext}")
            return ""


# ============================================================================
# Stage 2: Text Parsing & Preprocessing
# ============================================================================

class TextParser:
    """Handles text cleaning, segmentation, and preprocessing"""
    
    def __init__(self):
        logger.info("Initializing Text Parser")
        # Load spaCy model for NLP
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("spaCy model not found. Install with: python -m spacy download en_core_web_sm")
            self.nlp = None
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove excessive whitespace
        text = ' '.join(text.split())
        # Remove special characters but keep sentence structure
        text = text.replace('\x00', '').replace('\x0b', '')
        return text
    
    def segment_into_sections(self, text: str) -> List[Dict]:
        """Segment document into logical sections"""
        sections = []
        lines = text.split('\n')
        
        current_section = {
            'title': 'Introduction',
            'content': [],
            'page': 1
        }
        
        for i, line in enumerate(lines):
            # Detect section headers (simple heuristic)
            if line.strip() and len(line.strip()) < 100 and line.strip().isupper():
                if current_section['content']:
                    sections.append(current_section)
                current_section = {
                    'title': line.strip(),
                    'content': [],
                    'page': max(1, i // 50)
                }
            else:
                current_section['content'].append(line)
        
        if current_section['content']:
            sections.append(current_section)
        
        logger.info(f"Segmented document into {len(sections)} sections")
        return sections
    
    def extract_sentences(self, text: str) -> List[str]:
        """Extract individual sentences"""
        if not self.nlp:
            return text.split('.')
        
        doc = self.nlp(text)
        sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        return sentences


# ============================================================================
# Stage 3: Legal Clause Extraction & NLP
# ============================================================================

class LegalClauseExtractor:
    """Identifies and extracts legal clauses with classification"""
    
    CLAUSE_KEYWORDS = {
        'liability': ['liable', 'liability', 'responsibility', 'indemnif', 'damages', 'loss'],
        'termination': ['terminate', 'termination', 'cancel', 'cancellation', 'expiration'],
        'confidentiality': ['confidential', 'nda', 'non-disclosure', 'proprietary', 'trade secret'],
        'payment': ['payment', 'fee', 'compensation', 'invoice', 'pricing', 'cost'],
        'intellectual_property': ['intellectual property', 'patent', 'copyright', 'trademark'],
        'governing_law': ['governed by', 'jurisdiction', 'applicable law', 'venue'],
        'amendment': ['amendment', 'modification', 'alter', 'change'],
        'force_majeure': ['force majeure', 'act of god', 'unforeseeable'],
        'limitation': ['limit', 'exception', 'exclude', 'waiver'],
        'warranty': ['warrant', 'guarantee', 'as-is', 'merchantability']
    }
    
    RISK_INDICATORS = {
        'high': ['shall not', 'unlimited', 'perpetual', 'irrevocable', 'sole remedy'],
        'medium': ['may', 'subject to', 'except', 'provided that'],
        'low': ['can', 'may', 'optional', 'voluntary']
    }
    
    def __init__(self):
        logger.info("Initializing Legal Clause Extractor")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def classify_clause(self, text: str) -> Tuple[str, float]:
        """Classify clause type using keyword matching and embeddings"""
        text_lower = text.lower()
        
        max_score = 0
        best_type = 'other'
        
        for clause_type, keywords in self.CLAUSE_KEYWORDS.items():
            score = sum(text_lower.count(kw) for kw in keywords)
            if score > max_score:
                max_score = score
                best_type = clause_type
        
        # Normalize confidence
        confidence = min(1.0, max_score / 5.0) if max_score > 0 else 0.0
        return best_type, confidence
    
    def assess_risk_level(self, text: str) -> str:
        """Assess risk level based on language indicators"""
        text_lower = text.lower()
        
        high_count = sum(text_lower.count(indicator) for indicator in self.RISK_INDICATORS['high'])
        medium_count = sum(text_lower.count(indicator) for indicator in self.RISK_INDICATORS['medium'])
        
        if high_count > 0:
            return 'high'
        elif medium_count > 2:
            return 'medium'
        else:
            return 'low'
    
    def extract_clauses(self, sections: List[Dict]) -> List[ExtractedClause]:
        """Extract and classify clauses from sections"""
        clauses = []
        
        for section in sections:
            section_text = '\n'.join(section['content'])
            
            if len(section_text.strip()) < 20:
                continue
            
            clause_type, confidence = self.classify_clause(section_text)
            if confidence > 0.3:
                risk_level = self.assess_risk_level(section_text)
                
                clause = ExtractedClause(
                    clause_type=clause_type,
                    text=section_text[:500],  # Truncate for size
                    page_number=section['page'],
                    confidence=confidence,
                    risk_level=risk_level,
                    explanation=f"Identified {clause_type} clause with {risk_level} risk"
                )
                clauses.append(clause)
        
        logger.info(f"Extracted {len(clauses)} clauses")
        return clauses


# ============================================================================
# Stage 4: RAG (Retrieval-Augmented Generation)
# ============================================================================

class RAGPipeline:
    """Retrieval-Augmented Generation for context-aware LLM responses"""
    
    def __init__(self):
        logger.info("Initializing RAG Pipeline")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.documents = []
        self.embeddings = np.array([])
    
    def add_documents(self, documents: List[str]):
        """Add documents to the knowledge base"""
        self.documents = documents
        self.embeddings = self.model.encode(documents, convert_to_numpy=True)
        logger.info(f"Added {len(documents)} documents to RAG pipeline")
    
    def retrieve_relevant_context(self, query: str, top_k: int = 3) -> List[str]:
        """Retrieve relevant documents for a query"""
        if len(self.documents) == 0:
            return []
        
        query_embedding = self.model.encode([query], convert_to_numpy=True)
        similarities = cosine_similarity(query_embedding, self.embeddings)[0]
        
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        relevant_docs = [self.documents[i] for i in top_indices if similarities[i] > 0.3]
        
        return relevant_docs


# ============================================================================
# Stage 5: LLM Integration & Risk Analysis
# ============================================================================

class LLMAnalyzer:
    """LLM-based analysis with Claude or GPT"""
    
    def __init__(self, model_provider: str = "claude"):
        logger.info(f"Initializing LLM Analyzer with {model_provider}")
        self.model_provider = model_provider
        
        if model_provider == "claude" and HAS_ANTHROPIC:
            self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            self.model = "claude-3-sonnet-20240229"
        elif model_provider == "openai" and HAS_OPENAI:
            self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            self.model = "gpt-4-turbo"
        else:
            logger.warning("No LLM provider configured, using mock responses")
            self.client = None
    
    def analyze_risks(self, document_text: str, clauses: List[ExtractedClause]) -> List[RiskAssessment]:
        """Use LLM to perform detailed risk analysis"""
        if not self.client:
            return self._mock_risk_analysis(clauses)
        
        prompt = f"""Analyze the following legal clauses for risks. For each clause, provide:
1. Risk type (liability, termination, confidentiality, etc.)
2. Severity (critical, high, medium, low)
3. Brief description of the risk
4. Recommendation for mitigation

Clauses:
{json.dumps([asdict(c) for c in clauses[:5]], indent=2)}

Respond in JSON format."""
        
        try:
            if self.model_provider == "claude":
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )
                response_text = response.content[0].text
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3
                )
                response_text = response.choices[0].message.content
            
            risks = self._parse_risk_response(response_text)
            return risks
        except Exception as e:
            logger.error(f"LLM analysis error: {str(e)}")
            return self._mock_risk_analysis(clauses)
    
    def _mock_risk_analysis(self, clauses: List[ExtractedClause]) -> List[RiskAssessment]:
        """Generate mock risk analysis for testing"""
        risks = []
        
        for clause in clauses:
            if clause.risk_level == 'high':
                severity = 'high'
            elif clause.risk_level == 'medium':
                severity = 'medium'
            else:
                severity = 'low'
            
            risk = RiskAssessment(
                risk_type=clause.clause_type,
                severity=severity,
                location=f"Page {clause.page_number}",
                description=f"{clause.clause_type} clause contains {severity} risk",
                recommendation="Review with legal counsel",
                confidence_score=clause.confidence
            )
            risks.append(risk)
        
        return risks
    
    def _parse_risk_response(self, response_text: str) -> List[RiskAssessment]:
        """Parse LLM response into RiskAssessment objects"""
        try:
            # Extract JSON from response
            start = response_text.find('[')
            end = response_text.rfind(']') + 1
            if start != -1 and end > start:
                json_str = response_text[start:end]
                data = json.loads(json_str)
                
                risks = []
                for item in data:
                    risk = RiskAssessment(
                        risk_type=item.get('risk_type', 'unknown'),
                        severity=item.get('severity', 'low'),
                        location=item.get('location', ''),
                        description=item.get('description', ''),
                        recommendation=item.get('recommendation', ''),
                        confidence_score=float(item.get('confidence_score', 0.5))
                    )
                    risks.append(risk)
                return risks
        except Exception as e:
            logger.error(f"Error parsing LLM response: {str(e)}")
        
        return []
    
    def generate_summary(self, document_text: str, clauses: List[ExtractedClause]) -> str:
        """Generate natural language summary of document"""
        if not self.client:
            return self._mock_summary(clauses)
        
        prompt = f"""Create a concise 2-3 sentence executive summary of this legal document.
Focus on key obligations, risks, and terms.

Key Clauses identified:
{', '.join([c.clause_type for c in clauses[:5]])}

Document snippet:
{document_text[:500]}"""
        
        try:
            if self.model_provider == "claude":
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3,
                    max_tokens=500
                )
                return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Summary generation error: {str(e)}")
            return self._mock_summary(clauses)
    
    def _mock_summary(self, clauses: List[ExtractedClause]) -> str:
        """Generate mock summary"""
        clause_types = ', '.join(set(c.clause_type for c in clauses[:3]))
        return f"This document contains {clause_types} clauses with overall moderate risk level. Recommend legal review of high-risk sections before execution."


# ============================================================================
# Stage 6: Named Entity Extraction
# ============================================================================

class EntityExtractor:
    """Extract named entities (parties, dates, etc.)"""
    
    def __init__(self):
        logger.info("Initializing Entity Extractor")
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("spaCy model not found")
            self.nlp = None
    
    def extract_parties(self, text: str) -> List[str]:
        """Extract organization and person names"""
        if not self.nlp:
            return []
        
        doc = self.nlp(text[:5000])  # Limit for performance
        parties = [ent.text for ent in doc.ents if ent.label_ in ['ORG', 'PERSON']]
        return list(set(parties))  # Remove duplicates
    
    def extract_dates(self, text: str) -> List[str]:
        """Extract date patterns"""
        if not self.nlp:
            return []
        
        doc = self.nlp(text[:5000])
        dates = [ent.text for ent in doc.ents if ent.label_ == 'DATE']
        return list(set(dates))


# ============================================================================
# Main Orchestrator
# ============================================================================

class LegalDocumentAnalyzer:
    """Main orchestration system for end-to-end analysis"""
    
    def __init__(self, llm_provider: str = "claude"):
        logger.info("Initializing Legal Document Analyzer")
        
        self.ocr = OCRProcessor()
        self.parser = TextParser()
        self.clause_extractor = LegalClauseExtractor()
        self.rag = RAGPipeline()
        self.llm = LLMAnalyzer(model_provider=llm_provider)
        self.entity_extractor = EntityExtractor()
        
        self.model_version = "v1.0.0"
    
    def analyze_document(self, file_path: str) -> DocumentAnalysisResult:
        """Execute complete analysis pipeline"""
        import time
        start_time = time.time()
        
        logger.info(f"Starting analysis of {file_path}")
        
        # Stage 1: Extract text via OCR
        extracted_text = self.ocr.process_document(file_path)
        if not extracted_text:
            extracted_text = self._read_text_file(file_path)
        
        # Stage 2: Parse and segment
        clean_text = self.parser.clean_text(extracted_text)
        sections = self.parser.segment_into_sections(clean_text)
        sentences = self.parser.extract_sentences(clean_text)
        
        # Stage 3: Extract clauses
        clauses = self.clause_extractor.extract_clauses(sections)
        
        # Stage 4: Build RAG context
        self.rag.add_documents(sentences[:100])  # Limit for performance
        
        # Stage 5: LLM analysis
        risks = self.llm.analyze_risks(clean_text, clauses)
        summary = self.llm.generate_summary(clean_text, clauses)
        
        # Stage 6: Extract entities
        parties = self.entity_extractor.extract_parties(clean_text)
        dates = self.entity_extractor.extract_dates(clean_text)
        
        # Calculate overall risk score
        overall_risk_score = self._calculate_overall_risk(risks, clauses)
        
        # Create metadata
        metadata = DocumentMetadata(
            file_name=Path(file_path).name,
            file_type=Path(file_path).suffix,
            file_size=os.path.getsize(file_path),
            upload_date=datetime.now().isoformat(),
            document_type="contract",  # Could be enhanced
            hash=self._compute_file_hash(file_path)
        )
        
        # Generate document ID
        doc_id = f"DOC_{metadata.hash[:8]}_{int(time.time())}"
        
        processing_time = time.time() - start_time
        
        result = DocumentAnalysisResult(
            document_id=doc_id,
            metadata=metadata,
            extracted_text=clean_text[:2000],  # Truncate for storage
            extracted_clauses=clauses,
            risk_assessments=risks,
            summary=summary,
            key_parties=parties[:10],  # Limit
            key_dates=dates[:10],
            overall_risk_score=overall_risk_score,
            processing_time=processing_time,
            model_version=self.model_version
        )
        
        logger.info(f"Analysis complete in {processing_time:.2f}s")
        return result
    
    def _read_text_file(self, file_path: str) -> str:
        """Read text file directly"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error reading file: {str(e)}")
            return ""
    
    def _compute_file_hash(self, file_path: str) -> str:
        """Compute SHA256 hash of file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def _calculate_overall_risk(self, risks: List[RiskAssessment], 
                               clauses: List[ExtractedClause]) -> float:
        """Calculate overall document risk score (0-1)"""
        if not risks:
            return 0.0
        
        severity_scores = {
            'critical': 1.0,
            'high': 0.8,
            'medium': 0.5,
            'low': 0.2
        }
        
        scores = [severity_scores.get(r.severity, 0.3) for r in risks]
        overall_score = sum(scores) / len(scores) if scores else 0.0
        
        return min(1.0, overall_score)


# ============================================================================
# Demo & Testing
# ============================================================================

def main():
    """Demo of the legal document analysis system"""
    
    # Initialize analyzer
    analyzer = LegalDocumentAnalyzer(llm_provider="claude")
    
    # Example: Create a test document
    test_doc_path = "/tmp/test_contract.txt"
    test_content = """
    SERVICE AGREEMENT
    
    This Service Agreement ("Agreement") is entered into on January 15, 2024.
    
    1. LIABILITY AND INDEMNIFICATION
    Provider shall not be liable for indirect or consequential damages. 
    Client agrees to indemnify Provider against all claims arising from Client's use.
    
    2. TERMINATION CLAUSE
    Either party may terminate this Agreement with 30 days written notice.
    Upon termination, all obligations cease except for payment obligations.
    
    3. CONFIDENTIALITY
    Both parties agree to maintain confidentiality of proprietary information.
    This obligation survives termination for a period of 3 years.
    
    4. PAYMENT TERMS
    Client shall pay monthly fees of $5,000 due within 30 days of invoice.
    Late payments will accrue interest at 1.5% per month.
    """
    
    # Write test document
    with open(test_doc_path, 'w') as f:
        f.write(test_content)
    
    logger.info(f"Created test document at {test_doc_path}")
    
    # Analyze
    result = analyzer.analyze_document(test_doc_path)
    
    # Output results
    print("\n" + "="*80)
    print("LEGAL DOCUMENT ANALYSIS RESULTS")
    print("="*80)
    print(f"\nDocument ID: {result.document_id}")
    print(f"File: {result.metadata.file_name}")
    print(f"Processing Time: {result.processing_time:.2f}s")
    print(f"Overall Risk Score: {result.overall_risk_score:.2f}/1.0")
    
    print(f"\n--- SUMMARY ---")
    print(result.summary)
    
    print(f"\n--- EXTRACTED CLAUSES ({len(result.extracted_clauses)}) ---")
    for clause in result.extracted_clauses:
        print(f"  • {clause.clause_type.upper()} (Risk: {clause.risk_level})")
        print(f"    Confidence: {clause.confidence:.2f}")
    
    print(f"\n--- RISK ASSESSMENTS ({len(result.risk_assessments)}) ---")
    for risk in result.risk_assessments:
        print(f"  • [{risk.severity.upper()}] {risk.risk_type}")
        print(f"    {risk.description}")
        print(f"    → {risk.recommendation}")
    
    print(f"\n--- KEY PARTIES ---")
    for party in result.key_parties:
        print(f"  • {party}")
    
    print(f"\n--- KEY DATES ---")
    for date in result.key_dates:
        print(f"  • {date}")
    
    # Export results to JSON
    output_path = "/tmp/analysis_result.json"
    export_result(result, output_path)
    print(f"\n✓ Full results exported to {output_path}")


def export_result(result: DocumentAnalysisResult, output_path: str):
    """Export analysis result to JSON"""
    data = {
        'document_id': result.document_id,
        'metadata': asdict(result.metadata),
        'summary': result.summary,
        'overall_risk_score': result.overall_risk_score,
        'extracted_clauses': [asdict(c) for c in result.extracted_clauses],
        'risk_assessments': [asdict(r) for r in result.risk_assessments],
        'key_parties': result.key_parties,
        'key_dates': result.key_dates,
        'processing_time': result.processing_time,
        'model_version': result.model_version
    }
    
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    logger.info(f"Results exported to {output_path}")


if __name__ == "__main__":
    main()
