'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, X, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only show on mobile screen widths
    const isMobileScreen = window.innerWidth <= 768;
    if (!isMobileScreen) return;

    // Already installed as PWA — hide banner
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install:\n1. Tap the Share icon (⬆) in your browser\n2. Select "Add to Home Screen"\n3. Tap "Add"');
    }
  };

  const handleDismiss = () => setShowBanner(false);

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
          bottom: '1rem',
          left: '1rem',
          right: '1rem',
          zIndex: 9999,
        }}
      >
        <div style={{
          background: 'rgba(15,23,42,0.95)',
          backdropFilter: 'blur(12px)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '1rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              padding: '0.5rem',
              borderRadius: '10px',
              display: 'flex',
              flexShrink: 0,
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Install School ERP</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                Add to home screen for quick access
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={handleInstallClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 0.875rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <ArrowDownToLine size={14} />
              Install
            </button>
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
