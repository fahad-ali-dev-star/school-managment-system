import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile to get school_id
  const { data: profile } = await supabase
    .from('users')
    .select('school_id, full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' && profile.role !== 'principal') {
    // Only admins or principals should access settings
    redirect('/dashboard')
  }

  // Fetch school details
  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('id', profile.school_id)
    .single()

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Admin Settings
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Update your login credentials and school information.
        </p>
      </div>

      <SettingsForm 
        initialEmail={user.email ?? ''} 
        initialSchoolName={school?.name ?? ''}
        schoolId={profile.school_id}
      />
    </div>
  )
}
