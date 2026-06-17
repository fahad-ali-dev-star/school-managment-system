'use client';

import React from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <div className="flex justify-center">
          <div className="bg-red-50 p-4 rounded-full text-red-500 animate-bounce">
            <WifiOff className="w-12 h-12" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">You are Offline</h1>
          <p className="text-slate-600 text-sm">
            It looks like you've lost connection to the school server. Please check your internet connection and try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <a
            href="/dashboard"
            className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <Home className="w-4 h-4" />
            Go Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
