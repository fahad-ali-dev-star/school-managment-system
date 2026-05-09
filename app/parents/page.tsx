import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import ParentsManager from './ParentsManager'

export default async function ParentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('school_id, role').eq('id', user.id).single()
  if (!profile || !['admin', 'principal'].includes(profile.role)) redirect('/dashboard')

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
