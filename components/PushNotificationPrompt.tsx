'use client'

import React, { useState, useEffect } from 'react'
import { Bell, BellOff, CheckCircle2, AlertCircle, Send, Smartphone } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushNotificationPrompt({
  userEmail,
}: {
  userEmail?: string
}) {
  const [isSupported, setIsSupported] = useState<boolean>(false)
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [testLoading, setTestLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [dismissed, setDismissed] = useState<boolean>(false)

  useEffect(() => {
    // Check if push & service worker are supported in current browser
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    ) {
      setIsSupported(true)

      // Check current subscription state
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            setIsSubscribed(true)
          }
        })
        .catch((err) => {
          console.warn('[PushPrompt] Error checking subscription:', err)
        })
    }
  }, [])

  const subscribeToPush = async () => {
    setLoading(true)
    setMessage(null)

    try {
      if (Notification.permission === 'denied') {
        setMessage({
          text: 'Notification permission is blocked. Please allow notifications in your mobile browser settings.',
          type: 'error',
        })
        setLoading(false)
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMessage({
          text: 'Notifications were not permitted.',
          type: 'info',
        })
        setLoading(false)
        return
      }

      // Fetch public VAPID key
      const keyRes = await fetch('/api/notifications/subscribe')
      const { publicKey } = await keyRes.json()

      if (!publicKey) {
        throw new Error('VAPID public key not found')
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Send subscription to server
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save subscription on server')
      }

      setIsSubscribed(true)
      setMessage({
        text: '📱 Mobile push notifications enabled! You will now receive instant popups on this device.',
        type: 'success',
      })
    } catch (err: any) {
      console.error('[PushPrompt] Subscription error:', err)
      setMessage({
        text: err.message || 'Failed to enable push notifications.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const unsubscribeFromPush = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
      setMessage({
        text: 'Notifications have been disabled on this device.',
        type: 'info',
      })
    } catch (err: any) {
      console.error('[PushPrompt] Unsubscribe error:', err)
      setMessage({
        text: 'Failed to disable notifications.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const sendTestNotification = async () => {
    setTestLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/notifications/test-push', {
        method: 'POST',
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setMessage({
          text: '🚀 Test push sent! Check your phone notification popup.',
          type: 'success',
        })
      } else {
        setMessage({
          text: data.message || data.error || 'Failed to send test push notification.',
          type: 'error',
        })
      }
    } catch (err: any) {
      setMessage({
        text: 'Failed to trigger test push.',
        type: 'error',
      })
    } finally {
      setTestLoading(false)
    }
  }

  if (!isSupported || dismissed) return null

  return (
    <div
      style={{
        background: isSubscribed
          ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
        border: `1px solid ${isSubscribed ? '#bbf7d0' : '#bfdbfe'}`,
        borderRadius: 14,
        padding: '1rem 1.25rem',
        margin: '0 0 1.5rem 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              background: isSubscribed ? '#16a34a' : '#2563eb',
              color: '#fff',
              padding: '0.5rem',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSubscribed ? <Bell size={20} /> : <Smartphone size={20} />}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>
              {isSubscribed ? 'Mobile Push Notifications Active' : 'Enable Mobile Notifications'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {isSubscribed
                ? 'Your device will receive instant popups for attendance, fee alerts, and school notices.'
                : 'Get instant alert popups on your phone lock screen and notification bar.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isSubscribed ? (
            <button
              onClick={subscribeToPush}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Bell size={16} />
              {loading ? 'Enabling...' : 'Enable Notifications'}
            </button>
          ) : (
            <>
              <button
                onClick={sendTestNotification}
                disabled={testLoading}
                title="Send a test notification popup to this mobile device"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: testLoading ? 'not-allowed' : 'pointer',
                }}
              >
                <Send size={14} />
                {testLoading ? 'Sending...' : 'Test Mobile Popup'}
              </button>
              <button
                onClick={unsubscribeFromPush}
                disabled={loading}
                title="Turn off notifications on this device"
                style={{
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  color: '#64748b',
                  borderRadius: 8,
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <BellOff size={14} />
              </button>
            </>
          )}

          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            fontWeight: 500,
            padding: '0.4rem 0.75rem',
            borderRadius: 6,
            background:
              message.type === 'success'
                ? '#ecfdf5'
                : message.type === 'error'
                ? '#fef2f2'
                : '#f1f5f9',
            color:
              message.type === 'success'
                ? '#065f46'
                : message.type === 'error'
                ? '#991b1b'
                : '#334155',
          }}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={15} />
          ) : (
            <AlertCircle size={15} />
          )}
          {message.text}
        </div>
      )}
    </div>
  )
}
