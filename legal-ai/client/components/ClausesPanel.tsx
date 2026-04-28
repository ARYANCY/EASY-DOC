'use client';

import { Lock, FileCheck, Calendar, Globe, ChevronRight, FileText } from 'lucide-react';
import { cn } from '../lib/utils/cn';

interface Clause {
  id: string;
  title: string;
  description: string;
  type?: string;
  text?: string;
  icon?: 'confidentiality' | 'obligations' | 'term' | 'governing' | 'default';
  clauseNumber?: string;
}

interface ClausesPanelProps {
  clauses: Clause[];
  className?: string;
}

const iconMap = {
  confidentiality: Lock,
  obligations: FileCheck,
  term: Calendar,
  governing: Globe,
  default: FileText,
};

const colorMap = {
  confidentiality: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
  },
  obligations: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
  },
  term: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'text-purple-600',
  },
  governing: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'text-orange-600',
  },
  default: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-600',
  },
};

const getIconFromType = (type?: string): 'confidentiality' | 'obligations' | 'term' | 'governing' | 'default' => {
  if (!type) return 'default';
  const lowerType = type.toLowerCase();
  if (lowerType.includes('confidential')) return 'confidentiality';
  if (lowerType.includes('obligation')) return 'obligations';
  if (lowerType.includes('term') || lowerType.includes('duration')) return 'term';
  if (lowerType.includes('govern') || lowerType.includes('law') || lowerType.includes('jurisdiction')) return 'governing';
  return 'default';
};

export default function ClausesPanel({ clauses, className }: ClausesPanelProps) {
  if (!clauses || clauses.length === 0) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No clauses extracted yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Key Clauses Extracted</h2>
        <button className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium">
          View All Clauses
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {clauses.map((clause, index) => {
          const iconType = clause.icon || getIconFromType(clause.type);
          const Icon = iconMap[iconType];
          const colors = colorMap[iconType];

          return (
            <div
              key={clause.id || index}
              className={cn(
                'p-4 rounded-lg border',
                colors.bg,
                colors.border
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-5 h-5', colors.icon)} />
                {clause.clauseNumber && (
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    Clause {clause.clauseNumber}
                  </span>
                )}
                {clause.type && !clause.clauseNumber && (
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {clause.type}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{clause.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{clause.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
