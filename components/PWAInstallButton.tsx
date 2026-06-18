'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDownToLine } from 'lucide-react';

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Only show on mobile screen widths
    const isMobileScreen = window.innerWidth <= 768;
    if (!isMobileScreen) return;

    // Already installed as PWA — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setShowButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Trigger native browser install dialog
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowButton(false);
      }
      setDeferredPrompt(null);
    } else {
      // iOS / browsers that don't support beforeinstallprompt
      alert('To install:\n1. Tap the Share icon (⬆) in your browser\n2. Select "Add to Home Screen"\n3. Tap "Add"');
    }
  };

  if (!showButton) return null;

  return (
    <button
      id="pwa-install-btn"
      onClick={handleInstall}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.2s, transform 0.2s',
        boxShadow: '0 2px 12px rgba(79,70,229,0.4)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <ArrowDownToLine size={16} />
      Install App
    </button>
  );
}
