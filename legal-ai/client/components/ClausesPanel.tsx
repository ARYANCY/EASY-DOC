'use client';

import { Lock, FileCheck, Calendar, Globe, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils/cn';

interface Clause {
  id: string;
  title: string;
  description: string;
  icon: 'confidentiality' | 'obligations' | 'term' | 'governing';
  clauseNumber: string;
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
};

export default function ClausesPanel({ clauses, className }: ClausesPanelProps) {
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
        {clauses.map((clause) => {
          const Icon = iconMap[clause.icon];
          const colors = colorMap[clause.icon];

          return (
            <div
              key={clause.id}
              className={cn(
                'p-4 rounded-lg border',
                colors.bg,
                colors.border
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-5 h-5', colors.icon)} />
                <span className="text-xs font-medium text-gray-500 uppercase">
                  Clause {clause.clauseNumber}
                </span>
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
