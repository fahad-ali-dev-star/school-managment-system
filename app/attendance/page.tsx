import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AttendanceMarker from './AttendanceMarker'

export default async function AttendancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('school_id, id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: students }, { data: existing }] = await Promise.all([
    supabase.from('students')
      .select('id, full_name, roll_number, class_name, section')
      .eq('school_id', profile.school_id).eq('is_active', true)
      .order('class_name').order('roll_number'),
    supabase.from('attendance').select('student_id, status')
      .eq('school_id', profile.school_id).eq('date', today),
  ])

  const attMap: Record<string, string> = {}
  existing?.forEach(r => { attMap[r.student_id] = r.status })
  const classes = Array.from(new Set((students ?? []).map(s => s.class_name))).sort()

  return (
    <AttendanceMarker
      students={students ?? []} classes={classes}
      initialAttendance={attMap}
      teacherId={profile.id} schoolId={profile.school_id} date={today}
    />
  )
}
