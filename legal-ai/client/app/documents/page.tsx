"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { FileText, Loader2, AlertCircle, Search, Filter } from "lucide-react";
import { getRecentDocuments, RecentDocument } from "../../features/dashboard/dashboardService";
import { getCurrentUser } from "../../features/auth/authService";
import Link from "next/link";

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
        const docsData = await getRecentDocuments(50); // Get more documents
        setDocuments(Array.isArray(docsData) ? docsData : []);
      } catch (err) {
        setError("Failed to load documents");
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
      year: "numeric"
    });
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
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

            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-sm mb-6">
              <div className="p-4 flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900">
                  <Filter className="w-5 h-5" />
                  Filter
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    All Documents ({filteredDocuments.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {filteredDocuments.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No documents found.</p>
                      {searchTerm && (
                        <p className="text-sm mt-1">Try adjusting your search</p>
                      )}
                    </div>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <Link
                              href={`/document/${doc.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-purple-600"
                            >
                              {doc.name}
                            </Link>
                            <p className="text-xs text-gray-500">
                              Uploaded {formatDate(doc.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {doc.risk !== null && (
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                doc.risk > 70
                                  ? "bg-red-100 text-red-700"
                                  : doc.risk > 40
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              Risk: {doc.risk}/100
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              doc.status === "Analyzed"
                                ? "bg-green-100 text-green-700"
                                : doc.status === "Pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
