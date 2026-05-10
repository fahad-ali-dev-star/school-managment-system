'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsForm({ 
  initialEmail, 
  initialSchoolName, 
  schoolId 
}: { 
  initialEmail: string, 
  initialSchoolName: string,
  schoolId: string 
}) {
  const [email, setEmail] = useState(initialEmail)
  const [schoolName, setSchoolName] = useState(initialSchoolName)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const supabase = createClient()
  const router = useRouter()

  async function handleUpdateSettings(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // 1. Update School Name if changed
      if (schoolName !== initialSchoolName) {
        const { error: schoolError } = await supabase
          .from('schools')
          .update({ name: schoolName })
          .eq('id', schoolId)

        if (schoolError) throw schoolError
      }

      // 2. Update Email if changed
      if (email !== initialEmail) {
        const { error: emailError } = await supabase.auth.updateUser({ email })
        if (emailError) throw emailError
        
        // Also update public.users table (though it might need confirmation to be fully synced in auth)
        const { error: userError } = await supabase
          .from('users')
          .update({ email })
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
        
        if (userError) console.error('Error updating public.users email:', userError.message)

        setMessage({ type: 'success', text: 'Settings updated! A confirmation link has been sent to your new email. Please verify it to complete the email change.' })
      }

      // 3. Update Password if provided
      if (password) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        const { error: passwordError } = await supabase.auth.updateUser({ password })
        if (passwordError) throw passwordError
        setMessage({ type: 'success', text: 'Settings updated successfully!' })
        setPassword('')
        setConfirmPassword('')
      }

      if (!message.text) {
        setMessage({ type: 'success', text: 'Settings updated successfully!' })
      }
      
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 600, padding: '2rem' }}>
      <form onSubmit={handleUpdateSettings}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
            School Name
          </label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
              fontSize: 14, fontFamily: 'inherit'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
            Login Email (Gmail)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
              fontSize: 14, fontFamily: 'inherit'
            }}
            required
          />
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Changing your email will require confirmation.
          </p>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>Change Password</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                fontSize: 14, fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                fontSize: 14, fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {message.text && (
          <div style={{
            padding: '10px 12px', borderRadius: 8, marginBottom: '1.5rem',
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: message.type === 'success' ? '#16a34a' : '#dc2626',
            fontSize: 14, border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`
          }}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: 8, background: '#4f46e5',
            color: 'white', border: 'none', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 14, opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s'
          }}
        >
          {loading ? 'Updating...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
