"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { FileText, Clock, Shield, TrendingUp, Loader2, AlertCircle } from "lucide-react";
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Documents</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.totalDocuments || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Analyzed This Month</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.analyzedThisMonth || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Average Risk Score</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.averageRiskScore || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pending Review</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.pendingReview || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Documents */}
                <div className="bg-white rounded-xl shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {documents.length === 0 ? (
                      <div className="px-6 py-8 text-center text-gray-500">
                        No documents found. Upload your first document to get started.
                      </div>
                    ) : (
                      documents.map((doc) => (
                        <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <div>
                              <Link href={`/document/${doc.id}`} className="text-sm font-medium text-gray-900 hover:text-purple-600">
                                {doc.name}
                              </Link>
                              <p className="text-xs text-gray-500">{formatDate(doc.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {doc.risk !== null && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                doc.risk > 70 ? "bg-red-100 text-red-700" :
                                doc.risk > 40 ? "bg-yellow-100 text-yellow-700" :
                                "bg-green-100 text-green-700"
                              }`}>
                                Risk: {doc.risk}/100
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              doc.status === "Analyzed" ? "bg-green-100 text-green-700" :
                              doc.status === "Pending" ? "bg-yellow-100 text-yellow-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {doc.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
