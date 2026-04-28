"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { 
  FileText, 
  Loader2, 
  AlertCircle, 
  ArrowLeft, 
  Clock,
  MessageSquare,
  AlertTriangle,
  FileCheck,
  Download,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { getDocument } from "../../../features/document/documentService";
import { getRiskAnalysis } from "../../../features/risk/riskService";
import { extractClauses } from "../../../features/clause/clauseService";
import { getChatHistory, ChatMessage } from "../../../features/chat/chatHistoryService";
import { getCurrentUser } from "../../../features/auth/authService";
import Link from "next/link";

interface AnalysisData {
  document: any;
  risk: any;
  clauses: any[];
  chatHistory: ChatMessage[];
}

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>("document");

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
        const [doc, risk, clauses, chat] = await Promise.all([
          getDocument(documentId),
          getRiskAnalysis(documentId).catch(() => null),
          extractClauses(documentId).catch(() => []),
          getChatHistory(documentId).catch(() => ({ messages: [], totalMessages: 0 })),
        ]);
        
        setData({
          document: doc,
          risk,
          clauses: Array.isArray(clauses) ? clauses : [],
          chatHistory: chat?.messages || []
        });
      } catch (err) {
        setError("Failed to load document history");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [documentId, router]);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-gray-600">{error || "Document not found"}</p>
          <Link href="/history" className="text-purple-600 hover:underline mt-4 inline-block">
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  const { document, risk, clauses, chatHistory } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            {/* Back Button */}
            <Link 
              href="/history" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to History
            </Link>

            {/* Document Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-7 h-7 text-purple-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{document?.filename}</h1>
                    <p className="text-gray-500 mt-1">
                      Uploaded {formatDate(document?.createdAt || new Date().toISOString())}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      {risk?.risk_score !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className={`w-4 h-4 ${
                            risk.risk_score > 70 ? "text-red-500" : 
                            risk.risk_score > 40 ? "text-yellow-500" : "text-green-500"
                          }`} />
                          <span className={`text-sm font-medium ${
                            risk.risk_score > 70 ? "text-red-600" : 
                            risk.risk_score > 40 ? "text-yellow-600" : "text-green-600"
                          }`}>
                            Risk Score: {risk.risk_score}/100
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <FileCheck className="w-4 h-4" />
                        <span className="text-sm capitalize">{document?.status || "Analyzed"}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-4">
              {/* Document Content */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection("document")}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <h2 className="font-semibold text-gray-900">Document Content</h2>
                  </div>
                  {activeSection === "document" ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {activeSection === "document" && (
                  <div className="px-6 pb-6">
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                        {document?.text || "No text content available"}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Risk Analysis */}
              {risk && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleSection("risk")}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <h2 className="font-semibold text-gray-900">Risk Analysis</h2>
                    </div>
                    {activeSection === "risk" ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {activeSection === "risk" && (
                    <div className="px-6 pb-6">
                      <div className="bg-orange-50 rounded-lg p-4 mb-4">
                        <p className="text-orange-800 font-medium">
                          Risk Score: {risk.risk_score}/100
                        </p>
                        <p className="text-orange-600 text-sm mt-1">
                          {risk.summary || "No summary available"}
                        </p>
                      </div>
                      {risk.flags && risk.flags.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-medium text-gray-900 mb-2">Risk Flags:</h3>
                          {risk.flags.map((flag: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                              <div>
                                <p className="font-medium text-red-800">{flag.title}</p>
                                <p className="text-sm text-red-600">{flag.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Key Clauses */}
              {clauses.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleSection("clauses")}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-blue-600" />
                      <h2 className="font-semibold text-gray-900">Key Clauses ({clauses.length})</h2>
                    </div>
                    {activeSection === "clauses" ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {activeSection === "clauses" && (
                    <div className="px-6 pb-6">
                      <div className="space-y-3">
                        {clauses.map((clause: any, idx: number) => (
                          <div key={idx} className="p-4 bg-blue-50 rounded-lg">
                            <h3 className="font-medium text-blue-900">{clause.title}</h3>
                            <p className="text-sm text-blue-700 mt-1">{clause.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chat History */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection("chat")}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <h2 className="font-semibold text-gray-900">Chat History</h2>
                  </div>
                  {activeSection === "chat" ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {activeSection === "chat" && (
                  <div className="px-6 pb-6">
                    {chatHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No chat history available</p>
                        <Link 
                          href={`/document/${documentId}`}
                          className="text-purple-600 hover:underline mt-2 inline-block"
                        >
                          Start a conversation
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {chatHistory.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                msg.role === "user"
                                  ? "bg-purple-600 text-white"
                                  : "bg-gray-100 text-gray-900"
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {formatDate(msg.timestamp || new Date().toISOString())}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection("metadata")}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <h2 className="font-semibold text-gray-900">Analysis Details</h2>
                  </div>
                  {activeSection === "metadata" ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {activeSection === "metadata" && (
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Document ID</p>
                        <p className="font-medium text-gray-900">{documentId}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Status</p>
                        <p className="font-medium text-gray-900 capitalize">{document?.status}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Pages</p>
                        <p className="font-medium text-gray-900">
                          {document?.metadata?.pageCount || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Word Count</p>
                        <p className="font-medium text-gray-900">
                          {document?.text?.split(" ").length || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Last Updated</p>
                        <p className="font-medium text-gray-900">
                          {formatDate(document?.updatedAt || new Date().toISOString())}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
