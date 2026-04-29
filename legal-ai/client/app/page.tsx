'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import API_BASE from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data.success && data.doc_id) {
        router.push(`/document/${data.doc_id}`);
      } else {
        setError(data.error || 'Upload failed. Make sure the API server is running.');
      }
    } catch (e: any) {
      setError('Cannot connect to API server. Please start the backend (port 5000) and AI service (port 8000).');
    } finally {
      setUploading(false);
    }
  }, [router]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #030712 0%, #0d1117 50%, #0a0618 100%)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 9l9-6 9 6"/><path d="M3 15h6l-3 6z"/><path d="M15 15h6l-3 6z"/></svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Easy-Doc</span>
        </div>
        <nav style={{ display: 'flex', gap: 24, fontSize: 14, color: '#9ca3af' }}>
          <span style={{ cursor: 'pointer' }}>Features</span>
          <span style={{ cursor: 'pointer' }}>How it works</span>
          <span style={{ cursor: 'pointer' }}>About</span>
        </nav>
      </header>

      {/* Hero */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' }}>
        {/* Glow orb */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }} className="animate-fade-in">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 20, padding: '6px 16px', marginBottom: 32, fontSize: 13, color: '#a78bfa' }}>
            AI-Powered Legal Document Analysis
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 24 }}>
            Understand Any Legal<br />
            <span className="gradient-text">Document in Seconds</span>
          </h1>

          <p style={{ fontSize: 18, color: '#9ca3af', lineHeight: 1.7, marginBottom: 48, maxWidth: 560, margin: '0 auto 48px' }}>
            Upload contracts, NDAs, or agreements. Our AI extracts key clauses, detects risks, assigns risk scores, and simplifies complex legal language — instantly.
          </p>

          {/* Upload Zone */}
          <div
            className={`drop-zone ${dragging ? 'drag-over' : ''}`}
            style={{ padding: '48px 40px', cursor: 'pointer', position: 'relative', marginBottom: 24 }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !uploading && document.getElementById('file-input')?.click()}
          >
            <input id="file-input" type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={onInputChange} />
            {uploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, border: '3px solid #374151', borderTopColor: '#7c3aed', borderRadius: '50%' }} className="animate-spin" />
                <p style={{ color: '#a78bfa', fontWeight: 600 }}>Analyzing document...</p>
                <p style={{ color: '#6b7280', fontSize: 13 }}>Extracting clauses, detecting risks, building knowledge base</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#e5e7eb' }}>
                  {dragging ? 'Drop your document here' : 'Drag & drop your legal document'}
                </p>
                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>or click to browse • PDF and TXT supported</p>
                <button className="btn-primary" style={{ pointerEvents: 'none' }}>Choose File</button>
              </>
            )}
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 24, textAlign: 'left' }}>
              {error}
            </div>
          )}
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 48, position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Clause Extraction' },
            { label: 'Risk Detection' },
            { label: 'Risk Scoring' },
            { label: 'Plain English' },
            { label: 'AI Chat Assistant' },
          ].map((f) => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(17,24,39,0.8)', border: '1px solid #1f2937', borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#d1d5db' }}>
              {f.label}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
