'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDownToLine } from 'lucide-react';

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already installed as PWA — hide button
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback for iOS or browsers that don't support beforeinstallprompt
      alert('To install: tap the Share button in your browser, then "Add to Home Screen".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Hide if already installed
  if (isInstalled) return null;

  return (
    <button
      onClick={handleInstall}
      title="Install School ERP App"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: '#4f46e5',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.2s, transform 0.2s',
        boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#4338ca')}
      onMouseLeave={e => (e.currentTarget.style.background = '#4f46e5')}
    >
      <ArrowDownToLine size={16} />
      {isInstallable ? 'Install App' : 'Install App'}
    </button>
  );
}
