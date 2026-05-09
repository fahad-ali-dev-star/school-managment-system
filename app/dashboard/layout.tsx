import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import type { AuthUser } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  // getUser() is secure - authenticates with Supabase Auth server
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, school_id, full_name, email, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Profile error:', profileError?.message)
    redirect('/login')
  }

  // Fetch school name
  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('id', profile.school_id)
    .single()

  const authUser: AuthUser = {
    id: profile.id,
    school_id: profile.school_id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role as AuthUser['role'],
    school_name: school?.name ?? 'Beacon Light School',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={authUser} />
      <main style={{ flex: 1, overflow: 'auto', background: '#f8fafc' }}>
        {children}
      </main>
    </div>
  )
}
