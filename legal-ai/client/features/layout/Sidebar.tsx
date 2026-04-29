'use client';
import { useRouter } from 'next/navigation';

// SVG icons to replace emojis
const Icons = {
  home: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  document: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  bookmark: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  scale: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="3" x2="12" y2="21" /><path d="M3 9l9-6 9 6" /><path d="M3 15h6l-3 6z" /><path d="M15 15h6l-3 6z" />
    </svg>
  ),
};

export default function Sidebar() {
  const router = useRouter();

  const navItems = [
    { icon: Icons.home,     label: 'Dashboard',       action: () => router.push('/') },
    { icon: Icons.document, label: 'Documents',        action: () => {} },
    { icon: Icons.clock,    label: 'Recent Analyses',  action: () => router.push('/') },
    { icon: Icons.bookmark, label: 'Saved Queries',    action: () => alert('Saved Queries require a database. Coming soon!') },
  ];

  const isActive = (label: string) => label === 'Documents';

  return (
    <aside style={{
      width: 220,
      background: '#0d1117',
      borderRight: '1px solid #1f2937',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px', marginBottom: 28 }}>
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icons.scale}
        </div>
        <span style={{ fontWeight: 700, fontSize: 16, background: 'linear-gradient(135deg,#a78bfa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LegalAI</span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className={`nav-item ${isActive(item.label) ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom card */}
      <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(6,182,212,0.1))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '16px 14px', marginTop: 16 }}>
        <div style={{ marginBottom: 8, display: 'flex' }}>{Icons.scale}</div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', marginBottom: 4 }}>AI-Powered Legal Simplification for Small Businesses</p>
        <p style={{ fontSize: 11, color: '#9ca3af' }}>Understand. Evaluate. Decide with confidence.</p>
      </div>
    </aside>
  );
}
