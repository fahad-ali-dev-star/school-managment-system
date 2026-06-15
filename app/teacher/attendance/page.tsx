import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { parseClassAssigned } from '@/lib/teacherAccess'
import AttendanceMarker from '@/app/attendance/AttendanceMarker'

export default async function TeacherAttendancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('school_id, id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: teacherRow } = await supabase.from('teachers')
    .select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()

  const { class_name, section } = parseClassAssigned(teacherRow?.class_assigned ?? '')
  const today = new Date().toISOString().split('T')[0]

  const [{ data: students }, { data: existing }] = await Promise.all([
    supabase.from('students')
      .select('id, full_name, roll_number, class_name, section')
      .eq('school_id', profile.school_id)
      .eq('class_name', class_name)
      .eq('section', section)
      .eq('is_active', true)
      .order('roll_number'),
    supabase.from('attendance').select('student_id, status')
      .eq('school_id', profile.school_id).eq('date', today),
  ])

  const attMap: Record<string, string> = {}
  existing?.forEach(r => { attMap[r.student_id] = r.status })
  const classes = class_name ? [class_name] : []

  return (
    <AttendanceMarker
      students={students ?? []}
      classes={classes}
      initialAttendance={attMap}
      teacherId={profile.id}
      schoolId={profile.school_id}
      date={today}
    />
  )
}
