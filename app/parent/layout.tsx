import { getProfile } from '@/lib/supabase/getProfile'
import Sidebar from '@/components/Sidebar'
import type { AuthUser } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ParentPortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  if (!profile || profile.role !== 'parent') redirect('/login')

  const authUser: AuthUser = {
    id: profile.id, school_id: profile.school_id,
    full_name: profile.full_name, email: profile.email,
    role: 'parent',
    school_name: profile.school_name ?? 'School Management System',
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
