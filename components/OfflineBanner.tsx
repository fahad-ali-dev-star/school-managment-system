'use client'
// components/OfflineBanner.tsx
// Shows an amber banner when offline and a green success banner when sync completes
// Placed at the top of the root layout — visible on every page

import { useEffect, useState } from 'react'

type BannerStatus = 'online' | 'offline' | 'syncing' | 'synced'

export default function OfflineBanner() {
  const [status, setStatus]           = useState<BannerStatus>('online')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    // Set initial status on mount
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('offline')
    }

    const onOffline = () => setStatus('offline')
    const onOnline  = () => setStatus('online')

    const onSmsOffline = () => setStatus('offline')
    const onSmsSynced  = (e: Event) => {
      const detail = (e as CustomEvent).detail as { success: number; failed: number }
      setStatus('synced')
      setPendingCount(detail?.failed ?? 0)
      // Auto-hide after 5 seconds
      setTimeout(() => setStatus('online'), 5000)
    }
    const onSmsSyncing = () => setStatus('syncing')

    window.addEventListener('offline',     onOffline)
    window.addEventListener('online',      onOnline)
    window.addEventListener('sms:offline', onSmsOffline)
    window.addEventListener('sms:synced',  onSmsSynced)
    window.addEventListener('sms:syncing', onSmsSyncing)

    return () => {
      window.removeEventListener('offline',     onOffline)
      window.removeEventListener('online',      onOnline)
      window.removeEventListener('sms:offline', onSmsOffline)
      window.removeEventListener('sms:synced',  onSmsSynced)
      window.removeEventListener('sms:syncing', onSmsSyncing)
    }
  }, [])

  if (status === 'online') return null

  const banners: Record<Exclude<BannerStatus, 'online'>, { bg: string; icon: string; text: string }> = {
    offline: {
      bg:   '#d97706',
      icon: '📶',
      text: 'You are offline — showing cached data. Changes will sync automatically when internet returns.',
    },
    syncing: {
      bg:   '#2563eb',
      icon: '🔄',
      text: 'Back online — syncing your offline changes to the server...',
    },
    synced: {
      bg:   '#16a34a',
      icon: '✅',
      text: pendingCount > 0
        ? `Sync complete — ${pendingCount} item(s) could not sync yet and will retry.`
        : 'Back online — all offline changes synced successfully!',
    },
  }

  const cfg = banners[status]

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position:       'sticky',
        top:            0,
        zIndex:         9999,
        background:     cfg.bg,
        color:          '#fff',
        textAlign:      'center',
        padding:        '9px 16px',
        fontSize:       '13px',
        fontWeight:     500,
        letterSpacing:  '0.01em',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '8px',
        boxShadow:      '0 2px 8px rgba(0,0,0,0.15)',
        transition:     'background 0.4s',
      }}
    >
      <span style={{ fontSize: 15 }}>{cfg.icon}</span>
      {cfg.text}
    </div>
  )
}
