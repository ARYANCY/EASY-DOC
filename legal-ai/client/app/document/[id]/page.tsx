'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import RiskPanel from '../../../components/RiskPanel';
import ChatPanel from '../../../components/ChatPanel';
import DocumentSummary from '../../../components/DocumentSummary';
import ClausesPanel from '../../../components/ClausesPanel';
import { exportToPDF } from '../../../lib/utils/exportPDF';
import { Download, Share2, FileText, MessageSquare, Loader2 } from 'lucide-react';
import { getDocument } from '../../../features/document/documentService';
import { getRiskAnalysis } from '../../../features/risk/riskService';
import { getFeatures, FeatureFlags } from '../../../lib/features';

// Sample data - in production, fetch from your API
const sampleClauses = [
  {
    id: '1',
    title: 'Confidentiality',
    description: 'Defines what information is considered confidential.',
    icon: 'confidentiality' as const,
    clauseNumber: '1',
  },
  {
    id: '2',
    title: 'Obligations',
    description: 'Receiving party must maintain confidentiality.',
    icon: 'obligations' as const,
    clauseNumber: '2',
  },
  {
    id: '3',
    title: 'Term',
    description: 'Confidentiality lasts for 3 years from disclosure.',
    icon: 'term' as const,
    clauseNumber: '3',
  },
  {
    id: '4',
    title: 'Governing Law',
    description: 'Agreement governed by the laws of State X.',
    icon: 'governing' as const,
    clauseNumber: '8',
  },
];

const sampleRiskFlags = [
  {
    type: 'liability',
    title: 'Unlimited Liability',
    description: 'The agreement does not limit liability in case of breach.',
    severity: 'high' as const,
  },
  {
    type: 'confidentiality',
    title: 'Broad Confidentiality',
    description: 'The definition of confidential information is too broad and may restrict normal business.',
    severity: 'medium' as const,
  },
  {
    type: 'termination',
    title: 'No Termination Clause',
    description: 'The agreement lacks a clear termination clause for mutual exit.',
    severity: 'medium' as const,
  },
];

export default function DocumentPage() {
  const params = useParams();
  const documentId = params.id as string;
  
  const [activeTab, setActiveTab] = useState<'original' | 'simplified' | 'clauses' | 'summary'>('original');
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState<any>(null);
  const [riskData, setRiskData] = useState<any>(null);
  const [features, setFeatures] = useState<FeatureFlags | null>(null);

  useEffect(() => {
    setFeatures(getFeatures());
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doc, risk] = await Promise.all([
          getDocument(documentId),
          getRiskAnalysis(documentId),
        ]);
        setDocumentData(doc);
        setRiskData(risk);
      } catch (error) {
        console.error('Error fetching document data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [documentId]);

  // Feature flags
  const chatbotEnabled = features?.chatbot ?? true;
  const riskAnalysisEnabled = features?.riskAnalysis ?? true;
  const documentSummaryEnabled = features?.documentSummary ?? true;
  const clauseExtractionEnabled = features?.clauseExtraction ?? true;
  const pdfExportEnabled = features?.pdfExport ?? true;
  const shareReportEnabled = features?.shareReport ?? true;

  const handleExportPDF = () => {
    exportToPDF({
      documentName: documentData?.filename || 'Non-Disclosure Agreement.pdf',
      summary: 'This Non-Disclosure Agreement (NDA) is between two parties where one party agrees to share confidential information and the other agrees not to disclose it. The agreement outlines obligations, exceptions, and the duration of confidentiality.',
      riskScore: 72,
      riskFlags: sampleRiskFlags,
      clauses: sampleClauses.map(c => ({ title: c.title, description: c.description })),
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-purple-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Loading document analysis...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar className="w-64 shrink-0 hidden lg:flex" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          documentName="Non-Disclosure Agreement.pdf"
          uploadDate="20 May 2025 • 12:30 PM"
          fileSize="5.2 MB"
        />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 bg-white rounded-lg p-1 border border-gray-200 w-fit">
              {[
                { id: 'original', label: 'Original Document', icon: FileText, enabled: true },
                { id: 'simplified', label: 'Simplified Version', icon: FileText, enabled: true },
                { id: 'clauses', label: 'Key Clauses', icon: FileText, enabled: clauseExtractionEnabled },
                { id: 'summary', label: 'Summary', icon: FileText, enabled: documentSummaryEnabled },
              ]
                .filter(tab => tab.enabled)
                .map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Column - Document Content */}
              <div className="xl:col-span-2 space-y-6">
                {/* Document Viewer Card */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-gray-100 rounded">
                        <span className="sr-only">Menu</span>
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-2 ml-4">
                        <button className="p-1.5 hover:bg-gray-100 rounded text-gray-600">{'<'}</button>
                        <span className="text-sm text-gray-600">1 / 12</span>
                        <button className="p-1.5 hover:bg-gray-100 rounded text-gray-600">{'>'}</button>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button className="p-1.5 hover:bg-gray-100 rounded text-gray-600">-</button>
                        <span className="text-sm text-gray-600">100%</span>
                        <button className="p-1.5 hover:bg-gray-100 rounded text-gray-600">+</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-gray-100 rounded text-gray-600">
                        <Download className="w-5 h-5" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 rounded text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Document Content */}
                  <div className="p-8 min-h-[600px] bg-gray-50">
                    {activeTab === 'original' && (
                      <div className="bg-white p-8 rounded-lg shadow-sm max-w-3xl mx-auto">
                        <h2 className="text-lg font-bold mb-4">1. Confidential Information</h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                          1.1 The Disclosing Party may disclose certain confidential and proprietary
                          information (&quot;Confidential Information&quot;) to the Receiving Party...
                        </p>
                        <h2 className="text-lg font-bold mb-4 mt-6">2. Obligations of Receiving Party</h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                          2.1 The Receiving Party shall hold and maintain the Confidential Information
                          in strict confidence and shall not, without the prior written consent...
                        </p>
                        <h2 className="text-lg font-bold mb-4 mt-6">3. Term and Termination</h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                          3.1 The obligations of confidentiality set forth in this Agreement shall
                          remain in effect for a period of 3 (three) years...
                        </p>
                      </div>
                    )}
                    {activeTab === 'simplified' && (
                      <div className="bg-white p-8 rounded-lg shadow-sm max-w-3xl mx-auto">
                        <h2 className="text-lg font-bold mb-4 text-purple-700">Simple Summary</h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                          This agreement protects secret information shared between parties. The receiving party must keep the information private for 3 years.
                        </p>
                      </div>
                    )}
                    {activeTab === 'clauses' && (
                      <ClausesPanel clauses={sampleClauses} />
                    )}
                    {activeTab === 'summary' && (
                      <DocumentSummary
                        summary="This Non-Disclosure Agreement (NDA) is between two parties where one party agrees to share confidential information and the other agrees not to disclose it. The agreement outlines obligations, exceptions, and the duration of confidentiality."
                        totalPages={12}
                        totalWords={2842}
                        analyzedAt="20 May 2025"
                      />
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {pdfExportEnabled && (
                    <>
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Report
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        Export as PDF
                      </button>
                    </>
                  )}
                  {shareReportEnabled && (
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                      <Share2 className="w-4 h-4" />
                      Share Report
                    </button>
                  )}
                  {chatbotEnabled && (
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm ml-auto">
                      <MessageSquare className="w-4 h-4" />
                      Start New Chat
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column - Risk & Chat */}
              {(riskAnalysisEnabled || chatbotEnabled) && (
                <div className="space-y-6">
                  {riskAnalysisEnabled && (
                    <RiskPanel riskScore={72} flags={sampleRiskFlags} />
                  )}
                  {chatbotEnabled && (
                    <ChatPanel documentId={documentId} className="h-[500px]" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
