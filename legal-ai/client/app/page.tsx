'use client';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { FileText, Clock, Shield, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar className="w-64 shrink-0 hidden lg:flex" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        
        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Documents', value: '24', icon: FileText, color: 'bg-blue-500' },
                { label: 'Analyzed This Month', value: '12', icon: TrendingUp, color: 'bg-green-500' },
                { label: 'Average Risk Score', value: '45', icon: Shield, color: 'bg-yellow-500' },
                { label: 'Pending Review', value: '3', icon: Clock, color: 'bg-purple-500' },
              ].map((stat, index) => (
                <div key={index} className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Documents */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Recent Documents</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { name: 'Non-Disclosure Agreement.pdf', date: '20 May 2025', status: 'Analyzed', risk: 72 },
                  { name: 'Service Contract v2.pdf', date: '18 May 2025', status: 'Analyzed', risk: 45 },
                  { name: 'Employment Agreement.pdf', date: '15 May 2025', status: 'Pending', risk: null },
                ].map((doc, index) => (
                  <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <p className="text-sm text-gray-500">{doc.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {doc.risk && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          doc.risk >= 70 ? 'bg-red-100 text-red-700' :
                          doc.risk >= 40 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          Risk: {doc.risk}/100
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        doc.status === 'Analyzed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
