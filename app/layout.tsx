import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PWAInstallBanner } from '@/components/PWAInstallBanner'
import OfflineBanner        from '@/components/OfflineBanner'
import AppInitializer       from '@/components/AppInitializer'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'School Management System',
  description: 'Complete School Management Solution',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'School Management',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1e3a8a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="School Management" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {/* Offline / online status indicator — visible on every page */}
        <OfflineBanner />
        {/* Silently boots IndexedDB sync and reconnect listener */}
        <AppInitializer />
        <PWAInstallBanner />
        {children}
      </body>
    </html>
  )
}
