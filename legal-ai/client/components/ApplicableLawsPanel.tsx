import React, { useEffect, useState, useCallback, useRef } from 'react';
import { BookOpen, ExternalLink, AlertCircle, Scale, Shield, Landmark, AlertTriangle, CheckCircle, Search, RefreshCw } from 'lucide-react';
import { analyzeLaws, LawReference } from '../features/laws/lawsService';

interface ApplicableLawsPanelProps {
  documentId: string;
  documentText?: string;
  className?: string;
}

// Retry with exponential backoff
const fetchWithRetry = async (
  fn: () => Promise<LawReference[]>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<LawReference[]> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      console.warn(`Law analysis attempt ${attempt + 1}/${maxRetries} failed:`, err);
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Failed after maximum retries');
};

export default function ApplicableLawsPanel({ documentId, documentText, className = '' }: ApplicableLawsPanelProps) {
  const [laws, setLaws] = useState<LawReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const fetchLaws = useCallback(async () => {
    // Prevent duplicate concurrent requests
    if (isFetchingRef.current) {
      console.log('Law analysis already in progress, skipping duplicate request');
      return;
    }
    
    // Don't fetch if we already have laws and document hasn't changed
    if (hasFetchedRef.current && laws.length > 0 && !error) {
      return;
    }

    if (!documentId) {
      setError('No document ID provided');
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching laws for document: ${documentId}`);
      const fetchedLaws = await fetchWithRetry(
        () => analyzeLaws(documentId, documentText || undefined, "India"),
        3, // max retries
        1000 // base delay 1s
      );
      
      console.log(`Successfully fetched ${fetchedLaws.length} laws`);
      setLaws(fetchedLaws);
      setError(null);
      hasFetchedRef.current = true;
    } catch (err: any) {
      console.error("Failed to fetch laws after retries:", err);
      
      // Provide specific error messages
      let errorMsg = "Failed to analyze applicable laws.";
      if (err.response?.status === 404) {
        errorMsg = "Document not found. Please upload the document first.";
      } else if (err.response?.status === 500) {
        errorMsg = "Server error while analyzing laws. Please try again later.";
      } else if (err.message?.includes('Network Error')) {
        errorMsg = "Network error. Please check your connection.";
      } else if (err.message?.includes('timeout')) {
        errorMsg = "Request timed out. The analysis is taking too long.";
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [documentId, documentText, laws.length, error]);

  useEffect(() => {
    // Reset fetch state when document changes
    hasFetchedRef.current = false;
    setLaws([]);
    setError(null);
    setRetryCount(0);
  }, [documentId]);

  useEffect(() => {
    // Only fetch when we have a documentId and haven't fetched yet
    if (documentId && !hasFetchedRef.current && !isFetchingRef.current) {
      fetchLaws();
    }
  }, [documentId, fetchLaws]);

  const handleRetry = () => {
    hasFetchedRef.current = false;
    setRetryCount(prev => prev + 1);
    fetchLaws();
  };

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
        <p className="text-gray-300 mb-2 max-w-md">{error}</p>
        {retryCount > 0 && (
          <p className="text-xs text-gray-500 mb-3">Retry attempt: {retryCount}</p>
        )}
        <div className="flex gap-3">
          <button 
            onClick={handleRetry}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-md text-sm font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (laws.length === 0) {
    return (
      <div className={`p-8 text-center border border-dashed border-gray-700 bg-gray-800/30 rounded-lg ${className}`}>
        <Scale className="w-12 h-12 text-gray-500 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-gray-300 mb-2">No Specific Laws Identified</h3>
        <p className="text-sm text-gray-500 mb-4">
          The analysis could not identify any specific statutes, regulations, or case laws explicitly referenced in this document.
        </p>
        <button 
          onClick={handleRetry}
          disabled={loading}
          className="text-orange-400 hover:text-orange-300 text-sm font-semibold uppercase tracking-wider flex items-center gap-2 mx-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Re-analyze
        </button>
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
