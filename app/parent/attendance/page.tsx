import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ParentAttendance from './ParentAttendance'

export default async function ParentAttendancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('school_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: children } = await supabase.from('students')
    .select('id, full_name, roll_number, class_name, section')
    .eq('school_id', profile.school_id)
    .ilike('parent_email', user.email!)
    .eq('is_active', true)

  const childIds = (children ?? []).map(c => c.id)
  let attendance: any[] = []
  if (childIds.length > 0) {
    const { data } = await supabase.from('attendance')
      .select('student_id, date, status')
      .in('student_id', childIds)
      .order('date', { ascending: false })
      .limit(500)
    attendance = data ?? []
  }

  return <ParentAttendance children_={children ?? []} attendance={attendance} />
}
