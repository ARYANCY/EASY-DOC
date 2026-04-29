"""
Utility functions and helpers for the legal document analysis system
"""

import json
import csv
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
import logging

from main import DocumentAnalysisResult, asdict

logger = logging.getLogger(__name__)


class ResultsExporter:
    """Export analysis results in various formats"""
    
    @staticmethod
    def export_json(result: DocumentAnalysisResult, output_path: str):
        """Export results as JSON"""
        data = {
            'document_id': result.document_id,
            'metadata': asdict(result.metadata),
            'summary': result.summary,
            'overall_risk_score': round(result.overall_risk_score, 3),
            'extracted_clauses': [asdict(c) for c in result.extracted_clauses],
            'risk_assessments': [asdict(r) for r in result.risk_assessments],
            'key_parties': result.key_parties,
            'key_dates': result.key_dates,
            'processing_time': round(result.processing_time, 2),
            'model_version': result.model_version,
            'timestamp': datetime.now().isoformat()
        }
        
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Results exported to JSON: {output_path}")
    
    @staticmethod
    def export_csv(result: DocumentAnalysisResult, output_path: str):
        """Export results as CSV"""
        rows = []
        
        # Document info row
        rows.append({
            'Type': 'Document',
            'Document ID': result.document_id,
            'File': result.metadata.file_name,
            'Risk Score': round(result.overall_risk_score, 3),
            'Processing Time': f"{result.processing_time:.2f}s",
            'Summary': result.summary
        })
        
        # Clause rows
        for clause in result.extracted_clauses:
            rows.append({
                'Type': 'Clause',
                'Clause Type': clause.clause_type,
                'Risk Level': clause.risk_level,
                'Confidence': round(clause.confidence, 2),
                'Page': clause.page_number
            })
        
        # Risk assessment rows
        for risk in result.risk_assessments:
            rows.append({
                'Type': 'Risk',
                'Risk Type': risk.risk_type,
                'Severity': risk.severity,
                'Description': risk.description,
                'Recommendation': risk.recommendation
            })
        
        # Write CSV
        if rows:
            keys = rows[0].keys()
            with open(output_path, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(rows)
        
        logger.info(f"Results exported to CSV: {output_path}")
    
    @staticmethod
    def export_html_report(result: DocumentAnalysisResult, output_path: str):
        """Export results as HTML report"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Legal Document Analysis Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #2c3e50; color: white; padding: 20px; }}
                .section {{ margin: 20px 0; padding: 15px; border-left: 4px solid #3498db; }}
                .risk-high {{ background-color: #ffcccc; }}
                .risk-medium {{ background-color: #fff3cd; }}
                .risk-low {{ background-color: #d4edda; }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #3498db; color: white; }}
                .risk-score {{ font-size: 24px; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Legal Document Analysis Report</h1>
                <p>Document ID: {result.document_id}</p>
                <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <div class="section">
                <h2>Document Overview</h2>
                <p><strong>File:</strong> {result.metadata.file_name}</p>
                <p><strong>Type:</strong> {result.metadata.document_type}</p>
                <p><strong>Overall Risk Score:</strong> 
                    <span class="risk-score">{result.overall_risk_score:.2f}/1.0</span>
                </p>
            </div>
            
            <div class="section">
                <h2>Executive Summary</h2>
                <p>{result.summary}</p>
            </div>
            
            <div class="section">
                <h2>Extracted Clauses</h2>
                <table>
                    <tr>
                        <th>Clause Type</th>
                        <th>Risk Level</th>
                        <th>Confidence</th>
                        <th>Page</th>
                    </tr>
        """
        
        for clause in result.extracted_clauses:
            risk_class = f"risk-{clause.risk_level}"
            html += f"""
                    <tr class="{risk_class}">
                        <td>{clause.clause_type}</td>
                        <td>{clause.risk_level.upper()}</td>
                        <td>{clause.confidence:.2f}</td>
                        <td>{clause.page_number}</td>
                    </tr>
            """
        
        html += """
                </table>
            </div>
            
            <div class="section">
                <h2>Risk Assessments</h2>
                <table>
                    <tr>
                        <th>Risk Type</th>
                        <th>Severity</th>
                        <th>Description</th>
                        <th>Recommendation</th>
                    </tr>
        """
        
        for risk in result.risk_assessments:
            risk_class = f"risk-{risk.severity.lower() if risk.severity != 'critical' else 'high'}"
            html += f"""
                    <tr class="{risk_class}">
                        <td>{risk.risk_type}</td>
                        <td>{risk.severity.upper()}</td>
                        <td>{risk.description}</td>
                        <td>{risk.recommendation}</td>
                    </tr>
            """
        
        html += """
                </table>
            </div>
            
            <div class="section">
                <h2>Key Parties & Dates</h2>
        """
        
        if result.key_parties:
            html += "<p><strong>Parties:</strong> " + ", ".join(result.key_parties) + "</p>"
        
        if result.key_dates:
            html += "<p><strong>Key Dates:</strong> " + ", ".join(result.key_dates) + "</p>"
        
        html += f"""
            </div>
            
            <div class="section">
                <p style="font-size: 12px; color: #666;">
                    Processing Time: {result.processing_time:.2f}s | Model Version: {result.model_version}
                </p>
            </div>
        </body>
        </html>
        """
        
        with open(output_path, 'w') as f:
            f.write(html)
        
        logger.info(f"Results exported to HTML: {output_path}")


class TextProcessor:
    """Additional text processing utilities"""
    
    @staticmethod
    def highlight_risks(text: str, risks: List[Dict[str, Any]]) -> str:
        """Create annotated text with risk highlights"""
        highlighted = text
        for risk in risks:
            # Simple highlighting (can be enhanced with more sophisticated NLP)
            if 'location' in risk:
                highlighted = highlighted.replace(
                    risk['location'],
                    f"[RISK: {risk['severity']}] {risk['location']}"
                )
        return highlighted
    
    @staticmethod
    def extract_key_terms(text: str, num_terms: int = 20) -> List[str]:
        """Extract key terms using TF-IDF-like approach"""
        from collections import Counter
        
        # Simple approach: most frequent long words
        words = text.lower().split()
        long_words = [w.strip('.,!?;:') for w in words if len(w) > 5]
        common_words = {
            'about', 'above', 'after', 'before', 'between', 'during',
            'without', 'through', 'under', 'over', 'shall', 'which',
            'where', 'when', 'always', 'never', 'other', 'these'
        }
        
        key_words = [w for w in long_words if w not in common_words and len(w) > 4]
        counter = Counter(key_words)
        
        return [word for word, _ in counter.most_common(num_terms)]


class ComparisonAnalyzer:
    """Compare multiple documents or results"""
    
    @staticmethod
    def compare_risk_profiles(results: List[DocumentAnalysisResult]) -> Dict:
        """Compare risk profiles across multiple documents"""
        comparison = {
            'document_count': len(results),
            'average_risk_score': sum(r.overall_risk_score for r in results) / len(results),
            'highest_risk': max(r.overall_risk_score for r in results),
            'lowest_risk': min(r.overall_risk_score for r in results),
            'clause_distribution': {}
        }
        
        # Count clause types
        for result in results:
            for clause in result.extracted_clauses:
                clause_type = clause.clause_type
                comparison['clause_distribution'][clause_type] = \
                    comparison['clause_distribution'].get(clause_type, 0) + 1
        
        return comparison


class PerformanceMetrics:
    """Track and report performance metrics"""
    
    def __init__(self):
        self.metrics = {
            'total_documents': 0,
            'total_processing_time': 0.0,
            'average_processing_time': 0.0,
            'total_clauses_extracted': 0,
            'total_risks_identified': 0,
            'errors': 0
        }
    
    def record_analysis(self, result: DocumentAnalysisResult):
        """Record metrics from an analysis"""
        self.metrics['total_documents'] += 1
        self.metrics['total_processing_time'] += result.processing_time
        self.metrics['total_clauses_extracted'] += len(result.extracted_clauses)
        self.metrics['total_risks_identified'] += len(result.risk_assessments)
        self.metrics['average_processing_time'] = \
            self.metrics['total_processing_time'] / self.metrics['total_documents']
    
    def record_error(self):
        """Record an error"""
        self.metrics['errors'] += 1
    
    def get_report(self) -> str:
        """Generate performance report"""
        report = f"""
        ╔════════════════════════════════════════╗
        ║     PERFORMANCE METRICS REPORT         ║
        ╚════════════════════════════════════════╝
        
        Total Documents Analyzed: {self.metrics['total_documents']}
        Total Processing Time: {self.metrics['total_processing_time']:.2f}s
        Average Time per Document: {self.metrics['average_processing_time']:.2f}s
        Total Clauses Extracted: {self.metrics['total_clauses_extracted']}
        Total Risks Identified: {self.metrics['total_risks_identified']}
        Processing Errors: {self.metrics['errors']}
        """
        return report
    
    def to_dict(self) -> Dict:
        """Export metrics as dictionary"""
        return self.metrics.copy()


# ============================================================================
# Batch Processing
# ============================================================================

class BatchProcessor:
    """Process multiple documents in batch"""
    
    def __init__(self, analyzer):
        self.analyzer = analyzer
        self.metrics = PerformanceMetrics()
    
    def process_directory(self, directory: str) -> List[DocumentAnalysisResult]:
        """Process all documents in a directory"""
        results = []
        doc_path = Path(directory)
        
        supported_extensions = {'.txt', '.pdf', '.png', '.jpg', '.jpeg'}
        files = [f for f in doc_path.glob('*') 
                if f.suffix.lower() in supported_extensions]
        
        logger.info(f"Processing {len(files)} documents from {directory}")
        
        for file in files:
            try:
                result = self.analyzer.analyze_document(str(file))
                results.append(result)
                self.metrics.record_analysis(result)
            except Exception as e:
                logger.error(f"Error processing {file}: {str(e)}")
                self.metrics.record_error()
        
        return results
    
    def get_summary(self) -> str:
        """Get batch processing summary"""
        return self.metrics.get_report()
