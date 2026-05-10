import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import ParentsManager from './ParentsManager'
import { getProfile } from '@/lib/supabase/getProfile'

export const dynamic = 'force-dynamic'

export default async function ParentsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  if (!['admin', 'principal'].includes(profile.role)) redirect('/dashboard')

  const admin = createAdminClient()

  const [{ data: parents }, { data: students }] = await Promise.all([
    admin.from('users')
      .select('id, email, full_name, created_at')
      .eq('school_id', profile.school_id)
      .eq('role', 'parent')
      .order('created_at', { ascending: false }),
    admin.from('students')
      .select('id, full_name, roll_number, class_name, section, parent_email')
      .eq('school_id', profile.school_id)
      .eq('is_active', true)
      .order('class_name').order('roll_number'),
  ])

  return <ParentsManager parents={parents ?? []} students={students ?? []} />
}
