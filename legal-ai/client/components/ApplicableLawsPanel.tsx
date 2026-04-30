import React, { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, AlertCircle, Scale, Shield, Landmark, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { analyzeLaws, LawReference } from '../features/laws/lawsService';

interface ApplicableLawsPanelProps {
  documentId: string;
  documentText?: string;
  className?: string;
}

export default function ApplicableLawsPanel({ documentId, documentText, className = '' }: ApplicableLawsPanelProps) {
  const [laws, setLaws] = useState<LawReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    const fetchLaws = async () => {
      setLoading(true);
      try {
        const fetchedLaws = await analyzeLaws(documentId, documentText, "India");
        setLaws(fetchedLaws);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch laws:", err);
        setError("Failed to analyze applicable laws. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLaws();
  }, [documentId, documentText]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'constitutional':
        return <Landmark className="w-4 h-4 text-purple-400" />;
      case 'case_law':
        return <Scale className="w-4 h-4 text-blue-400" />;
      case 'regulation':
        return <Shield className="w-4 h-4 text-green-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-orange-400" />;
    }
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-red-500/20 text-red-400 rounded">High Impact</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-yellow-500/20 text-yellow-400 rounded">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-blue-500/20 text-blue-400 rounded">Low</span>;
    }
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 space-y-4 ${className}`}>
        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
        <p className="text-sm text-gray-400 font-mono">Analyzing legal context & querying InsightLaw API...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 flex flex-col items-center justify-center text-center ${className}`}>
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <p className="text-gray-300 mb-2">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="text-orange-400 hover:text-orange-300 text-sm font-semibold uppercase tracking-wider"
        >
          Retry
        </button>
      </div>
    );
  }

  if (laws.length === 0) {
    return (
      <div className={`p-8 text-center border border-dashed border-gray-700 bg-gray-800/30 rounded-lg ${className}`}>
        <Scale className="w-12 h-12 text-gray-500 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">No Specific Laws Identified</h3>
        <p className="text-sm text-gray-500">
          The analysis could not identify any specific statutes, regulations, or case laws referenced in this document.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-editorial text-gray-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-400" />
            Applicable Laws & Jurisprudence
          </h2>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Powered by InsightLaw API</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 rounded-md border border-gray-700">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-300 font-mono">{laws.length} References Found</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {laws.map((law, idx) => (
          <div key={idx} className="bg-gray-800/50 border border-gray-700 hover:border-gray-500 transition-colors rounded-lg overflow-hidden flex flex-col group">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/80 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-900 rounded-md shadow-inner">
                  {getCategoryIcon(law.category)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-200 leading-tight group-hover:text-orange-400 transition-colors">
                    {law.law_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {law.section && <span className="text-[10px] font-mono text-gray-400 bg-gray-900 px-1.5 rounded">{law.section}</span>}
                    {law.article && <span className="text-[10px] font-mono text-gray-400 bg-gray-900 px-1.5 rounded">{law.article}</span>}
                    <span className="text-[10px] uppercase text-gray-500 tracking-wider">{law.category.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                {getImportanceBadge(law.importance)}
                {law.relevance_score && (
                  <span className="text-[10px] font-mono text-gray-500">
                    Match: {(law.relevance_score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
              <p className="text-sm text-gray-300 leading-relaxed mb-4 flex-1">
                {law.context}
              </p>
              
              {law.link && (
                <a 
                  href={law.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-400 hover:text-orange-300 transition-colors w-fit"
                >
                  View Official Source <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
