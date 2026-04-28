"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  History,
  FileStack,
  Bookmark,
  GitCompare,
  Settings,
  HelpCircle,
  Scale,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../lib/utils/cn";
import { getFeatures, FeatureFlags } from "../lib/features";

const allNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, feature: null },
  { name: "Documents", href: "/documents", icon: FileText, feature: null },
  { name: "Recent Analyses", href: "/analyses", icon: History, feature: null },
  { name: "Templates", href: "/templates", icon: FileStack, feature: "templates" },
  { name: "Saved Queries", href: "/queries", icon: Bookmark, feature: "savedQueries" },
  { name: "Compare Documents", href: "/compare", icon: GitCompare, feature: "compareDocuments" },
  { name: "Settings", href: "/settings", icon: Settings, feature: null },
  { name: "Help & Support", href: "/help", icon: HelpCircle, feature: null },
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

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-600 rounded-lg flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <span className="text-lg lg:text-xl font-bold">LegalAI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 lg:px-4 py-4 lg:py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 lg:px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-purple-600 text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Card - Hidden on mobile */}
      <div className="hidden lg:block p-4 m-4 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl">
        <div className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 mb-3 bg-white/20 rounded-lg">
          <Scale className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>
        <h3 className="mb-1 text-xs lg:text-sm font-semibold">AI-Powered Legal Simplification</h3>
        <p className="text-xs text-purple-200">Understand legal documents and make informed decisions with confidence.</p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-purple-600 text-white rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "flex flex-col h-full bg-[#1e1b4b] text-white transition-transform duration-300 ease-in-out",
          "fixed lg:static inset-y-0 left-0 z-40 w-64 lg:w-auto",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}
