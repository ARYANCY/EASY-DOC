'use client';

function RiskGauge({ score }: { score: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
      <svg width="84" height="84" viewBox="0 0 84 84" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="42" cy="42" r={r} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle
          cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', lineHeight: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color }}>{score}</div>
        <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>/ 100</div>
      </div>
    </div>
  );
}

export default function RiskPanel({ doc }: { doc: any }) {
  const flags: any[] = doc.risk_flags || [];
  const score: number = doc.risk_score || 0;
  const riskLabel = score >= 70 ? 'High Risk' : score >= 40 ? 'Medium Risk' : 'Low Risk';
  const riskColor = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981';
  const shown = flags.slice(0, 3);

  return (
    <div style={{ padding: '16px', flexShrink: 0 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>Risk Highlights</span>
          <span style={{ fontSize: 11, color: '#6b7280' }} title="AI-powered risk analysis">ℹ️</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'right' }}>Risk Score</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: riskColor, textAlign: 'right' }}>{riskLabel}</div>
          </div>
          <RiskGauge score={score} />
        </div>
      </div>

      {/* Flag cards */}
      <div>
        {shown.map((flag: any, i: number) => {
          const sev = flag.severity as string;
          const dotColor = sev === 'high' ? '#ef4444' : sev === 'medium' ? '#f59e0b' : '#10b981';
          return (
            <div key={i} className={`risk-flag-card ${sev}`} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb' }}>{flag.label}</span>
                </div>
                <span className={`badge-${sev}`}>
                  {sev.charAt(0).toUpperCase() + sev.slice(1)} Risk
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>{flag.description}</p>
            </div>
          );
        })}
      </div>

      {flags.length > 3 && (
        <button style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 12, cursor: 'pointer', marginTop: 4, padding: 0 }}>
          View All Risks ({flags.length}) →
        </button>
      )}
    </div>
  );
}
