import { getProfile } from '@/lib/supabase/getProfile'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import type { AuthUser } from '@/types'

export default async function ReportCardsLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const authUser: AuthUser = {
    id: profile.id, school_id: profile.school_id,
    full_name: profile.full_name, email: profile.email,
    role: profile.role as AuthUser['role'],
    school_name: profile.school_name ?? 'Beacon Light School',
    plan: profile.plan as string
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
