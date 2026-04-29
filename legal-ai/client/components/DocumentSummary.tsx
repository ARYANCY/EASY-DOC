'use client';

import { FileText, Sparkles } from 'lucide-react';

interface DocumentSummaryProps {
  summary: string;
  totalPages?: number;
  totalWords?: number;
  analyzedAt?: string;
  className?: string;
}

export default function DocumentSummary({
  summary,
  totalPages = 0,
  totalWords = 0,
  analyzedAt,
  className,
}: DocumentSummaryProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h2 className="font-semibold text-gray-900">Document Summary (AI Generated)</h2>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mb-6">{summary}</p>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Pages</p>
          <p className="text-lg font-semibold text-gray-900">{totalPages}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Words</p>
          <p className="text-lg font-semibold text-gray-900">{totalWords.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Analyzed At</p>
          <p className="text-sm font-medium text-gray-900">{analyzedAt}</p>
        </div>
      </div>
    </div>
  );
}
