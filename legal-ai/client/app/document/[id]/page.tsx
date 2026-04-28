'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import PanelToggles from '../../../components/PanelToggles';
import SlidePanel from '../../../components/SlidePanel';
import BottomPanel from '../../../components/BottomPanel';
import RiskPanel from '../../../components/RiskPanel';
import ChatPanel from '../../../components/ChatPanel';
import DocumentSummary from '../../../components/DocumentSummary';
import ClausesPanel from '../../../components/ClausesPanel';
import { exportToPDF } from '../../../lib/utils/exportPDF';
import { Download, Share2, FileText, MessageSquare, Loader2 } from 'lucide-react';
import { getDocument, simplifyDocument } from '../../../features/document/documentService';
import { getRiskAnalysis } from '../../../features/risk/riskService';
import { extractClauses } from '../../../features/clause/clauseService';
import { getFeatures, FeatureFlags } from '../../../lib/features';
import { getCurrentUser } from '../../../features/auth/authService';

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
  const router = useRouter();
  const documentId = params.id as string;
  
  const [activeTab, setActiveTab] = useState<'original' | 'simplified' | 'clauses' | 'summary'>('original');
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState<any>(null);
  const [riskData, setRiskData] = useState<any>(null);
  const [clausesData, setClausesData] = useState<any[]>([]);
  const [simplifiedText, setSimplifiedText] = useState<string>('');
  const [features, setFeatures] = useState<FeatureFlags | null>(null);
  const [user, setUser] = useState<any>(null);

  // Panel visibility states
  const [showChat, setShowChat] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [showClauses, setShowClauses] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
    setFeatures(getFeatures());
  }, [router]);

  if (!user || !features) return null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doc, risk, clauses] = await Promise.all([
          getDocument(documentId),
          getRiskAnalysis(documentId),
          extractClauses(documentId).catch(() => []),
        ]);
        setDocumentData(doc);
        setRiskData(risk);
        setClausesData(clauses);
        
        // Fetch simplified text when switching to simplified tab
        if (doc?.text) {
          const simplified = await simplifyDocument(doc.text);
          setSimplifiedText(simplified.simplified);
        }
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
      documentName: documentData?.filename || 'Document.pdf',
      summary: riskData?.summary || 'Summary not available',
      riskScore: riskData?.risk_score || 0,
      riskFlags: riskData?.flags || sampleRiskFlags,
      clauses: clausesData.length > 0 ? clausesData.map((c: any) => ({ title: c.title, description: c.description })) : sampleClauses.map(c => ({ title: c.title, description: c.description })),
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
        >
          <PanelToggles
            showChat={showChat}
            showRisk={showRisk}
            showClauses={showClauses}
            showSummary={showSummary}
            onToggleChat={() => setShowChat(!showChat)}
            onToggleRisk={() => setShowRisk(!showRisk)}
            onToggleClauses={() => setShowClauses(!showClauses)}
            onToggleSummary={() => setShowSummary(!showSummary)}
          />
        </Header>

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
                        <h2 className="text-lg font-bold mb-4">Document Content</h2>
                        <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-wrap">
                          {documentData?.text || 'No document text available'}
                        </p>
                      </div>
                    )}
                    {activeTab === 'simplified' && (
                      <div className="bg-white p-8 rounded-lg shadow-sm max-w-3xl mx-auto">
                        <h2 className="text-lg font-bold mb-4 text-purple-700">Simplified Version</h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                          {simplifiedText || 'Simplified text not available'}
                        </p>
                      </div>
                    )}
                    {activeTab === 'clauses' && (
                      <ClausesPanel clauses={clausesData.length > 0 ? clausesData : sampleClauses} />
                    )}
                    {activeTab === 'summary' && (
                      <DocumentSummary
                        summary={riskData?.summary || 'Summary not available'}
                        totalPages={documentData?.metadata?.pageCount || 0}
                        totalWords={documentData?.text?.split(' ').length || 0}
                        analyzedAt={new Date(documentData?.createdAt).toLocaleDateString()}
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
                    <RiskPanel riskScore={riskData?.risk_score || 0} flags={riskData?.flags || sampleRiskFlags} />
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
