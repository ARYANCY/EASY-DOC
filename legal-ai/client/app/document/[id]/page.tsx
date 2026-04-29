'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/features/layout/Sidebar';
import DocumentViewer from '@/features/document/DocumentViewer';
import RiskPanel from '@/features/risk/RiskPanel';
import ChatBox from '@/features/chat/ChatBox';
import API_BASE from '@/lib/api';

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatKey, setChatKey] = useState(0);

  useEffect(() => {
    if (!docId) return;
    fetch(`${API_BASE}/document/${docId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDoc(json.data);
        else setError('Document not found');
      })
      .catch(() => setError('Cannot connect to API server'))
      .finally(() => setLoading(false));
  }, [docId]);

  const handleDownload = useCallback(() => {
    if (!doc) return;
    const report = {
      filename: doc.filename,
      document_type: doc.document_type,
      parties: doc.parties,
      risk_score: doc.risk_score,
      summary: doc.summary,
      risk_flags: doc.risk_flags,
      sections: doc.sections,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.filename?.replace(/\.[^/.]+$/, '') || 'report'}_analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [doc]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => alert('Document link copied to clipboard!'))
      .catch(() => prompt('Copy this link:', url));
  }, []);

  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  const handleNewChat = useCallback(() => {
    setChatKey((k) => k + 1);
  }, []);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onBack={() => router.push('/')} />;
  if (!doc) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#030712' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d1117', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18, padding: 4 }}>←</button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{doc.filename || 'Legal Document'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                {doc.total_pages || 1} pages · {doc.total_words || '—'} words · {doc.document_type}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => router.push('/')}>Upload New</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>A</div>
              <span style={{ fontSize: 13, color: '#e5e7eb' }}>Arjun Mehta</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <DocumentViewer
              doc={doc}
              docId={docId}
              onDownload={handleDownload}
              onShare={handleShare}
              onExportPDF={handleExportPDF}
              onNewChat={handleNewChat}
            />
          </div>

          <div style={{ width: 360, borderLeft: '1px solid #1f2937', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d1117', flexShrink: 0 }}>
            <RiskPanel doc={doc} />
            <div style={{ borderTop: '1px solid #1f2937', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ChatBox key={chatKey} docId={docId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030712' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, border: '3px solid #1f2937', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 20px' }} className="animate-spin" />
        <p style={{ color: '#a78bfa', fontWeight: 600, fontSize: 16 }}>Loading document...</p>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>Retrieving analysis results</p>
      </div>
    </div>
  );
}

function ErrorScreen({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030712' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ marginBottom: 16 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <p style={{ color: '#f87171', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{error}</p>
        <button className="btn-primary" onClick={onBack} style={{ marginTop: 16 }}>← Back to Upload</button>
      </div>
    </div>
  );
}
