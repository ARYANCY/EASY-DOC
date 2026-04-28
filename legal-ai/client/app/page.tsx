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
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="lg:ml-72 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-500 mt-1">Welcome back, {user?.name || 'User'}</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Upload Document
                </Link>
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm font-medium text-sm"
                >
                  <Search className="w-4 h-4" />
                  Search
                </Link>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                  {/* Total Documents */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Documents</p>
                        <p className="text-3xl font-bold text-slate-900">{stats?.totalDocuments || 0}</p>
                        <p className="text-xs text-slate-400 mt-2">All time uploads</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Analyzed This Month */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Analyzed This Month</p>
                        <p className="text-3xl font-bold text-slate-900">{stats?.analyzedThisMonth || 0}</p>
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          Active processing
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>

                  {/* Average Risk Score */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-500 mb-1">Avg Risk Score</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-slate-900">{stats?.averageRiskScore || 0}</p>
                          <span className="text-sm text-slate-400">/100</span>
                        </div>
                        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${getRiskColor(stats?.averageRiskScore || 0)}`}
                            style={{ width: `${stats?.averageRiskScore || 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors ml-3">
                        <Shield className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </div>

                  {/* Pending Review */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Pending Review</p>
                        <p className="text-3xl font-bold text-slate-900">{stats?.pendingReview || 0}</p>
                        <p className="text-xs text-slate-400 mt-2">Requires attention</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Documents Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Recent Documents</h2>
                      <p className="text-sm text-slate-500 mt-0.5">Latest uploads and analysis</p>
                    </div>
                    <Link 
                      href="/documents"
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      View all
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {documents.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                      <h3 className="text-slate-900 font-medium mb-1">No documents yet</h3>
                      <p className="text-slate-500 text-sm mb-4">Upload your first document to get started</p>
                      <Link
                        href="/upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Upload Document
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {documents.map((doc) => (
                        <Link
                          key={doc.id}
                          href={`/history/${doc.id}`}
                          className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getRiskBgColor(doc.risk || 0)}`}>
                            <FileText className="w-5 h-5 text-slate-600" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {doc.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">{formatDate(doc.date)}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            {doc.risk !== null && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Risk:</span>
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

                            <button className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                              <MoreHorizontal className="w-4 h-4 text-slate-400" />
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
                    className="flex items-center gap-4 p-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Upload Document</h3>
                      <p className="text-sm text-blue-100 mt-0.5">Add new legal documents</p>
                    </div>
                  </Link>

                  <Link 
                    href="/search"
                    className="flex items-center gap-4 p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Search className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Search Documents</h3>
                      <p className="text-sm text-emerald-100 mt-0.5">Find specific clauses</p>
                    </div>
                  </Link>

                  <Link 
                    href="/history"
                    className="flex items-center gap-4 p-5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl text-white hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">View History</h3>
                      <p className="text-sm text-purple-100 mt-0.5">Past analyses & chats</p>
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
