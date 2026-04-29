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
        className="fixed top-4 left-4 z-[60] lg:hidden p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-300 ease-in-out",
          "fixed lg:fixed inset-y-0 left-0 z-50 w-72",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {/* Logo Header */}
        <div className="p-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:shadow-blue-300 transition-all">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                LegalAI
              </span>
              <p className="text-xs text-slate-500 -mt-0.5">Document Intelligence</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-3">
            Menu
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
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group",
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                  isActive ? "bg-blue-100" : "bg-slate-100 group-hover:bg-white"
                )}>
                  <Icon className={cn(
                    "w-4 h-4",
                    isActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
                  )} />
                </div>
                <div className="flex-1">
                  <span className="block">{item.name}</span>
                  <span className="text-xs text-slate-400 font-normal">{item.description}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-blue-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Pro Upgrade Card */}
        <div className="p-4 m-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">LegalAI Pro</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Unlock advanced AI features and unlimited document analysis
              </p>
              <button className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-100">
          <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              U
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-900">User Account</p>
              <p className="text-xs text-slate-500">Free Plan</p>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
