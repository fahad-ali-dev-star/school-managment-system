import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import type { AuthUser } from '@/types'

export default async function TeacherPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('id, school_id, full_name, email, role').eq('id', user.id).single()
  if (!profile || profile.role !== 'teacher') redirect('/login')

  const { data: school } = await supabase.from('schools').select('name').eq('id', profile.school_id).single()

  const authUser: AuthUser = {
    id: profile.id, school_id: profile.school_id,
    full_name: profile.full_name, email: profile.email,
    role: 'teacher',
    school_name: school?.name ?? 'Beacon Light School',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={authUser} />
      <main style={{ flex: 1, overflow: 'auto', background: '#f8fafc', paddingTop: 0 }}>
        {children}
      </main>
    </div>
  )
}
