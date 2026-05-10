'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [roleSelection, setRoleSelection] = useState<'admin' | 'teacher' | 'parent' | null>(null)
  const [error, setError]       = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // Fetch role to redirect appropriately
      const supabase2 = createClient()
      const { data: profile } = await supabase2.from('users').select('role').eq('id', data.session.user.id).single()
      const userRole = profile?.role
      
      // Store role in cookie for middleware performance optimization
      if (userRole) {
        document.cookie = `user-role=${userRole}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      }

      const dest = userRole === 'teacher' ? '/teacher' : userRole === 'parent' ? '/parent' : '/dashboard'
      setTimeout(() => { window.location.href = dest }, 100)
    } else {
      setError('No session returned. Please try again.')
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #e2e8f0', borderRadius: 8,
    fontSize: 14, background: '#f8fafc',
    fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '1rem',
      background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 60%, #e0e7ff 100%)',
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: '2.5rem',
        width: '100%', maxWidth: 420,
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 60px rgba(79,70,229,0.10)',
        position: 'relative',
      }}>
        {roleSelection && (
          <button onClick={() => { setRoleSelection(null); setError(''); setEmail(''); setPassword(''); }} style={{
            position: 'absolute', top: 20, left: 20, background: 'transparent',
            border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit'
          }}>
            ← Back
          </button>
        )}

        {/* Logo */}
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: '#4f46e5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.25rem', marginTop: roleSelection ? '1.5rem' : 0,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          School Management System
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4, marginBottom: '1.75rem' }}>
          {roleSelection ? `Sign in as ${roleSelection.charAt(0).toUpperCase() + roleSelection.slice(1)}` : 'Select your portal to continue'}
        </p>

        {!roleSelection ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setRoleSelection('parent')} style={{
              padding: '16px', background: '#fdf4ff', border: '1px solid #f5d0fe', borderRadius: 12,
              color: '#86198f', fontSize: 16, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.2s'
            }}>
              <span style={{ fontSize: 24 }}>👨‍👩‍👧</span> Parent Portal
            </button>
            <button onClick={() => setRoleSelection('teacher')} style={{
              padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
              color: '#166534', fontSize: 16, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.2s'
            }}>
              <span style={{ fontSize: 24 }}>👨‍🏫</span> Teacher Portal
            </button>
            <button onClick={() => setRoleSelection('admin')} style={{
              padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
              color: '#1e40af', fontSize: 16, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.2s'
            }}>
              <span style={{ fontSize: 24 }}>🛡️</span> Admin Portal
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: '1rem',
              }}>⚠ {error}</div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Email
                </label>
                <input type="email" required value={email} placeholder="your@email.com"
                  onChange={e => setEmail(e.target.value)} style={inp}
                  onFocus={e => (e.target.style.borderColor = '#4f46e5')}
                  onBlur={e  => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Password
                </label>
                <input type="password" required placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)} style={inp}
                  onFocus={e => (e.target.style.borderColor = '#4f46e5')}
                  onBlur={e  => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: 11,
                background: loading ? '#a5b4fc' : '#4f46e5',
                color: 'white', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}>
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: 12, color: '#94a3b8' }}>
          School Management System ERP
        </p>
      </div>
    </div>
  )
}
