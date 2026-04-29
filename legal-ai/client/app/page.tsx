"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { 
  FileText, 
  Clock, 
  Shield, 
  TrendingUp, 
  Loader2, 
  AlertCircle, 
  Plus,
  Search,
  ArrowRight,
  Activity,
  MoreHorizontal
} from "lucide-react";
import { getDashboardStats, getRecentDocuments, DashboardStats, RecentDocument } from "../features/dashboard/dashboardService";
import { getCurrentUser } from "../features/auth/authService";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [documents, setDocuments] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);

    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, docsData] = await Promise.all([
          getDashboardStats().catch(() => ({
            totalDocuments: 0,
            analyzedThisMonth: 0,
            averageRiskScore: 0,
            pendingReview: 0
          })),
          getRecentDocuments(5).catch(() => [])
        ]);
        setStats(statsData);
        setDocuments(Array.isArray(docsData) ? docsData : []);
      } catch (err) {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const getRiskColor = (risk: number) => {
    if (risk > 70) return "bg-red-500";
    if (risk > 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getRiskBgColor = (risk: number) => {
    if (risk > 70) return "bg-red-50 border-red-100";
    if (risk > 40) return "bg-yellow-50 border-yellow-100";
    return "bg-green-50 border-green-100";
  };

  if (!user) return null;

  return (
    <div className="min-h-screen editorial-shell">
      <Sidebar />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-6 mb-8">
              <div>
                <p className="editorial-label">Legal Workroom</p>
                <h1 className="font-editorial text-5xl sm:text-6xl lg:text-7xl leading-[0.92] text-[#181715] mt-3">
                  Review with editorial precision.
                </h1>
                <p className="text-[#777169] mt-5 max-w-2xl">
                  Welcome back, {user?.name || 'User'}. Your contracts, risk notes, and AI analysis are arranged like a premium dossier.
                </p>
              </div>
              <div className="editorial-card p-5 flex flex-col justify-between min-h-48">
                <div>
                  <p className="editorial-label">Current Edit</p>
                  <p className="font-editorial text-3xl mt-2">Spring review</p>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                <Link
                  href="/upload"
                  className="editorial-button"
                >
                  <Plus className="w-4 h-4" />
                  Upload Document
                </Link>
                <Link
                  href="/search"
                  className="editorial-button-light"
                >
                  <Search className="w-4 h-4" />
                  Search
                </Link>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                  <p className="text-slate-500 text-sm">Loading dashboard...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Stats Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {/* Total Documents */}
                  <div className="editorial-card p-6 transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="editorial-label mb-3">Documents</p>
                        <p className="font-editorial text-5xl text-[#181715]">{stats?.totalDocuments || 0}</p>
                        <p className="text-xs text-[#777169] mt-2">All time uploads</p>
                      </div>
                      <div className="w-12 h-12 bg-[#181715] flex items-center justify-center transition-colors">
                        <FileText className="w-6 h-6 text-[#fffdf9]" />
                      </div>
                    </div>
                  </div>

                  {/* Analyzed This Month */}
                  <div className="editorial-card p-6 transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="editorial-label mb-3">This Month</p>
                        <p className="font-editorial text-5xl text-[#181715]">{stats?.analyzedThisMonth || 0}</p>
                        <p className="text-xs text-[#777169] mt-2 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          Active processing
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-[#f0ebe3] flex items-center justify-center transition-colors">
                        <TrendingUp className="w-6 h-6 text-[#181715]" />
                      </div>
                    </div>
                  </div>

                  {/* Average Risk Score */}
                  <div className="editorial-card p-6 transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="editorial-label mb-3">Avg Risk</p>
                        <div className="flex items-baseline gap-2">
                          <p className="font-editorial text-5xl text-[#181715]">{stats?.averageRiskScore || 0}</p>
                          <span className="text-sm text-[#777169]">/100</span>
                        </div>
                        <div className="mt-3 h-1.5 bg-[#eee7dc] overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${getRiskColor(stats?.averageRiskScore || 0)}`}
                            style={{ width: `${stats?.averageRiskScore || 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-[#f0ebe3] flex items-center justify-center transition-colors ml-3">
                        <Shield className="w-6 h-6 text-[#a77a35]" />
                      </div>
                    </div>
                  </div>

                  {/* Pending Review */}
                  <div className="editorial-card p-6 transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="editorial-label mb-3">Pending</p>
                        <p className="font-editorial text-5xl text-[#181715]">{stats?.pendingReview || 0}</p>
                        <p className="text-xs text-[#777169] mt-2">Requires attention</p>
                      </div>
                      <div className="w-12 h-12 bg-[#181715] flex items-center justify-center transition-colors">
                        <Clock className="w-6 h-6 text-[#fffdf9]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Documents Section */}
                <div className="editorial-card overflow-hidden">
                  <div className="px-6 py-5 border-b border-[#e8e1d8] flex items-center justify-between">
                    <div>
                      <p className="editorial-label">Recent Documents</p>
                      <h2 className="font-editorial text-3xl text-[#181715] mt-1">Latest dossiers</h2>
                    </div>
                    <Link 
                      href="/documents"
                      className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.14em] text-[#181715] hover:text-[#a77a35] transition-colors"
                    >
                      View all
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {documents.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <div className="w-16 h-16 bg-[#f0ebe3] flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-[#777169]" />
                      </div>
                      <h3 className="font-editorial text-2xl text-[#181715] mb-1">No documents yet</h3>
                      <p className="text-[#777169] text-sm mb-4">Upload your first document to get started</p>
                      <Link
                        href="/upload"
                        className="editorial-button"
                      >
                        <Plus className="w-4 h-4" />
                        Upload Document
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#e8e1d8]">
                      {documents.map((doc) => (
                        <Link
                          key={doc.id}
                          href={`/document/${doc.id}`}
                          className="flex items-center gap-4 px-6 py-4 hover:bg-[#f7f4ef] transition-colors group"
                        >
                          <div className={`w-12 h-12 flex items-center justify-center flex-shrink-0 ${getRiskBgColor(doc.risk || 0)}`}>
                            <FileText className="w-5 h-5 text-[#181715]" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-[#181715] truncate group-hover:text-[#a77a35] transition-colors">
                              {doc.name}
                            </h3>
                            <p className="text-xs text-[#777169] mt-0.5">{formatDate(doc.date)}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            {doc.risk !== null && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#777169]">Risk:</span>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                  doc.risk > 70 ? "bg-red-100 text-red-700" :
                                  doc.risk > 40 ? "bg-amber-100 text-amber-700" :
                                  "bg-green-100 text-green-700"
                                }`}>
                                  {doc.risk}
                                </span>
                              </div>
                            )}
                            
                            <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                              doc.status === "Analyzed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                              doc.status === "Pending" ? "bg-amber-50 text-amber-700 border-amber-100" :
                              "bg-slate-50 text-slate-700 border-slate-200"
                            }`}>
                              {doc.status}
                            </span>

                            <button className="w-8 h-8 hover:bg-[#eee7dc] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                              <MoreHorizontal className="w-4 h-4 text-[#777169]" />
                            </button>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                  <Link 
                    href="/upload"
                    className="flex items-center gap-4 p-5 bg-[#181715] text-[#fffdf9] transition-all shadow-lg hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 bg-[#fffdf9]/10 flex items-center justify-center backdrop-blur-sm">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Upload Document</h3>
                      <p className="text-sm text-[#fffdf9]/60 mt-0.5">Add new legal documents</p>
                    </div>
                  </Link>

                  <Link 
                    href="/search"
                    className="flex items-center gap-4 p-5 bg-[#fffdf9] border border-[#e8e1d8] text-[#181715] transition-all shadow-lg hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 bg-[#f0ebe3] flex items-center justify-center backdrop-blur-sm">
                      <Search className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Search Documents</h3>
                      <p className="text-sm text-[#777169] mt-0.5">Find specific clauses</p>
                    </div>
                  </Link>

                  <Link 
                    href="/history"
                    className="flex items-center gap-4 p-5 bg-[#f0ebe3] border border-[#e8e1d8] text-[#181715] transition-all shadow-lg hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 bg-[#fffdf9] flex items-center justify-center backdrop-blur-sm">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">View History</h3>
                      <p className="text-sm text-[#777169] mt-0.5">Past analyses & chats</p>
                    </div>
                  </Link>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
