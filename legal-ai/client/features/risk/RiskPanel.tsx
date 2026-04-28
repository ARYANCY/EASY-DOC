"use client";

import { useEffect, useState } from 'react';
import { getRiskAnalysis } from './riskService';

interface RiskData {
  riskScore: number;
  flags: Array<{ type: string; term: string; severity: string }>;
  summary: string;
}

interface RiskPanelProps {
  documentId: string;
}

export default function RiskPanel({ documentId }: RiskPanelProps) {
  const [risk, setRisk] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRiskAnalysis(documentId)
      .then(data => setRisk(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) return <div>Analyzing risks...</div>;
  if (!risk) return <div>Could not load risk analysis</div>;

  const getScoreColor = (score: number) => {
    if (score < 30) return 'text-green-500';
    if (score < 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-bold mb-4">Risk Analysis</h3>
      <div className={`text-3xl font-bold mb-4 ${getScoreColor(risk.riskScore)}`}>
        Score: {risk.riskScore}/100
      </div>
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Risk Flags:</h4>
        {risk.flags.map((flag, i) => (
          <div key={i} className={`p-2 mb-1 rounded ${flag.severity === 'high' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <span className="font-medium">{flag.term}</span>
            <span className="ml-2 text-sm text-gray-600">({flag.severity})</span>
          </div>
        ))}
      </div>
      <p className="text-gray-700">{risk.summary}</p>
    </div>
  );
}
