"use client";

import { ChevronUp, ChevronDown, AlertCircle, X } from "lucide-react";
import { cn } from "../lib/utils/cn";

interface BottomPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  errors?: string[];
  onDismissError?: (index: number) => void;
  children?: React.ReactNode;
  className?: string;
}

export default function BottomPanel({
  isOpen,
  onToggle,
  errors = [],
  onDismissError,
  children,
  className,
}: BottomPanelProps) {
  const hasErrors = errors.length > 0;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 shadow-lg z-30",
        "transition-transform duration-300 ease-out",
        isOpen ? "translate-y-0" : "translate-y-[calc(100%-48px)]",
        className
      )}
    >
      {/* Toggle Bar */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors",
          hasErrors && "bg-red-50 hover:bg-red-100"
        )}
      >
        <div className="flex items-center gap-2">
          {hasErrors && <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className={cn("font-medium", hasErrors ? "text-red-700" : "text-gray-700")}>
            {hasErrors ? `${errors.length} Error${errors.length > 1 ? "s" : ""}` : "Features & Status"}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Content */}
      <div className="px-4 py-4 max-h-64 overflow-y-auto">
        {/* Errors */}
        {errors.length > 0 && (
          <div className="space-y-2 mb-4">
            {errors.map((error, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm"
              >
                <span className="flex-1">{error}</span>
                {onDismissError && (
                  <button
                    onClick={() => onDismissError(index)}
                    className="p-0.5 hover:bg-red-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Custom Content */}
        {children}
      </div>
    </div>
  );
}
