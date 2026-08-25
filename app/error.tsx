'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App Error:', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textAlign: 'center',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '2.5rem 2rem',
        maxWidth: 480,
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#fef2f2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          margin: '0 auto 1.25rem',
        }}>
          ⚠️
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
          An unexpected error occurred. You can try refreshing the page or clicking below to retry.
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: '10px 20px',
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
