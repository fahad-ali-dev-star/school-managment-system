'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
  borderRadius: 8, fontSize: 14, background: '#f8fafc', fontFamily: 'inherit', outline: 'none',
}

export default function ChangePasswordForm({ email, role }: { email: string; role: string }) {
  const [newPwd, setNewPwd]     = useState('')
  const [confirmPwd, setConfirm] = useState('')
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')
  const supabase = createClient()

  const roleColors: Record<string, string> = {
    teacher: '#15803d',
    parent:  '#7e22ce',
    admin:   '#c2410c',
    principal: '#4338ca',
  }
  const accent = roleColors[role] ?? '#4f46e5'
  const accentBg = role === 'teacher' ? '#f0fdf4' : role === 'parent' ? '#fdf4ff' : '#eef2ff'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPwd.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (newPwd !== confirmPwd) { setError('Passwords do not match.'); return }
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPwd })
    if (err) { setError(err.message); setSaving(false); return }
    setSuccess(true); setNewPwd(''); setConfirm('')
    setSaving(false)
    setTimeout(() => setSuccess(false), 5000)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 480 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>My Account</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>Update your password</p>
      </div>

      <div className="card" style={{ padding: '1.75rem' }}>
        <div style={{ background: accentBg, borderRadius: 8, padding: '10px 14px', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 13, color: accent, margin: 0 }}>
            <strong>Logged in as:</strong> {email}
          </p>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
            Email cannot be changed here. Contact admin to update your email.
          </p>
        </div>

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', color: '#15803d', fontSize: 13, marginBottom: '1rem' }}>
            ✓ Password updated successfully!
          </div>
        )}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              New Password
            </label>
            <input
              type="password" required minLength={6}
              placeholder="At least 6 characters"
              value={newPwd} onChange={e => setNewPwd(e.target.value)}
              style={inp}
              onFocus={e => (e.target.style.borderColor = accent)}
              onBlur={e  => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Confirm New Password
            </label>
            <input
              type="password" required
              placeholder="Re-enter new password"
              value={confirmPwd} onChange={e => setConfirm(e.target.value)}
              style={inp}
              onFocus={e => (e.target.style.borderColor = accent)}
              onBlur={e  => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>
          <button type="submit" disabled={saving} style={{
            width: '100%', padding: 11,
            background: saving ? '#a5b4fc' : accent,
            color: 'white', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}>
            {saving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
