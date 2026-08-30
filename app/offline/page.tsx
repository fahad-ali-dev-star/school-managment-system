'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Home, Users, CalendarCheck, DollarSign } from 'lucide-react';

const CACHED_PAGES = [
  { href: '/dashboard',   label: 'Dashboard',   icon: '◻' },
  { href: '/students',    label: 'Students',    icon: '👨‍🎓' },
  { href: '/attendance',  label: 'Attendance',  icon: '✅' },
  { href: '/fees',        label: 'Fees',        icon: '💰' },
  { href: '/classes',     label: 'Classes',     icon: '🏫' },
]

export default function OfflinePage() {
  const [checking, setChecking] = useState(false)

  const handleRetry = () => {
    setChecking(true)
    // Give browser a moment to detect network state
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.href = '/dashboard'
      } else {
        setChecking(false)
        alert('Still offline. Please check your internet connection.')
      }
    }, 1500)
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="bg-amber-50 p-4 rounded-full text-amber-500 animate-bounce">
            <WifiOff className="w-12 h-12" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">You are Offline</h1>
          <p className="text-slate-500 text-sm">
            No internet connection detected. Your data is cached locally — you can still use most features below.
          </p>
        </div>

        {/* Cached page shortcuts */}
        <div className="text-left">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Available offline:</p>
          <div className="grid grid-cols-1 gap-1">
            {CACHED_PAGES.map(page => (
              <a
                key={page.href}
                href={page.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 font-medium text-sm transition-all"
              >
                <span className="text-base">{page.icon}</span>
                {page.label}
                <span className="ml-auto text-xs text-slate-400">→</span>
              </a>
            ))}
          </div>
        </div>

        {/* Pending sync notice */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-left">
          <p className="text-xs text-amber-700 font-medium">
            📦 Any changes you made offline (attendance, fees, etc.) are saved locally and will <strong>sync automatically</strong> when internet returns.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRetry}
            disabled={checking}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : 'Try Again'}
          </button>
          <a
            href="/dashboard"
            className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
