'use client';

import { useState } from 'react';
import API_BASE from '@/lib/api';

type Tab = 'original' | 'simplified' | 'clauses' | 'summary';

export default function DocumentViewer({
  doc, docId, onDownload, onShare, onExportPDF, onNewChat
}: {
  doc: any;
  docId: string;
  onDownload: () => void;
  onShare: () => void;
  onExportPDF: () => void;
  onNewChat: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('original');
  const [simplifiedSections, setSimplifiedSections] = useState<any[]>([]);
  const [simplifying, setSimplifying] = useState(false);

  const handleSimplify = async () => {
    if (simplifiedSections.length > 0) { setActiveTab('simplified'); return; }
    setSimplifying(true);
    try {
      const res = await fetch(`${API_BASE}/simplify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId }),
      });
      const json = await res.json();
      if (json.success) {
        setSimplifiedSections(json.data.sections || []);
        setActiveTab('simplified');
      }
    } catch {}
    setSimplifying(false);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'original', label: 'Original Document' },
    { id: 'simplified', label: 'Simplified Version' },
    { id: 'clauses', label: 'Key Clauses' },
    { id: 'summary', label: 'Summary' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ padding: '12px 24px 0', borderBottom: '1px solid #1f2937', display: 'flex', gap: 4, background: '#0d1117', flexShrink: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => { if (t.id === 'simplified') handleSimplify(); else setActiveTab(t.id); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {activeTab === 'original' && <OriginalTab doc={doc} />}
        {activeTab === 'simplified' && <SimplifiedTab sections={simplifiedSections} simplifying={simplifying} />}
        {activeTab === 'clauses' && <ClausesTab doc={doc} />}
        {activeTab === 'summary' && <SummaryTab doc={doc} />}
      </div>

      {/* Doc Summary Footer */}
      <div style={{ borderTop: '1px solid #1f2937', padding: '16px 24px', background: '#0d1117', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>Document Summary (AI Generated)</span>
            </div>
            <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>{doc.summary}</p>
          </div>
          <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
            {[
              { label: 'Total Pages', value: doc.total_pages || 1 },
              { label: 'Total Words', value: (doc.total_words || 0).toLocaleString() },
              { label: 'Analyzed At', value: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Clauses mini row */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>Key Clauses Extracted</span>
            <button onClick={() => setActiveTab('clauses')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 12, cursor: 'pointer' }}>View All Clauses →</button>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
            {(doc.key_clauses || []).slice(0, 4).map((kc: any, i: number) => {
              const colors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b'];
              return (
                <div key={i} style={{ minWidth: 140, background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '12px', flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: `${colors[i % colors.length]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors[i % colors.length]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb', marginBottom: 4 }}>{kc.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, lineHeight: 1.4 }}>{kc.summary}</div>
                  <div style={{ fontSize: 10, color: colors[i % colors.length], background: `${colors[i % colors.length]}15`, borderRadius: 4, padding: '2px 6px', display: 'inline-block' }}>{kc.clause_ref}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Download Report', action: onDownload },
            { label: 'Share Report',    action: onShare    },
            { label: 'Export as PDF',   action: onExportPDF },
          ].map((b) => (
            <button key={b.label} className="btn-ghost" style={{ fontSize: 12 }} onClick={b.action}>{b.label}</button>
          ))}
          <button className="btn-primary" style={{ fontSize: 12, marginLeft: 'auto' }} onClick={onNewChat}>Start New Chat</button>
        </div>
      </div>
    </div>
  );
}

function OriginalTab({ doc }: { doc: any }) {
  const sections = doc.sections || [];
  if (!sections.length) return <p style={{ color: '#6b7280', fontSize: 14 }}>No content extracted.</p>;
  return (
    <div className="animate-fade-in">
      {sections.map((section: any, si: number) => (
        <div key={si} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e5e7eb', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#7c3aed' }}>{si + 1}.</span> {section.title}
          </h2>
          {(section.clauses || []).map((clause: any, ci: number) => (
            <div key={ci} className={`clause-card ${clause.risk_flag ? 'risk' : ''}`} style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.7 }}>
                <span style={{ color: '#9ca3af', marginRight: 8 }}>{si + 1}.{ci + 1}</span>
                {clause.text}
              </p>
              {clause.risk_flag && (
                <div style={{ marginTop: 8 }}>
                  <span className="badge-high">Risk Flagged</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SimplifiedTab({ sections, simplifying }: { sections: any[]; simplifying: boolean }) {
  if (simplifying) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #1f2937', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 12px' }} className="animate-spin" />
          <p style={{ color: '#a78bfa' }}>Simplifying legal language...</p>
        </div>
      </div>
    );
  }
  if (!sections.length) return <p style={{ color: '#6b7280' }}>Click "Simplified Version" tab to generate.</p>;
  return (
    <div className="animate-fade-in">
      <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#6ee7b7' }}>
        Legal language simplified into plain English
      </div>
      {sections.map((section: any, si: number) => (
        <div key={si} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#e5e7eb', marginBottom: 10 }}>{section.title}</h2>
          {(section.clauses || []).map((clause: any, ci: number) => (
            <div key={ci} style={{ marginBottom: 12, background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '14px' }}>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontStyle: 'italic' }}>Original: {clause.text?.slice(0, 100)}...</p>
              <p style={{ fontSize: 13, color: '#a7f3d0', lineHeight: 1.7 }}>{clause.simplified}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ClausesTab({ doc }: { doc: any }) {
  const allClauses: any[] = [];
  (doc.sections || []).forEach((s: any) => {
    (s.clauses || []).forEach((c: any) => allClauses.push({ ...c, sectionTitle: s.title }));
  });

  const categories = [...new Set(allClauses.map((c) => c.category))];
  const [filter, setFilter] = useState('all');

  const displayed = filter === 'all' ? allClauses : allClauses.filter((c) => c.category === filter);

  return (
    <div className="animate-fade-in">
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {['all', ...categories].map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            background: filter === cat ? 'rgba(124,58,237,0.15)' : 'rgba(31,41,55,0.5)',
            color: filter === cat ? '#a78bfa' : '#9ca3af',
            border: filter === cat ? '1px solid rgba(124,58,237,0.3)' : '1px solid #374151',
          }}>
            {cat === 'all' ? `All (${allClauses.length})` : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {displayed.map((clause, i) => (
        <div key={i} className={`clause-card ${clause.risk_flag ? 'risk' : ''}`} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', borderRadius: 4, padding: '2px 8px' }}>
              {clause.category?.replace('_', ' ')}
            </span>
            {clause.risk_flag && <span className="badge-high">High Risk</span>}
          </div>
          <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.7 }}>{clause.text}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryTab({ doc }: { doc: any }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 720 }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.05))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: '24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#e5e7eb' }}>Document Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[
            { label: 'Document Type', value: doc.document_type || '—' },
            { label: 'Parties', value: (doc.parties || []).join(' & ') || '—' },
            { label: 'Risk Score', value: `${doc.risk_score || 0} / 100` },
            { label: 'Total Clauses', value: (doc.sections || []).reduce((a: number, s: any) => a + (s.clauses?.length || 0), 0) },
          ].map((item) => (
            <div key={item.label} style={{ background: '#111827', borderRadius: 10, padding: '12px 16px', border: '1px solid #1f2937' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>{item.value}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7 }}>{doc.summary}</p>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb', marginBottom: 12 }}>Risk Flags ({(doc.risk_flags || []).length})</h3>
      {(doc.risk_flags || []).map((flag: any, i: number) => (
        <div key={i} className={`risk-flag-card ${flag.severity}`} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{flag.label}</span>
            <span className={`badge-${flag.severity}`}>{flag.severity} Risk</span>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>{flag.description}</p>
        </div>
      ))}
    </div>
  );
}
