"use client";

import { MessageSquare, ShieldAlert, Scissors, FileText, PanelRight } from "lucide-react";
import { cn } from "../lib/utils/cn";

interface PanelTogglesProps {
  showChat: boolean;
  showRisk: boolean;
  showClauses: boolean;
  showSummary: boolean;
  onToggleChat: () => void;
  onToggleRisk: () => void;
  onToggleClauses: () => void;
  onToggleSummary: () => void;
  className?: string;
}

export default function PanelToggles({
  showChat,
  showRisk,
  showClauses,
  showSummary,
  onToggleChat,
  onToggleRisk,
  onToggleClauses,
  onToggleSummary,
  className,
}: PanelTogglesProps) {
  const buttons = [
    { id: "chat", icon: MessageSquare, label: "Chat", active: showChat, onClick: onToggleChat },
    { id: "risk", icon: ShieldAlert, label: "Risk", active: showRisk, onClick: onToggleRisk },
    { id: "clauses", icon: Scissors, label: "Clauses", active: showClauses, onClick: onToggleClauses },
    { id: "summary", icon: FileText, label: "Summary", active: showSummary, onClick: onToggleSummary },
  ];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
        {buttons.map((btn) => (
          <button
            key={btn.id}
            onClick={btn.onClick}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
              btn.active
                ? "bg-purple-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-white hover:shadow-sm"
            )}
            title={btn.label}
          >
            <btn.icon className="w-4 h-4" />
            <span className="hidden md:inline">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile dropdown */}
      <div className="sm:hidden relative group">
        <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
          <PanelRight className="w-5 h-5 text-gray-600" />
        </button>
        <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block z-50">
          {buttons.map((btn) => (
            <button
              key={btn.id}
              onClick={btn.onClick}
              className={cn(
                "w-full flex items-center gap-2 px-4 py-2 text-sm text-left",
                btn.active ? "bg-purple-50 text-purple-700" : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <btn.icon className="w-4 h-4" />
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
