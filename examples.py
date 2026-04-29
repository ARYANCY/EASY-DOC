"""
Examples and demos for the Legal Document Analysis System
Shows common use cases and integration patterns
"""

from main import LegalDocumentAnalyzer, DocumentAnalysisResult
from utils import ResultsExporter, BatchProcessor, ComparisonAnalyzer, TextProcessor
import json
from typing import List


# ============================================================================
# Example 1: Basic Single Document Analysis
# ============================================================================

def example_basic_analysis():
    """Analyze a single document and display results"""
    print("\n" + "="*80)
    print("EXAMPLE 1: Basic Document Analysis")
    print("="*80)
    
    # Initialize analyzer
    analyzer = LegalDocumentAnalyzer(llm_provider="claude")
    
    # Analyze document
    result = analyzer.analyze_document("./sample_contract.pdf")
    
    # Display results
    print(f"\nDocument ID: {result.document_id}")
    print(f"Overall Risk Score: {result.overall_risk_score:.2f}/1.0")
    print(f"\nExecutive Summary:\n{result.summary}")
    
    print(f"\nExtracted Clauses:")
    for clause in result.extracted_clauses:
        print(f"  • {clause.clause_type.upper()} (Risk: {clause.risk_level})")
    
    print(f"\nRisk Assessments:")
    for risk in result.risk_assessments:
        print(f"  • [{risk.severity.upper()}] {risk.risk_type}: {risk.description}")
    
    return result


# ============================================================================
# Example 2: Batch Processing Multiple Documents
# ============================================================================

def example_batch_processing():
    """Process multiple documents in a directory"""
    print("\n" + "="*80)
    print("EXAMPLE 2: Batch Document Processing")
    print("="*80)
    
    analyzer = LegalDocumentAnalyzer(llm_provider="claude")
    batch = BatchProcessor(analyzer)
    
    # Process all documents in a directory
    results = batch.process_directory("./contracts/")
    
    print(f"\nProcessed {len(results)} documents")
    
    # Calculate statistics
    avg_risk = sum(r.overall_risk_score for r in results) / len(results)
    high_risk_docs = sum(1 for r in results if r.overall_risk_score > 0.7)
    
    print(f"Average Risk Score: {avg_risk:.2f}")
    print(f"High Risk Documents: {high_risk_docs}")
    
    # Export results
    for result in results:
        ResultsExporter.export_json(result, f"./output/{result.document_id}.json")
        ResultsExporter.export_html_report(result, f"./output/{result.document_id}.html")
    
    print(f"\n{batch.get_summary()}")
    
    return results


# ============================================================================
# Example 3: Export Analysis in Multiple Formats
# ============================================================================

def example_export_formats(result: DocumentAnalysisResult):
    """Export analysis results in different formats"""
    print("\n" + "="*80)
    print("EXAMPLE 3: Export Formats")
    print("="*80)
    
    # Export as JSON
    ResultsExporter.export_json(result, "./output/analysis.json")
    print("✓ Exported to JSON")
    
    # Export as CSV
    ResultsExporter.export_csv(result, "./output/analysis.csv")
    print("✓ Exported to CSV")
    
    # Export as HTML report
    ResultsExporter.export_html_report(result, "./output/report.html")
    print("✓ Exported to HTML Report")


# ============================================================================
# Example 4: Comparing Multiple Documents
# ============================================================================

def example_comparison(results: List[DocumentAnalysisResult]):
    """Compare risk profiles across multiple documents"""
    print("\n" + "="*80)
    print("EXAMPLE 4: Document Comparison")
    print("="*80)
    
    comparison = ComparisonAnalyzer.compare_risk_profiles(results)
    
    print(f"\nComparison Results:")
    print(f"  Total Documents: {comparison['document_count']}")
    print(f"  Average Risk Score: {comparison['average_risk_score']:.2f}")
    print(f"  Highest Risk: {comparison['highest_risk']:.2f}")
    print(f"  Lowest Risk: {comparison['lowest_risk']:.2f}")
    
    print(f"\nClause Type Distribution:")
    for clause_type, count in comparison['clause_distribution'].items():
        print(f"  • {clause_type}: {count}")


# ============================================================================
# Example 5: Extract Key Terms & Information
# ============================================================================

def example_key_terms(result: DocumentAnalysisResult):
    """Extract and display key terms"""
    print("\n" + "="*80)
    print("EXAMPLE 5: Key Terms Extraction")
    print("="*80)
    
    processor = TextProcessor()
    
    # Extract key terms from the document
    key_terms = processor.extract_key_terms(result.extracted_text, num_terms=15)
    
    print(f"\nTop Key Terms:")
    for i, term in enumerate(key_terms, 1):
        print(f"  {i}. {term}")
    
    print(f"\nKey Parties:")
    for party in result.key_parties:
        print(f"  • {party}")
    
    print(f"\nKey Dates:")
    for date in result.key_dates:
        print(f"  • {date}")


# ============================================================================
# Example 6: Risk Scoring & Severity Analysis
# ============================================================================

def example_risk_analysis(result: DocumentAnalysisResult):
    """Detailed risk analysis and recommendations"""
    print("\n" + "="*80)
    print("EXAMPLE 6: Risk Analysis & Recommendations")
    print("="*80)
    
    print(f"\nOverall Risk Score: {result.overall_risk_score:.2f}/1.0")
    
    # Categorize risks
    critical_risks = [r for r in result.risk_assessments if r.severity == 'critical']
    high_risks = [r for r in result.risk_assessments if r.severity == 'high']
    medium_risks = [r for r in result.risk_assessments if r.severity == 'medium']
    
    print(f"\nRisk Breakdown:")
    print(f"  🔴 Critical: {len(critical_risks)}")
    print(f"  🟠 High: {len(high_risks)}")
    print(f"  🟡 Medium: {len(medium_risks)}")
    
    if critical_risks or high_risks:
        print(f"\n⚠️ ACTION REQUIRED - High Priority Risks:")
        for risk in critical_risks + high_risks:
            print(f"\n  [{risk.severity.upper()}] {risk.risk_type}")
            print(f"  Description: {risk.description}")
            print(f"  Recommendation: {risk.recommendation}")
            print(f"  Confidence: {risk.confidence_score:.2%}")


# ============================================================================
# Example 7: Clause Summary by Type
# ============================================================================

def example_clause_summary(result: DocumentAnalysisResult):
    """Summarize clauses by type and risk level"""
    print("\n" + "="*80)
    print("EXAMPLE 7: Clause Summary by Type")
    print("="*80)
    
    # Group clauses by type
    clause_groups = {}
    for clause in result.extracted_clauses:
        if clause.clause_type not in clause_groups:
            clause_groups[clause.clause_type] = []
        clause_groups[clause.clause_type].append(clause)
    
    print(f"\nClauses by Type:")
    for clause_type, clauses in sorted(clause_groups.items()):
        high_risk = sum(1 for c in clauses if c.risk_level == 'high')
        medium_risk = sum(1 for c in clauses if c.risk_level == 'medium')
        
        print(f"\n  {clause_type.upper()}:")
        print(f"    Count: {len(clauses)}")
        print(f"    High Risk: {high_risk}, Medium Risk: {medium_risk}")
        print(f"    Avg Confidence: {sum(c.confidence for c in clauses) / len(clauses):.2%}")


# ============================================================================
# Example 8: Custom Analysis Report
# ============================================================================

def example_custom_report(result: DocumentAnalysisResult):
    """Generate a custom executive report"""
    print("\n" + "="*80)
    print("EXAMPLE 8: Executive Report")
    print("="*80)
    
    report = f"""
╔════════════════════════════════════════════════════════════════════════════╗
║                     LEGAL DOCUMENT ANALYSIS REPORT                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Document Information
────────────────────────────────────────────────────────────────────────────
  ID:                {result.document_id}
  File:              {result.metadata.file_name}
  Document Type:     {result.metadata.document_type}
  Upload Date:       {result.metadata.upload_date}
  Processing Time:   {result.processing_time:.2f}s

Key Metrics
────────────────────────────────────────────────────────────────────────────
  Overall Risk Score:    {result.overall_risk_score:.2f}/1.0
  Clauses Extracted:     {len(result.extracted_clauses)}
  Risks Identified:      {len(result.risk_assessments)}
  Parties Identified:    {len(result.key_parties)}
  Key Dates Found:       {len(result.key_dates)}

Executive Summary
────────────────────────────────────────────────────────────────────────────
  {result.summary}

Top Risks
────────────────────────────────────────────────────────────────────────────
"""
    
    top_risks = sorted(
        result.risk_assessments,
        key=lambda r: {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}.get(r.severity, 0),
        reverse=True
    )[:5]
    
    for i, risk in enumerate(top_risks, 1):
        report += f"""
  {i}. [{risk.severity.upper()}] {risk.risk_type}
     {risk.description}
     → {risk.recommendation}
"""
    
    report += f"""
Recommendations
────────────────────────────────────────────────────────────────────────────
"""
    
    if result.overall_risk_score > 0.7:
        report += """
  1. URGENT: Schedule immediate legal review before execution
  2. Negotiate high-severity risk clauses with counterparty
  3. Consider bringing in specialized counsel for contested terms
"""
    elif result.overall_risk_score > 0.4:
        report += """
  1. RECOMMENDED: Legal review advised for medium-risk items
  2. Focus negotiation on liability and termination clauses
  3. Document any amendments or revisions
"""
    else:
        report += """
  1. Document appears to be standard market terms
  2. Standard legal review recommended
  3. Maintain records for future reference
"""
    
    report += f"""
Generated: {result.metadata.upload_date}
Model Version: {result.model_version}
════════════════════════════════════════════════════════════════════════════
"""
    
    print(report)
    
    return report


# ============================================================================
# Example 9: API Usage (REST endpoints)
# ============================================================================

def example_api_usage():
    """Show how to use the REST API"""
    print("\n" + "="*80)
    print("EXAMPLE 9: REST API Usage")
    print("="*80)
    
    print("""
# Start the API server
$ python -m uvicorn api:app --reload --port 8000

# Single document analysis
$ curl -X POST "http://localhost:8000/analyze" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@contract.pdf"

# Response example:
{
  "status": "success",
  "document_id": "DOC_a1b2c3d4_1704067200",
  "summary": "Service agreement with moderate liability provisions...",
  "overall_risk_score": 0.65,
  "extracted_clauses": 8,
  "risk_assessments": 5,
  "processing_time": 3.45
}

# Batch processing
$ curl -X POST "http://localhost:8000/analyze/batch" \\
  -F "files=@contract1.pdf" \\
  -F "files=@contract2.pdf" \\
  -F "files=@contract3.pdf"

# Health check
$ curl http://localhost:8000/health

# Performance metrics
$ curl http://localhost:8000/metrics

# View API documentation
Navigate to: http://localhost:8000/docs
""")


# ============================================================================
# Example 10: Integration Patterns
# ============================================================================

def example_integration_patterns():
    """Show integration patterns with other systems"""
    print("\n" + "="*80)
    print("EXAMPLE 10: Integration Patterns")
    print("="*80)
    
    print("""
1. DOCUMENT MANAGEMENT SYSTEM INTEGRATION
   - Upload document to DMS
   - Send to legal analyzer
   - Store results in document metadata
   - Tag documents by risk level

2. SLACK NOTIFICATIONS
   - Analyze document
   - If risk_score > 0.7, send Slack alert
   - Include summary and action items
   - Link to full HTML report

3. DATABASE STORAGE
   - Store results in PostgreSQL
   - Index by document type, party names
   - Enable full-text search
   - Track amendment history

4. WORKFLOW AUTOMATION
   - Trigger analysis on document upload
   - Route high-risk docs to legal team
   - Auto-approve low-risk documents
   - Generate approval workflows

5. REPORTING DASHBOARD
   - Aggregate risk scores by department
   - Track trends over time
   - Monthly risk reports
   - Contract performance metrics

6. COMPLIANCE TRACKING
   - Monitor compliance-related clauses
   - Track amendments
   - Maintain audit trail
   - Alert on obligations

Example:
    from main import LegalDocumentAnalyzer
    import slack_sdk
    
    analyzer = LegalDocumentAnalyzer()
    result = analyzer.analyze_document("contract.pdf")
    
    if result.overall_risk_score > 0.7:
        client = slack_sdk.WebClient(token=os.environ['SLACK_BOT_TOKEN'])
        client.chat_postMessage(
            channel="#legal-alerts",
            text=f"⚠️ HIGH RISK: {result.metadata.file_name}\\n{result.summary}"
        )
""")


# ============================================================================
# Example 11: Performance Optimization
# ============================================================================

def example_performance_optimization():
    """Tips for optimizing performance"""
    print("\n" + "="*80)
    print("EXAMPLE 11: Performance Optimization")
    print("="*80)
    
    print("""
OPTIMIZATION TIPS:

1. CACHING
   - Enable result caching for repeated documents
   - Use document hash as cache key
   - Reduce LLM API calls

2. BATCH PROCESSING
   - Process multiple documents efficiently
   - Parallelize independent analyses
   - Reduces overhead

3. MODEL SELECTION
   - Use faster embeddings for retrieval
   - Fine-tune clause extraction patterns
   - Cache spaCy models

4. INFRASTRUCTURE
   - Deploy API with uvicorn workers
   - Use PostgreSQL for large-scale storage
   - Implement Redis caching layer
   - Consider GPU for embeddings

5. DOCUMENT PRE-PROCESSING
   - Clean OCR output before analysis
   - Segment large documents
   - Skip redundant sections

Benchmarks (single document):
  - OCR: 0.5-2s (depends on image quality)
  - Text Processing: 0.2-0.5s
  - Clause Extraction: 0.3-0.8s
  - LLM Analysis: 2-5s
  - Total: 3-8 seconds
""")


# ============================================================================
# Main Demo Runner
# ============================================================================

def run_all_examples():
    """Run all examples sequentially"""
    print("\n" + "🚀 "*40)
    print("LEGAL DOCUMENT ANALYSIS SYSTEM - EXAMPLES")
    print("🚀 "*40)
    
    try:
        # Example 1: Basic analysis
        result = example_basic_analysis()
        
        # Example 3: Export formats
        example_export_formats(result)
        
        # Example 5: Key terms
        example_key_terms(result)
        
        # Example 6: Risk analysis
        example_risk_analysis(result)
        
        # Example 7: Clause summary
        example_clause_summary(result)
        
        # Example 8: Executive report
        report = example_custom_report(result)
        
        # Examples 9-11: Info examples (no execution needed)
        example_api_usage()
        example_integration_patterns()
        example_performance_optimization()
        
    except FileNotFoundError:
        print("\n⚠️ Sample file not found. Please provide a test document.")
        print("   Run: analyzer.analyze_document('path/to/your/contract.pdf')")


if __name__ == "__main__":
    run_all_examples()
