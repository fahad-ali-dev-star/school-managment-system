'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShieldAlert, KeyRound, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function WeakPasswordAlert({ userEmail }: { userEmail?: string }) {
  const [show, setShow] = useState<boolean>(false)
  const supabase = createClient()

  useEffect(() => {
    async function checkWeakPassword() {
      // Check session dismissal
      const dismissed = sessionStorage.getItem('dismissed_weak_pwd_alert') === 'true'
      if (dismissed) return

      // 1. Check if flagged during login or previous session
      const isWeakInStorage = localStorage.getItem('has_weak_password') === 'true'
      if (isWeakInStorage) {
        setShow(true)
        return
      }

      // 2. Check Supabase auth user metadata
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const isDefault = user.user_metadata?.is_default_password === true
          const updatedAt = user.user_metadata?.password_updated_at
          if (isDefault || !updatedAt) {
            setShow(true)
          }
        }
      } catch (err) {
        console.warn('Could not check user metadata for password:', err)
      }
    }

    checkWeakPassword()

    const onPasswordChanged = () => setShow(false)
    window.addEventListener('password-changed', onPasswordChanged)
    return () => window.removeEventListener('password-changed', onPasswordChanged)
  }, [])

  if (!show) return null

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        border: '1.5px solid #f59e0b',
        borderRadius: 12,
        padding: '0.9rem 1.15rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 260 }}>
        <div
          style={{
            background: '#d97706',
            color: '#fff',
            padding: '0.5rem',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShieldAlert size={22} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#78350f', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Security Warning: Weak / Default Password</span>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#92400e', marginTop: 2, lineHeight: 1.4 }}>
            Your account is currently using a default or weak password (<code>parent1122</code>). Please change your password immediately to secure your child&apos;s records.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Link
          href="/parent/account"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#b45309',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '0.5rem 0.9rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <KeyRound size={15} />
          Change Password Now
        </Link>
        <button
          onClick={() => {
            setShow(false)
            sessionStorage.setItem('dismissed_weak_pwd_alert', 'true')
          }}
          title="Dismiss warning for this session"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#92400e',
            cursor: 'pointer',
            padding: '0.35rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
          }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
