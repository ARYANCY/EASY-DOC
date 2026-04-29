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
      <div className="hidden sm:flex items-center bg-[#f7f4ef] border border-[#e8e1d8] p-1">
        {buttons.map((btn) => (
          <button
            key={btn.id}
            onClick={btn.onClick}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-150",
              btn.active
                ? "bg-[#181715] text-[#fffdf9] shadow-sm"
                : "text-[#777169] hover:bg-[#fffdf9] hover:text-[#181715]"
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
        <button className="p-2 bg-[#f7f4ef] border border-[#e8e1d8] hover:bg-[#fffdf9]">
          <PanelRight className="w-5 h-5 text-[#181715]" />
        </button>
        <div className="absolute right-0 top-full mt-2 w-44 bg-[#fffdf9] shadow-lg border border-[#e8e1d8] py-1 hidden group-hover:block z-50">
          {buttons.map((btn) => (
            <button
              key={btn.id}
              onClick={btn.onClick}
              className={cn(
                "w-full flex items-center gap-2 px-4 py-2 text-sm text-left",
                btn.active ? "bg-[#181715] text-[#fffdf9]" : "text-[#5f5952] hover:bg-[#f7f4ef]"
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
