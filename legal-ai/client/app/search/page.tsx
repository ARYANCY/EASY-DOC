"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { Search, FileText, Loader2, AlertCircle, Filter, X, ChevronRight } from "lucide-react";
import { getCurrentUser } from "../../features/auth/authService";
import { searchDocuments } from "../../features/search/searchService";
import Link from "next/link";

interface SearchResult {
  id: string;
  documentId: string;
  filename: string;
  text: string;
  snippet: string;
  score: number;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!query.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      
      const response = await searchDocuments(query);
      
      // Backend now returns enriched results with documentId, filename, snippet
      const transformedResults: SearchResult[] = response.results.map((result: any, index: number) => ({
        id: `${result.documentId || 'unknown'}-${index}`,
        documentId: result.documentId || '',
        filename: result.filename || 'Unknown Document',
        text: result.text || '',
        snippet: result.snippet || result.text?.substring(0, 200) + '...' || 'No preview available',
        score: result.score || 0,
      }));
      
      setResults(transformedResults);
      setLoading(false);
    } catch (err) {
      console.error('Search error:', err);
      setError("Search failed. Please try again.");
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setError(null);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Search Documents</h1>
              <p className="text-gray-500 mt-1">
                Search across all your analyzed documents
              </p>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <form onSubmit={handleSearch} className="relative">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search for clauses, terms, or keywords..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full pl-12 pr-10 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </button>
                </div>
              </form>

              {/* Filters */}
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Filters:</span>
                <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200">
                  All Documents
                </button>
                <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200">
                  High Risk
                </button>
                <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200">
                  Recent
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Results */}
            {hasSearched && !loading && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Search Results {results.length > 0 && `(${results.length})`}
                  </h2>
                </div>
                
                {results.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No results found for &quot;{query}&quot;</p>
                    <p className="text-sm mt-1">Try different keywords or check your spelling</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {results.map((result) => (
                      <Link
                        key={result.id}
                        href={`/history/${result.documentId}`}
                        className="px-6 py-4 block hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{result.filename}</h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {result.snippet}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-500">
                                Relevance: {Math.round(result.score * 100)}%
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty State - Before Search */}
            {!hasSearched && !loading && (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Search Your Documents
                </h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  Enter keywords to search across all your uploaded and analyzed documents. 
                  Find specific clauses, terms, or sections quickly.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  <span className="text-sm text-gray-400">Try searching for:</span>
                  {["confidentiality", "termination", "liability", "payment"].map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setQuery(term);
                        handleSearch();
                      }}
                      className="px-3 py-1 text-sm bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
