"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Upload, User, Menu } from "lucide-react";
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
    <header className={cn("bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4", className)}>
      <div className="flex items-center justify-between gap-4">
        {/* Left - Mobile Menu + Document Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="min-w-0 flex-1">
            {documentName ? (
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">{documentName}</h1>
                  <span className="text-gray-400 hidden sm:inline">✎</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                  Uploaded on {uploadDate} • {fileSize}
                </p>
              </div>
            ) : (
              <h1 className="text-base sm:text-xl font-semibold text-gray-900">Dashboard</h1>
            )}
          </div>
        </div>

        {/* Center - Toggle Buttons */}
        {children && (
          <div className="hidden md:flex items-center">
            {children}
          </div>
        )}

        {/* Right - Actions */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {uploadEnabled && (
            <Link
              href="/upload"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Upload className="w-4 h-4" />
              <span className="font-medium hidden sm:inline">Upload New Document</span>
              <span className="font-medium sm:hidden">Upload</span>
            </Link>
          )}

          {notificationsEnabled && (
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          )}

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-gray-200"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm sm:text-base">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500">{user?.email || ""}</p>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isProfileOpen && "rotate-180")} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100 md:hidden">
                  <p className="text-sm font-medium text-gray-900">{user?.name || "User"}</p>
                  <p className="text-xs text-gray-500">{user?.email || ""}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
