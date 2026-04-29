"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { FileText, Loader2, AlertCircle, ChevronRight, Clock, MessageSquare, AlertTriangle, FileCheck } from "lucide-react";
import { getRecentDocuments, RecentDocument } from "../../features/dashboard/dashboardService";
import { getCurrentUser } from "../../features/auth/authService";
import Link from "next/link";

interface DocumentHistory extends RecentDocument {
  summary?: string;
  riskScore?: number;
  chatCount?: number;
  lastAnalyzed?: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentHistory[]>([]);
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

    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const docsData = await getRecentDocuments(50);
        setDocuments(Array.isArray(docsData) ? docsData : []);
      } catch (err) {
        setError("Failed to load document history");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Document History</h1>
                <p className="text-gray-500 mt-1">View analysis history and chat logs</p>
              </div>
              <Link
                href="/upload"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Upload New
              </Link>
            </div>

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
              <div className="space-y-4">
                {documents.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No document history found.</p>
                    <p className="text-sm mt-1">Upload documents to see their analysis history</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/document/${doc.id}`}
                      className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Uploaded {formatDate(doc.date)}
                            </p>
                            
                            {/* Analysis Summary */}
                            <div className="flex items-center gap-4 mt-3">
                              {doc.risk !== null && (
                                <div className="flex items-center gap-1.5">
                                  <AlertTriangle className={`w-4 h-4 ${
                                    doc.risk > 70 ? "text-red-500" : 
                                    doc.risk > 40 ? "text-yellow-500" : "text-green-500"
                                  }`} />
                                  <span className={`text-sm font-medium ${
                                    doc.risk > 70 ? "text-red-600" : 
                                    doc.risk > 40 ? "text-yellow-600" : "text-green-600"
                                  }`}>
                                    Risk: {doc.risk}/100
                                  </span>
                                </div>
                              )}
                              {doc.chatCount !== undefined && doc.chatCount > 0 && (
                                <div className="flex items-center gap-1.5 text-gray-500">
                                  <MessageSquare className="w-4 h-4" />
                                  <span className="text-sm">{doc.chatCount} chats</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <FileCheck className="w-4 h-4" />
                                <span className="text-sm capitalize">{doc.status}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                      
                      {doc.summary && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-sm text-gray-600 line-clamp-2">{doc.summary}</p>
                        </div>
                      )}
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
