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
import {
  Download,
  Share2,
  FileText,
  MessageSquare,
  Loader2,
  Files,
  Search,
  ShieldAlert,
  Terminal,
  Settings,
  PanelRight,
  PanelLeft,
  X,
  Sparkles,
} from 'lucide-react';
import { getDocument, simplifyDocument, Document } from '../../../features/document/documentService';
import { getRiskAnalysis } from '../../../features/risk/riskService';
import { extractClauses } from '../../../features/clause/clauseService';
import { getFeatures, FeatureFlags } from '../../../lib/features';
import { getCurrentUser } from '../../../features/auth/authService';
import Link from 'next/link';

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
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [riskData, setRiskData] = useState<any>(null);
  const [clausesData, setClausesData] = useState<any[]>([]);
  const [simplifiedText, setSimplifiedText] = useState<string>('');
  const [features, setFeatures] = useState<FeatureFlags | null>(null);
  const [user, setUser] = useState<any>(null);

  // Panel visibility states
  const [showExplorer, setShowExplorer] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [showClauses, setShowClauses] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [bottomTab, setBottomTab] = useState<'risk' | 'actions' | 'clauses'>('risk');
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

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('legal-ai-workbench-layout') : null;
    if (!saved) {
      setShowChat(true);
      setShowRisk(true);
      setShowClauses(true);
      setShowSummary(true);
      setShowBottomPanel(true);
      return;
    }

    try {
      const layout = JSON.parse(saved);
      setShowExplorer(layout.showExplorer ?? true);
      setShowChat(layout.showChat ?? true);
      setShowRisk(layout.showRisk ?? true);
      setShowClauses(layout.showClauses ?? true);
      setShowSummary(layout.showSummary ?? true);
      setShowBottomPanel(layout.showBottomPanel ?? true);
      setBottomTab(layout.bottomTab ?? 'risk');
    } catch {
      localStorage.removeItem('legal-ai-workbench-layout');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      'legal-ai-workbench-layout',
      JSON.stringify({ showExplorer, showChat, showRisk, showClauses, showSummary, showBottomPanel, bottomTab })
    );
  }, [showExplorer, showChat, showRisk, showClauses, showSummary, showBottomPanel, bottomTab]);

  useEffect(() => {
    if (!user || !documentId) return;
    
    const fetchData = async () => {
      try {
        const [doc, risk, clauses] = await Promise.all([
          getDocument(documentId),
          getRiskAnalysis(documentId),
          extractClauses(documentId).catch(() => []),
        ]);
        setDocumentData(doc);
        setRiskData(risk);
        setClausesData(Array.isArray(clauses) ? clauses : []);
        
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
  }, [documentId, user]);

  if (!user || !features) return null;

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
      <div className="flex h-screen items-center justify-center editorial-shell">
        <div className="flex items-center gap-3 text-[#181715]">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="font-medium">Loading document analysis...</span>
        </div>
      </div>
    );
  }

  const fileName = documentData?.filename || 'Non-Disclosure Agreement.pdf';
  const currentText = activeTab === 'simplified'
    ? simplifiedText || 'Simplified text not available'
    : documentData?.text || 'No document text available';
  const textLines = currentText.split('\n');
  const riskFlags = riskData?.flags || sampleRiskFlags;
  const clauseList = clausesData.length > 0 ? clausesData : sampleClauses;
  const totalWords = documentData?.text?.split(/\s+/).filter(Boolean).length || 0;

  return (
    <div className="h-screen bg-[#1e1e1e] text-[#d4d4d4] overflow-hidden">
      <div className="flex h-full flex-col">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#2d2d2d] bg-[#181818] px-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden text-xs text-[#858585] sm:inline">LegalAI Workbench</span>
            <span className="hidden text-xs text-[#858585] md:inline">/</span>
            <span className="truncate text-xs text-[#cccccc]">{fileName}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowExplorer(!showExplorer)} className="p-2 hover:bg-[#2a2d2e]" title="Toggle Explorer">
              <PanelLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setShowBottomPanel(!showBottomPanel)} className="p-2 hover:bg-[#2a2d2e]" title="Toggle Bottom Panel">
              <Terminal className="h-4 w-4" />
            </button>
            <button onClick={() => setShowChat(!showChat)} className="p-2 hover:bg-[#2a2d2e]" title="Toggle Chat">
              <PanelRight className="h-4 w-4" />
            </button>
            <button onClick={handleExportPDF} className="hidden items-center gap-2 bg-[#0e639c] px-3 py-1.5 text-xs text-white hover:bg-[#1177bb] sm:flex">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-12 shrink-0 flex-col items-center border-r border-[#2d2d2d] bg-[#181818] py-2">
            {[
              { icon: Files, label: 'Explorer', action: () => setShowExplorer(!showExplorer), active: showExplorer },
              { icon: Search, label: 'Search', href: '/search' },
              { icon: ShieldAlert, label: 'Risk', action: () => { setShowBottomPanel(true); setBottomTab('risk'); }, active: showBottomPanel && bottomTab === 'risk' },
              { icon: MessageSquare, label: 'Chat', action: () => setShowChat(!showChat), active: showChat },
            ].map((item) => {
              const Icon = item.icon;
              const itemClassName = `mb-1 flex h-10 w-10 items-center justify-center border-l-2 ${
                item.active ? 'border-white bg-[#2a2d2e] text-white' : 'border-transparent text-[#858585] hover:bg-[#2a2d2e] hover:text-white'
              }`;
              return item.href ? (
                <Link key={item.label} href={item.href} className={itemClassName} title={item.label}>
                  <Icon className="h-5 w-5" />
                </Link>
              ) : (
                <button key={item.label} onClick={item.action} className={itemClassName} title={item.label}>
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
            <Link href="/settings" className="mt-auto flex h-10 w-10 items-center justify-center text-[#858585] hover:bg-[#2a2d2e] hover:text-white" title="Settings">
              <Settings className="h-5 w-5" />
            </Link>
          </aside>

          {showExplorer && (
            <aside className="hidden w-64 shrink-0 flex-col border-r border-[#2d2d2d] bg-[#252526] md:flex">
              <div className="flex h-9 items-center justify-between border-b border-[#2d2d2d] px-3 text-[11px] uppercase tracking-wide text-[#cccccc]">
                Explorer
                <button onClick={() => setShowExplorer(false)} className="hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4 overflow-auto p-3 text-sm">
                <div>
                  <p className="mb-2 text-[11px] uppercase text-[#858585]">Open Document</p>
                  <button onClick={() => setActiveTab('original')} className="flex w-full items-center gap-2 bg-[#37373d] px-2 py-1.5 text-left text-[#f3f3f3]">
                    <FileText className="h-4 w-4 text-[#c586c0]" />
                    <span className="truncate">{fileName}</span>
                  </button>
                </div>
                <div>
                  <p className="mb-2 text-[11px] uppercase text-[#858585]">User Layout</p>
                  {[
                    { label: 'Right Chat', checked: showChat, action: () => setShowChat(!showChat) },
                    { label: 'Risk Terminal', checked: showRisk, action: () => setShowRisk(!showRisk) },
                    { label: 'Clauses', checked: showClauses, action: () => setShowClauses(!showClauses) },
                    { label: 'Summary', checked: showSummary, action: () => setShowSummary(!showSummary) },
                    { label: 'Bottom Panel', checked: showBottomPanel, action: () => setShowBottomPanel(!showBottomPanel) },
                  ].map((item) => (
                    <button key={item.label} onClick={item.action} className="flex w-full items-center justify-between px-2 py-1.5 text-[#cccccc] hover:bg-[#2a2d2e]">
                      <span>{item.label}</span>
                      <span className={`h-3 w-6 border ${item.checked ? 'border-[#0e639c] bg-[#0e639c]' : 'border-[#858585]'}`}>
                        <span className={`block h-full w-1/2 bg-white transition-transform ${item.checked ? 'translate-x-full' : ''}`} />
                      </span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-[#3c3c3c] pt-3 text-xs text-[#858585]">
                  <p>Pages: {documentData?.metadata?.pageCount || 0}</p>
                  <p>Words: {totalWords.toLocaleString()}</p>
                  <p>Risk: {riskData?.risk_score ?? 0}/100</p>
                </div>
              </div>
            </aside>
          )}

          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-9 shrink-0 overflow-x-auto border-b border-[#2d2d2d] bg-[#252526]">
              {[
                { id: 'original', label: fileName, enabled: true },
                { id: 'simplified', label: 'simplified.txt', enabled: true },
                { id: 'clauses', label: 'clauses.json', enabled: clauseExtractionEnabled },
                { id: 'summary', label: 'summary.md', enabled: documentSummaryEnabled },
              ].filter(tab => tab.enabled).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex min-w-40 items-center gap-2 border-r border-[#2d2d2d] px-3 text-left text-xs ${
                    activeTab === tab.id ? 'bg-[#1e1e1e] text-white' : 'bg-[#2d2d2d] text-[#cccccc] hover:bg-[#333333]'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-[#c586c0]" />
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-[#1e1e1e] font-mono text-sm leading-6">
              {(activeTab === 'original' || activeTab === 'simplified') && (
                <div className="min-w-full py-4">
                  {textLines.map((line, index) => (
                    <div key={`${index}-${line.slice(0, 8)}`} className="grid grid-cols-[4rem_minmax(0,1fr)] px-2 hover:bg-[#2a2d2e]">
                      <span className="select-none pr-4 text-right text-[#858585]">{index + 1}</span>
                      <span className="whitespace-pre-wrap pr-6 text-[#d4d4d4]">{line || ' '}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'clauses' && (
                <div className="p-4">
                  {showClauses ? <ClausesPanel clauses={clauseList} /> : <p className="text-[#858585]">Clauses view is hidden from Explorer preferences.</p>}
                </div>
              )}
              {activeTab === 'summary' && (
                <div className="p-4">
                  {showSummary ? (
                    <DocumentSummary
                      summary={riskData?.summary || 'Summary not available'}
                      totalPages={documentData?.metadata?.pageCount || 0}
                      totalWords={totalWords}
                      analyzedAt={new Date(documentData?.createdAt || Date.now()).toLocaleDateString()}
                    />
                  ) : (
                    <p className="text-[#858585]">Summary view is hidden from Explorer preferences.</p>
                  )}
                </div>
              )}
            </div>

            {showBottomPanel && (
              <section className="h-56 shrink-0 border-t border-[#2d2d2d] bg-[#181818] md:h-64">
                <div className="flex h-9 items-center justify-between border-b border-[#2d2d2d]">
                  <div className="flex h-full">
                    {[
                      { id: 'risk', label: 'Risks', icon: ShieldAlert },
                      { id: 'actions', label: 'Downloads', icon: Download },
                      { id: 'clauses', label: 'Clauses', icon: Sparkles },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setBottomTab(tab.id as any)}
                          className={`flex items-center gap-2 border-r border-[#2d2d2d] px-3 text-xs ${
                            bottomTab === tab.id ? 'bg-[#1e1e1e] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setShowBottomPanel(false)} className="px-3 text-[#858585] hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="h-[calc(100%-2.25rem)] overflow-auto p-3">
                  {bottomTab === 'risk' && showRisk && (
                    <div className="grid gap-3 md:grid-cols-3">
                      {riskFlags.map((flag: any, index: number) => (
                        <div key={index} className="border border-[#3c3c3c] bg-[#1e1e1e] p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[#f3f3f3]">{flag.title}</p>
                            <span className="text-[10px] uppercase text-[#f48771]">{flag.severity}</span>
                          </div>
                          <p className="text-xs leading-5 text-[#cccccc]">{flag.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {bottomTab === 'risk' && !showRisk && <p className="text-sm text-[#858585]">Risk terminal is hidden from Explorer preferences.</p>}
                  {bottomTab === 'actions' && (
                    <div className="flex flex-wrap gap-3">
                      {pdfExportEnabled && (
                        <>
                          <button onClick={handleExportPDF} className="flex items-center gap-2 bg-[#0e639c] px-4 py-2 text-sm text-white hover:bg-[#1177bb]">
                            <Download className="h-4 w-4" />
                            Download Report
                          </button>
                          <button onClick={handleExportPDF} className="flex items-center gap-2 border border-[#3c3c3c] px-4 py-2 text-sm text-[#cccccc] hover:bg-[#2a2d2e]">
                            <FileText className="h-4 w-4" />
                            Export as PDF
                          </button>
                        </>
                      )}
                      {shareReportEnabled && (
                        <button className="flex items-center gap-2 border border-[#3c3c3c] px-4 py-2 text-sm text-[#cccccc] hover:bg-[#2a2d2e]">
                          <Share2 className="h-4 w-4" />
                          Share Report
                        </button>
                      )}
                    </div>
                  )}
                  {bottomTab === 'clauses' && showClauses && <ClausesPanel clauses={clauseList} />}
                  {bottomTab === 'clauses' && !showClauses && <p className="text-sm text-[#858585]">Clauses panel is hidden from Explorer preferences.</p>}
                </div>
              </section>
            )}
          </main>

          {chatbotEnabled && showChat && (
            <aside className="hidden w-[360px] shrink-0 border-l border-[#2d2d2d] bg-[#252526] xl:block">
              <div className="flex h-9 items-center justify-between border-b border-[#2d2d2d] px-3 text-xs uppercase tracking-wide text-[#cccccc]">
                AI Chat
                <button onClick={() => setShowChat(false)} className="hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-[calc(100%-2.25rem)] p-3">
                <ChatPanel documentId={documentId} className="h-full border-[#3c3c3c] bg-[#1e1e1e]" />
              </div>
            </aside>
          )}
        </div>

        {chatbotEnabled && showChat && (
          <div className="border-t border-[#2d2d2d] bg-[#252526] p-2 xl:hidden">
            <ChatPanel documentId={documentId} className="h-80 border-[#3c3c3c] bg-[#1e1e1e]" />
          </div>
        )}

        <div className="flex h-6 shrink-0 items-center justify-between bg-[#007acc] px-3 text-[11px] text-white">
          <span className="truncate">{fileName}</span>
          <span className="shrink-0">{totalWords.toLocaleString()} words · Risk {riskData?.risk_score ?? 0}/100</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen editorial-shell">
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
          <div className="p-4 sm:p-6">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 bg-[#fffdf9] p-1 border border-[#e8e1d8] w-full overflow-x-auto lg:w-fit">
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
                      className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? 'bg-[#181715] text-[#fffdf9]'
                          : 'text-[#777169] hover:bg-[#f7f4ef] hover:text-[#181715]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.9fr)] gap-5">
              {/* Left Column - Document Content */}
              <div className="xl:col-span-2 space-y-6">
                {/* Document Viewer Card */}
                <div className="editorial-card overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e1d8] bg-[#fffdf9]">
                    <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-[#f7f4ef]">
                        <span className="sr-only">Menu</span>
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-2 ml-4">
                        <button className="p-1.5 hover:bg-[#f7f4ef] text-[#777169]">{'<'}</button>
                        <span className="text-sm text-[#777169]">1 / 12</span>
                        <button className="p-1.5 hover:bg-[#f7f4ef] text-[#777169]">{'>'}</button>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button className="p-1.5 hover:bg-[#f7f4ef] text-[#777169]">-</button>
                        <span className="text-sm text-[#777169]">100%</span>
                        <button className="p-1.5 hover:bg-[#f7f4ef] text-[#777169]">+</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-[#f7f4ef] text-[#777169]">
                        <Download className="w-5 h-5" />
                      </button>
                      <button className="p-1.5 hover:bg-[#f7f4ef] text-[#777169]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Document Content */}
                  <div className="p-4 sm:p-8 min-h-[600px] bg-[#f3eee6]">
                    {activeTab === 'original' && (
                      <div className="bg-[#fffdf9] p-6 sm:p-10 shadow-sm max-w-3xl mx-auto border border-[#e8e1d8]">
                        <p className="editorial-label mb-3">Original Document</p>
                        <h2 className="font-editorial text-3xl mb-6 text-[#181715]">Document Content</h2>
                        <p className="text-[#3f3a35] mb-4 leading-8 whitespace-pre-wrap">
                          {documentData?.text || 'No document text available'}
                        </p>
                      </div>
                    )}
                    {activeTab === 'simplified' && (
                      <div className="bg-[#fffdf9] p-6 sm:p-10 shadow-sm max-w-3xl mx-auto border border-[#e8e1d8]">
                        <p className="editorial-label mb-3">Plain English</p>
                        <h2 className="font-editorial text-3xl mb-6 text-[#181715]">Simplified Version</h2>
                        <p className="text-[#3f3a35] mb-4 leading-8">
                          {simplifiedText || 'Simplified text not available'}
                        </p>
                      </div>
                    )}
                    {activeTab === 'clauses' && (
                      <ClausesPanel clauses={(clausesData && clausesData.length > 0) ? clausesData : sampleClauses} />
                    )}
                    {activeTab === 'summary' && (
                      <DocumentSummary
                        summary={riskData?.summary || 'Summary not available'}
                        totalPages={documentData?.metadata?.pageCount || 0}
                        totalWords={documentData?.text?.split(' ').length || 0}
                        analyzedAt={new Date(documentData?.createdAt || Date.now()).toLocaleDateString()}
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
                    className="editorial-button-light"
                      >
                        <Download className="w-4 h-4" />
                        Download Report
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="editorial-button-light"
                      >
                        <FileText className="w-4 h-4" />
                        Export as PDF
                      </button>
                    </>
                  )}
                  {shareReportEnabled && (
                    <button className="editorial-button-light">
                      <Share2 className="w-4 h-4" />
                      Share Report
                    </button>
                  )}
                  {chatbotEnabled && (
                    <button className="editorial-button ml-auto">
                      <MessageSquare className="w-4 h-4" />
                      Start New Chat
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column - Risk & Chat */}
              {(riskAnalysisEnabled || chatbotEnabled) && (
                <div className="space-y-5">
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
