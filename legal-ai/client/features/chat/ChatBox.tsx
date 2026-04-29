'use client';

import { useState, useRef, useEffect } from 'react';
import API_BASE from '@/lib/api';

type Message = { role: 'user' | 'ai'; content: string };

const SUGGESTED = [
  'What happens if the other party breaches the agreement?',
  'Is there any payment obligation in this agreement?',
  'What are the termination conditions?',
  'Who owns the intellectual property?',
];

export default function ChatBox({ docId }: { docId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (query: string) => {
    if (!query.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId, query, history: messages }),
      });
      const json = await res.json();
      const answer = json.success ? json.data.answer : 'Sorry, I could not get an answer.';
      setMessages((prev) => [...prev, { role: 'ai', content: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', content: 'Cannot connect to AI service. Make sure the backend is running.' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>AI Legal Assistant</span>
        </div>
        <button style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer' }}
          onClick={() => setMessages([])}>Clear Chat</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        {messages.length === 0 ? (
          <div style={{ paddingTop: 8 }}>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Suggested questions:</p>
            {SUGGESTED.map((q) => (
              <button key={q} onClick={() => send(q)} style={{
                display: 'block', width: '100%', textAlign: 'left', marginBottom: 6,
                background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)',
                borderRadius: 8, padding: '8px 12px', color: '#a78bfa', fontSize: 12,
                cursor: 'pointer', transition: 'background 0.2s',
              }}>
                {q}
              </button>
            ))}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Analyzing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Ask anything about this document..."
            style={{ fontSize: 13, padding: '10px 14px', borderRadius: 10 }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', border: 'none',
              borderRadius: 10, width: 38, height: 38, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, opacity: !input.trim() || loading ? 0.5 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
