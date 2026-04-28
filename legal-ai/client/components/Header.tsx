"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Plus, LogOut, Settings, User } from "lucide-react";
import { cn } from "../lib/utils/cn";
import Link from "next/link";
import { getFeatures, FeatureFlags } from "../lib/features";
import { getCurrentUser, logout } from "../features/auth/authService";

interface HeaderProps {
  className?: string;
  documentName?: string;
  uploadDate?: string;
  fileSize?: string;
  onMenuClick?: () => void;
  children?: React.ReactNode;
}

export default function Header({ className, documentName, uploadDate, fileSize, onMenuClick, children }: HeaderProps) {
  const router = useRouter();
  const [features, setFeatures] = useState<FeatureFlags | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setFeatures(getFeatures());
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const uploadEnabled = features?.uploadDocument ?? true;
  const notificationsEnabled = features?.notifications ?? true;

  const handleLogout = () => {
    logout();
    router.push("/login");
    setIsProfileOpen(false);
  };

  if (!features) return null;

  return (
    <header className={cn("bg-white border-b border-slate-200 px-4 lg:px-8 py-4", className)}>
      <div className="flex items-center justify-between gap-4">
        {/* Left - Page Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            {documentName ? (
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">{documentName}</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Uploaded {uploadDate} • {fileSize}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Overview</p>
                <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
              </div>
            )}
          </div>
        </div>

        {/* Center - Toggle Buttons */}
        {children && (
          <div className="hidden lg:flex items-center">
            {children}
          </div>
        )}

        {/* Right - Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {uploadEnabled && (
            <Link
              href="/upload"
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Upload</span>
            </Link>
          )}

          {notificationsEnabled && (
            <button className="relative p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>
          )}

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 pl-3 border-l border-slate-200 hover:bg-slate-50 rounded-xl p-1.5 transition-colors"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-slate-900 leading-tight">{user?.name || "User"}</p>
                <p className="text-xs text-slate-500 leading-tight">{user?.email || "user@email.com"}</p>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isProfileOpen && "rotate-180")} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                <div className="px-4 py-3 border-b border-slate-100 lg:hidden">
                  <p className="text-sm font-semibold text-slate-900">{user?.name || "User"}</p>
                  <p className="text-xs text-slate-500">{user?.email || ""}</p>
                </div>
                
                <div className="px-2">
                  <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                    <User className="w-4 h-4 text-slate-400" />
                    Profile
                  </button>
                  <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                    <Settings className="w-4 h-4 text-slate-400" />
                    Settings
                  </button>
                </div>
                
                <div className="mt-2 pt-2 border-t border-slate-100 px-2">
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
