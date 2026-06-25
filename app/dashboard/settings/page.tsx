import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'
import BillingManager from '@/components/BillingManager'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== 'admin' && profile.role !== 'principal') {
    // Only admins or principals should access settings
    redirect('/dashboard')
  }

  const supabase = createClient()

  // Fetch school details
  let school: any = null
  try {
    const { data } = await supabase
      .from('schools')
      .select('name, plan, phone')
      .eq('id', profile.school_id)
      .single()
    school = data
  } catch (err) {
    console.warn('SettingsPage: Failed to fetch school (offline?):', err)
  }

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
        initialEmail={profile.email ?? ''} 
        initialSchoolName={school?.name ?? ''}
        initialSchoolPhone={school?.phone ?? ''}
        schoolId={profile.school_id}
      />

      <div style={{ marginTop: '3rem' }}>
        <BillingManager schoolId={profile.school_id} currentPlan={school?.plan} />
      </div>
    </div>
  )
}
