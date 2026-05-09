import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeavesManager from './LeavesManager'

export default async function LeavesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('school_id, role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const [
    { data: applications },
    { data: leaveTypes },
    { data: students },
  ] = await Promise.all([
    supabase.from('leave_applications')
      .select('*, student:students(full_name,roll_number,class_name,section), leave_type:leave_types(name,color,max_days)')
      .eq('school_id', profile.school_id)
      .order('created_at', { ascending: false }),
    supabase.from('leave_types')
      .select('*')
      .eq('school_id', profile.school_id)
      .order('name'),
    supabase.from('students')
      .select('id, full_name, roll_number, class_name, section')
      .eq('school_id', profile.school_id)
      .eq('is_active', true)
      .order('class_name').order('roll_number'),
  ])

  return (
    <LeavesManager
      applications={applications ?? []}
      leaveTypes={leaveTypes ?? []}
      students={students ?? []}
      userRole={profile.role}
      schoolId={profile.school_id}
    />
  )
}
