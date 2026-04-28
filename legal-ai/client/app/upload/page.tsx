'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Upload as UploadIcon, FileText, Loader2, CheckCircle } from 'lucide-react';
import { uploadDocument } from '../../features/upload/uploadService';
import { getCurrentUser } from '../../features/auth/authService';

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

  if (!user) return null;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      await handleUpload(file);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    
    try {
      const result = await uploadDocument(file);
      setUploadResult(result);
      
      // Redirect to document page after successful upload
      if (result.documentId) {
        setTimeout(() => {
          router.push(`/document/${result.documentId}`);
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar className="w-64 shrink-0 hidden lg:flex" />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Document</h1>
            <p className="text-gray-600 mb-8">Upload a PDF document for AI analysis and risk assessment.</p>
            
            {/* Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-300 hover:border-gray-400 bg-white'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                  <p className="text-gray-600">Uploading and analyzing your document...</p>
                </div>
              ) : uploadResult ? (
                <div className="flex flex-col items-center gap-4">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                  <div>
                    <p className="font-semibold text-gray-900">Upload successful!</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Redirecting to document analysis...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UploadIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Drop your PDF here, or click to browse
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Supports PDF files up to 50MB
                  </p>
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer">
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">Choose File</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Supported Features */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Risk Analysis', desc: 'Identify high, medium, and low risk clauses' },
                { title: 'Smart Summaries', desc: 'Get AI-generated plain English summaries' },
                { title: 'Legal Chat', desc: 'Ask questions about your document' },
              ].map((feature, i) => (
                <div key={i} className="bg-white p-5 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
