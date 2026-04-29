"""
Unit tests for the Legal Document Analysis System
Run with: pytest tests.py -v
"""

import pytest
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

from main import (
    OCRProcessor, TextParser, LegalClauseExtractor,
    RAGPipeline, LLMAnalyzer, EntityExtractor,
    LegalDocumentAnalyzer, DocumentMetadata, ExtractedClause,
    RiskAssessment
)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def sample_text():
    """Sample legal text for testing"""
    return """
    SERVICE AGREEMENT
    
    This Agreement is between Provider and Client.
    
    1. LIABILITY
    Provider shall not be liable for indirect damages.
    Client indemnifies Provider against all claims.
    
    2. TERMINATION
    Either party may terminate with 30 days notice.
    
    3. CONFIDENTIALITY
    Maintain confidentiality of proprietary information.
    """


@pytest.fixture
def sample_contract_file(sample_text):
    """Create a temporary test document"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(sample_text)
        f.flush()
        yield f.name
    Path(f.name).unlink()


# ============================================================================
# OCR Processor Tests
# ============================================================================

class TestOCRProcessor:
    
    def test_initialization(self):
        """Test OCRProcessor initialization"""
        ocr = OCRProcessor()
        assert ocr is not None
        assert '.pdf' in ocr.supported_formats
    
    def test_process_document_unsupported_format(self):
        """Test handling of unsupported file formats"""
        ocr = OCRProcessor()
        result = ocr.process_document("test.doc")
        assert result == ""
    
    @patch('builtins.open', create=True)
    def test_process_text_file(self, mock_open, sample_contract_file):
        """Test processing text files"""
        ocr = OCRProcessor()
        # Should gracefully handle text files
        result = ocr.process_document(sample_contract_file)
        assert result is not None


# ============================================================================
# Text Parser Tests
# ============================================================================

class TestTextParser:
    
    def test_initialization(self):
        """Test TextParser initialization"""
        parser = TextParser()
        assert parser is not None
    
    def test_clean_text(self):
        """Test text cleaning"""
        parser = TextParser()
        dirty_text = "This   is    a   test\n\n\nwith   extra   spaces"
        clean = parser.clean_text(dirty_text)
        assert "   " not in clean
        assert clean.count(' ') < dirty_text.count(' ')
    
    def test_segment_into_sections(self, sample_text):
        """Test text segmentation"""
        parser = TextParser()
        sections = parser.segment_into_sections(sample_text)
        assert len(sections) > 0
        assert any('liability' in s['content'] for s in sections)
    
    def test_extract_sentences(self, sample_text):
        """Test sentence extraction"""
        parser = TextParser()
        sentences = parser.extract_sentences(sample_text)
        assert len(sentences) > 0


# ============================================================================
# Legal Clause Extractor Tests
# ============================================================================

class TestLegalClauseExtractor:
    
    def test_initialization(self):
        """Test LegalClauseExtractor initialization"""
        extractor = LegalClauseExtractor()
        assert extractor is not None
    
    def test_classify_liability_clause(self):
        """Test liability clause classification"""
        extractor = LegalClauseExtractor()
        text = "Provider shall not be liable for any damages"
        clause_type, confidence = extractor.classify_clause(text)
        assert clause_type == 'liability'
        assert confidence > 0
    
    def test_classify_termination_clause(self):
        """Test termination clause classification"""
        extractor = LegalClauseExtractor()
        text = "Either party may terminate this agreement"
        clause_type, confidence = extractor.classify_clause(text)
        assert clause_type == 'termination'
        assert confidence > 0
    
    def test_assess_risk_level_high(self):
        """Test high risk assessment"""
        extractor = LegalClauseExtractor()
        text = "shall not limit liability perpetually irrevocable"
        risk = extractor.assess_risk_level(text)
        assert risk == 'high'
    
    def test_assess_risk_level_low(self):
        """Test low risk assessment"""
        extractor = LegalClauseExtractor()
        text = "optional voluntary can may"
        risk = extractor.assess_risk_level(text)
        assert risk == 'low'
    
    def test_extract_clauses(self, sample_text):
        """Test full clause extraction"""
        parser = TextParser()
        extractor = LegalClauseExtractor()
        
        sections = parser.segment_into_sections(sample_text)
        clauses = extractor.extract_clauses(sections)
        
        assert len(clauses) > 0
        assert all(isinstance(c, ExtractedClause) for c in clauses)


# ============================================================================
# RAG Pipeline Tests
# ============================================================================

class TestRAGPipeline:
    
    def test_initialization(self):
        """Test RAG pipeline initialization"""
        rag = RAGPipeline()
        assert rag is not None
    
    def test_add_documents(self):
        """Test adding documents to RAG"""
        rag = RAGPipeline()
        docs = ["Document 1", "Document 2", "Document 3"]
        rag.add_documents(docs)
        assert len(rag.documents) == 3
    
    def test_retrieve_relevant_context(self):
        """Test document retrieval"""
        rag = RAGPipeline()
        docs = [
            "This is about liability and damages",
            "This discusses termination and notice",
            "This covers payment and fees"
        ]
        rag.add_documents(docs)
        
        results = rag.retrieve_relevant_context("liability", top_k=1)
        assert len(results) > 0
    
    def test_retrieve_empty_database(self):
        """Test retrieval with empty database"""
        rag = RAGPipeline()
        results = rag.retrieve_relevant_context("test")
        assert len(results) == 0


# ============================================================================
# Entity Extractor Tests
# ============================================================================

class TestEntityExtractor:
    
    def test_initialization(self):
        """Test EntityExtractor initialization"""
        extractor = EntityExtractor()
        assert extractor is not None
    
    def test_extract_parties(self, sample_text):
        """Test party extraction"""
        extractor = EntityExtractor()
        if extractor.nlp:  # Only test if spaCy model loaded
            parties = extractor.extract_parties(sample_text)
            # May or may not find parties depending on spaCy model
            assert isinstance(parties, list)
    
    def test_extract_dates(self, sample_text):
        """Test date extraction"""
        extractor = EntityExtractor()
        if extractor.nlp:
            dates = extractor.extract_dates(sample_text)
            assert isinstance(dates, list)


# ============================================================================
# LLM Analyzer Tests
# ============================================================================

class TestLLMAnalyzer:
    
    def test_initialization_no_provider(self):
        """Test LLM initialization without API keys"""
        analyzer = LLMAnalyzer()
        assert analyzer is not None
    
    def test_mock_risk_analysis(self):
        """Test mock risk analysis"""
        analyzer = LLMAnalyzer()
        clauses = [
            ExtractedClause(
                clause_type='liability',
                text='Test text',
                page_number=1,
                confidence=0.9,
                risk_level='high',
                explanation='Test'
            )
        ]
        risks = analyzer._mock_risk_analysis(clauses)
        assert len(risks) > 0
        assert isinstance(risks[0], RiskAssessment)
    
    def test_mock_summary_generation(self):
        """Test mock summary generation"""
        analyzer = LLMAnalyzer()
        clauses = [
            ExtractedClause(
                clause_type='liability',
                text='Test',
                page_number=1,
                confidence=0.9,
                risk_level='high',
                explanation='Test'
            )
        ]
        summary = analyzer._mock_summary(clauses)
        assert len(summary) > 0
        assert isinstance(summary, str)


# ============================================================================
# Main Analyzer Integration Tests
# ============================================================================

class TestLegalDocumentAnalyzer:
    
    def test_initialization(self):
        """Test main analyzer initialization"""
        analyzer = LegalDocumentAnalyzer()
        assert analyzer is not None
        assert hasattr(analyzer, 'ocr')
        assert hasattr(analyzer, 'parser')
        assert hasattr(analyzer, 'clause_extractor')
    
    def test_compute_file_hash(self, sample_contract_file):
        """Test file hash computation"""
        analyzer = LegalDocumentAnalyzer()
        hash_val = analyzer._compute_file_hash(sample_contract_file)
        
        assert isinstance(hash_val, str)
        assert len(hash_val) == 64  # SHA256 hex length
    
    def test_calculate_overall_risk_empty(self):
        """Test risk calculation with empty risks"""
        analyzer = LegalDocumentAnalyzer()
        score = analyzer._calculate_overall_risk([], [])
        assert score == 0.0
    
    def test_calculate_overall_risk(self):
        """Test risk calculation"""
        analyzer = LegalDocumentAnalyzer()
        risks = [
            RiskAssessment('test', 'high', 'loc', 'desc', 'rec', 0.9),
            RiskAssessment('test', 'medium', 'loc', 'desc', 'rec', 0.5)
        ]
        score = analyzer._calculate_overall_risk(risks, [])
        assert 0 <= score <= 1
    
    def test_analyze_document(self, sample_contract_file):
        """Test complete document analysis"""
        analyzer = LegalDocumentAnalyzer()
        result = analyzer.analyze_document(sample_contract_file)
        
        # Verify result structure
        assert result.document_id
        assert result.metadata
        assert result.extracted_text
        assert 0 <= result.overall_risk_score <= 1
        assert result.processing_time > 0
        assert isinstance(result.extracted_clauses, list)
        assert isinstance(result.risk_assessments, list)
    
    def test_read_text_file(self, sample_contract_file):
        """Test reading text file"""
        analyzer = LegalDocumentAnalyzer()
        content = analyzer._read_text_file(sample_contract_file)
        assert len(content) > 0


# ============================================================================
# Data Model Tests
# ============================================================================

class TestDataModels:
    
    def test_document_metadata(self):
        """Test DocumentMetadata dataclass"""
        meta = DocumentMetadata(
            file_name="test.pdf",
            file_type=".pdf",
            file_size=1000,
            upload_date="2024-01-15",
            document_type="contract",
            hash="abc123"
        )
        assert meta.file_name == "test.pdf"
    
    def test_extracted_clause(self):
        """Test ExtractedClause dataclass"""
        clause = ExtractedClause(
            clause_type="liability",
            text="Test text",
            page_number=1,
            confidence=0.9,
            risk_level="high",
            explanation="Test"
        )
        assert clause.clause_type == "liability"
    
    def test_risk_assessment(self):
        """Test RiskAssessment dataclass"""
        risk = RiskAssessment(
            risk_type="liability",
            severity="high",
            location="Page 1",
            description="Test description",
            recommendation="Test recommendation",
            confidence_score=0.9
        )
        assert risk.severity == "high"


# ============================================================================
# Error Handling Tests
# ============================================================================

class TestErrorHandling:
    
    def test_ocr_nonexistent_file(self):
        """Test OCR with nonexistent file"""
        ocr = OCRProcessor()
        result = ocr.process_document("/nonexistent/file.pdf")
        assert result == ""
    
    def test_analyzer_invalid_file(self):
        """Test analyzer with invalid file"""
        analyzer = LegalDocumentAnalyzer()
        with pytest.raises((FileNotFoundError, OSError)):
            analyzer.analyze_document("/nonexistent/file.pdf")


# ============================================================================
# Performance Tests
# ============================================================================

class TestPerformance:
    
    def test_parsing_performance(self, sample_text):
        """Test parsing performance"""
        import time
        parser = TextParser()
        
        start = time.time()
        sections = parser.segment_into_sections(sample_text)
        elapsed = time.time() - start
        
        assert elapsed < 1  # Should be fast
    
    def test_extraction_performance(self, sample_text):
        """Test clause extraction performance"""
        import time
        parser = TextParser()
        extractor = LegalClauseExtractor()
        
        sections = parser.segment_into_sections(sample_text)
        
        start = time.time()
        clauses = extractor.extract_clauses(sections)
        elapsed = time.time() - start
        
        assert elapsed < 2  # Should complete quickly


# ============================================================================
# Integration Tests
# ============================================================================

class TestIntegration:
    
    def test_end_to_end_analysis(self, sample_contract_file):
        """Test complete analysis pipeline"""
        analyzer = LegalDocumentAnalyzer()
        result = analyzer.analyze_document(sample_contract_file)
        
        # Verify complete result
        assert result.document_id
        assert result.summary
        assert result.overall_risk_score >= 0
        assert len(result.extracted_clauses) >= 0
        assert len(result.risk_assessments) >= 0


# ============================================================================
# Test Runner
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
