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
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default')
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [testLoading, setTestLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [dismissed, setDismissed] = useState<boolean>(false)
  const [showHelp, setShowHelp] = useState<boolean>(false)

  const checkStatus = () => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    ) {
      setIsSupported(true)
      setPermissionState(Notification.permission)

      // Check current subscription state
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            setIsSubscribed(true)
          } else {
            setIsSubscribed(false)
          }
        })
        .catch((err) => {
          console.warn('[PushPrompt] Error checking subscription:', err)
        })
    } else {
      setPermissionState('unsupported')
    }
  }

  useEffect(() => {
    checkStatus()
  }, [])

  const subscribeToPush = async () => {
    setLoading(true)
    setMessage(null)

    try {
      // 1. Check or Request Notification Permission
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setPermissionState('denied')
        setShowHelp(true)
        setMessage({
          text: 'Notification permission is currently blocked in your browser. Follow the instructions below to allow notifications.',
          type: 'error',
        })
        setLoading(false)
        return
      }

      const permission = await Notification.requestPermission()
      setPermissionState(permission)

      if (permission === 'denied') {
        setShowHelp(true)
        setMessage({
          text: 'Notification permission was blocked in your browser. Tap the lock/settings icon in the URL bar to allow notifications.',
          type: 'error',
        })
        setLoading(false)
        return
      }

      if (permission !== 'granted') {
        setMessage({
          text: 'Notifications permission was not granted.',
          type: 'info',
        })
        setLoading(false)
        return
      }

      // 2. Fetch public VAPID key
      const keyRes = await fetch('/api/notifications/subscribe')
      const keyData = await keyRes.json()

      if (!keyRes.ok || !keyData.publicKey) {
        throw new Error(
          keyData.error ||
            'VAPID public key not found. Please ensure NEXT_PUBLIC_VAPID_PUBLIC_KEY is set in environment variables and the server has been redeployed.'
        )
      }

      // 3. Ensure Service Worker is registered and active
      let registration: ServiceWorkerRegistration | undefined
      if ('serviceWorker' in navigator) {
        registration = await navigator.serviceWorker.getRegistration()
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        }
        await navigator.serviceWorker.ready
        registration = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready)
      }

      if (!registration || !registration.pushManager) {
        throw new Error('Push manager is not supported or service worker is unavailable on this device/browser.')
      }

      // 4. Create or reuse Push Subscription
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        })
      }

      // 5. Send subscription to server database
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
            justifyContent: 'space-between',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {message.type === 'success' ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertCircle size={15} />
            )}
            <span>{message.text}</span>
          </div>
          {permissionState === 'denied' && (
            <button
              onClick={() => setShowHelp(!showHelp)}
              style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                color: '#991b1b',
                padding: '0.25rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {showHelp ? 'Hide Steps' : 'How to Unblock?'}
            </button>
          )}
        </div>
      )}

      {showHelp && permissionState === 'denied' && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #fed7aa',
            borderRadius: 10,
            padding: '0.85rem 1rem',
            fontSize: '0.8rem',
            color: '#334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontWeight: 700, color: '#c2410c' }}>
            🔓 How to Allow Notifications in Your Browser:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: '#fff7ed', padding: '0.6rem 0.75rem', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, color: '#9a3412', marginBottom: 3 }}>📱 Android (Chrome / Samsung)</div>
              <div>1. Tap the <strong>🔒 Lock icon</strong> or <strong>Tune icon (🎚️)</strong> on the address bar.</div>
              <div>2. Tap <strong>Permissions</strong> → <strong>Notifications</strong>.</div>
              <div>3. Change to <strong>Allow (Turn ON)</strong>.</div>
            </div>
            <div style={{ background: '#eff6ff', padding: '0.6rem 0.75rem', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: 3 }}>🍎 iPhone (iOS 16.4+)</div>
              <div>1. Tap the <strong>Share</strong> button (box with arrow) in Safari.</div>
              <div>2. Tap <strong>Add to Home Screen</strong>.</div>
              <div>3. Open the installed App from Home Screen → Enable Notifications.</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: 3 }}>💻 Desktop (Chrome / Edge)</div>
              <div>1. Click the <strong>🔒 View site information</strong> icon next to the URL.</div>
              <div>2. Toggle <strong>Notifications</strong> to <strong>Allow</strong>.</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button
              onClick={() => {
                checkStatus()
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                  subscribeToPush()
                } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
                  subscribeToPush()
                } else {
                  setMessage({
                    text: 'Still showing blocked. Please ensure notifications are toggled to "Allow" in browser settings.',
                    type: 'error',
                  })
                }
              }}
              style={{
                background: '#ea580c',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '0.4rem 0.8rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 Check Permission & Enable
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
