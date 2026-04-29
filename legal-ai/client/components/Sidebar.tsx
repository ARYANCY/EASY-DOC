"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Search,
  Scale,
  Menu,
  X,
  History,
  ChevronRight,
} from "lucide-react";
import { cn } from "../lib/utils/cn";
import { getFeatures, FeatureFlags } from "../lib/features";

const allNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, description: "Overview & stats", feature: null },
  { name: "Documents", href: "/documents", icon: FileText, description: "Browse all files", feature: null },
  { name: "Upload", href: "/upload", icon: Upload, description: "Add new documents", feature: null },
  { name: "History", href: "/history", icon: History, description: "Past analyses", feature: null },
  { name: "Search", href: "/search", icon: Search, description: "Find content", feature: null },
];

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [features, setFeatures] = useState<FeatureFlags | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setFeatures(getFeatures());
  }, []);

  // Filter navigation based on enabled features
  const navigation = allNavigation.filter((item) => {
    if (!item.feature) return true;
    return features?.[item.feature as keyof FeatureFlags] ?? true;
  });

  if (!features) return null;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-[60] lg:hidden p-3 bg-[#181715] text-[#fffdf9] border border-[#181715] shadow-[0_18px_40px_rgba(24,23,21,0.18)] transition-all"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#181715]/45 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "flex flex-col h-full bg-[#fffdf9] border-r border-[#e8e1d8] transition-all duration-300 ease-in-out",
          "fixed lg:fixed inset-y-0 left-0 z-50 w-64",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {/* Logo Header */}
        <div className="p-5 border-b border-[#e8e1d8]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#181715] flex items-center justify-center shadow-[0_14px_28px_rgba(24,23,21,0.18)] transition-all group-hover:-translate-y-0.5">
              <Scale className="w-5 h-5 text-[#fffdf9]" />
            </div>
            <div>
              <span className="font-editorial text-2xl leading-none text-[#181715]">
                LegalAI
              </span>
              <p className="editorial-label mt-1">Atelier Intelligence</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <div className="editorial-label mb-4 px-3">
            Collection
          </div>
          
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 text-sm font-medium transition-all group border border-transparent",
                  isActive
                    ? "bg-[#181715] text-[#fffdf9] shadow-[0_14px_30px_rgba(24,23,21,0.12)]"
                    : "text-[#5f5952] hover:bg-[#f7f4ef] hover:text-[#181715] hover:border-[#e8e1d8]"
                )}
              >
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center transition-colors",
                  isActive ? "bg-[#fffdf9]/12" : "bg-[#f0ebe3] group-hover:bg-[#fffdf9]"
                )}>
                  <Icon className={cn(
                    "w-4 h-4",
                    isActive ? "text-[#fffdf9]" : "text-[#777169] group-hover:text-[#181715]"
                  )} />
                </div>
                <div className="flex-1">
                  <span className="block">{item.name}</span>
                  <span className={cn("text-xs font-normal", isActive ? "text-[#fffdf9]/60" : "text-[#9a938a]")}>{item.description}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-[#fffdf9]/70" />}
              </Link>
            );
          })}
        </nav>

        {/* Pro Upgrade Card */}
        <div className="p-4 m-4 bg-[#f3eee6] border border-[#e8e1d8] text-[#181715]">
          <div className="aspect-[4/3] bg-[#181715] mb-4 overflow-hidden">
            <div className="h-full w-full bg-[linear-gradient(135deg,#181715_0%,#2d2924_48%,#b99962_49%,#fffdf9_50%,#f0ebe3_100%)] opacity-90" />
          </div>
          <div>
            <p className="editorial-label">Premium Review</p>
            <h3 className="font-editorial text-2xl mt-1">Legal Atelier</h3>
            <p className="text-xs text-[#777169] mt-2 leading-relaxed">
              Minimal analysis, refined summaries, sharper decisions.
            </p>
            <button className="mt-4 w-full border border-[#181715] py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-[#181715] hover:text-[#fffdf9] transition-colors">
              Upgrade
            </button>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-[#e8e1d8]">
          <button className="flex items-center gap-3 w-full p-2 hover:bg-[#f7f4ef] transition-colors">
            <div className="w-10 h-10 bg-[#181715] flex items-center justify-center text-[#fffdf9] font-semibold text-sm">
              U
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-[#181715]">User Account</p>
              <p className="text-xs text-[#777169]">Private collection</p>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
