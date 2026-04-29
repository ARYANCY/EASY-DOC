'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { 
  Upload as UploadIcon, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Shield,
  MessageSquare,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { uploadDocument } from '../../features/upload/uploadService';
import { getCurrentUser } from '../../features/auth/authService';
import Link from 'next/link';

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

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
    } else {
      setError('Please upload a PDF file');
    }
  }, []);

  if (!user) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 500);
    
    try {
      const result = await uploadDocument(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadResult(result);
      
      // Redirect to document page after successful upload
      if (result.documentId) {
        setTimeout(() => {
          router.push(`/document/${result.documentId}`);
        }, 1500);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const features = [
    { 
      icon: Shield, 
      title: 'Risk Analysis', 
      desc: 'AI-powered detection of high-risk clauses',
      color: 'bg-red-50 text-red-600'
    },
    { 
      icon: Sparkles, 
      title: 'Smart Summaries', 
      desc: 'Plain English simplification',
      color: 'bg-amber-50 text-amber-600'
    },
    { 
      icon: MessageSquare, 
      title: 'Legal Chat', 
      desc: 'Interactive Q&A with your document',
      color: 'bg-emerald-50 text-emerald-600'
    },
  ];

  return (
    <div className="min-h-screen editorial-shell">
      <Sidebar />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Link */}
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-[#777169] hover:text-[#181715] transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </Link>

            {/* Header */}
            <div className="mb-8">
              <p className="editorial-label">New Dossier</p>
              <h1 className="font-editorial text-5xl sm:text-6xl text-[#181715] mt-3">Upload Document</h1>
              <p className="text-[#777169] mt-3">Upload a PDF for AI analysis and risk assessment</p>
            </div>
            
            {/* Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                isDragging 
                  ? 'border-[#181715] bg-[#fffdf9] shadow-lg' 
                  : 'border-[#e8e1d8] hover:border-[#181715] bg-[#fffdf9] hover:shadow-md'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-[#181715] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-semibold text-[#181715]">{uploadProgress}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[#181715] font-medium">Uploading and analyzing...</p>
                    <div className="w-48 h-1.5 bg-[#eee7dc] overflow-hidden mx-auto">
                      <div 
                        className="h-full bg-[#181715] transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : uploadResult ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-[#181715] flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-[#fffdf9]" />
                  </div>
                  <div>
                    <p className="font-editorial text-3xl text-[#181715]">Upload successful!</p>
                    <p className="text-[#777169] mt-1">
                      Redirecting to document analysis...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-[#181715] flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <UploadIcon className="w-10 h-10 text-[#fffdf9]" />
                  </div>
                  <h3 className="font-editorial text-3xl text-[#181715] mb-2">
                    Drop your PDF here
                  </h3>
                  <p className="text-[#777169] mb-2">or click to browse files</p>
                  <p className="text-xs text-[#9a938a] mb-8">
                    Supports PDF files up to 50MB
                  </p>
                  <label className="editorial-button cursor-pointer">
                    <FileText className="w-5 h-5" />
                    <span>Choose File</span>
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
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Supported Features */}
            <div className="mt-12">
              <h3 className="font-editorial text-3xl text-[#181715] mb-4">What happens after upload?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {features.map((feature, i) => (
                  <div 
                    key={i} 
                    className="editorial-card p-6 transition-all group"
                  >
                    <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h4 className="font-semibold text-[#181715] mb-1">{feature.title}</h4>
                    <p className="text-sm text-[#777169]">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
