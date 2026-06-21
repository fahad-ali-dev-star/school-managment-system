import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { parseAllClassesAssigned } from '@/lib/teacherAccess'
import AttendanceMarker from '@/app/attendance/AttendanceMarker'

export default async function TeacherAttendancePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('school_id, id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: teacherRow } = await supabase.from('teachers')
    .select('class_assigned').eq('email', user.email!).eq('school_id', profile.school_id).single()

  const assignedClasses = parseAllClassesAssigned(teacherRow?.class_assigned ?? '')
  const classNames = assignedClasses.map(c => c.class_name).filter(Boolean)
  const today = new Date().toISOString().split('T')[0]

  let studentsQuery = supabase.from('students')
    .select('id, full_name, roll_number, class_name, section')
    .eq('school_id', profile.school_id)
    .eq('is_active', true)
    .order('roll_number')

  if (classNames.length > 0) {
    studentsQuery = studentsQuery.in('class_name', classNames)
  } else {
    studentsQuery = studentsQuery.eq('id', '00000000-0000-0000-0000-000000000000') // matches nothing
  }

  const [{ data: studentsData }, { data: existing }] = await Promise.all([
    studentsQuery,
    supabase.from('attendance').select('student_id, status')
      .eq('school_id', profile.school_id).eq('date', today),
  ])

  const students = (studentsData ?? []).filter(student => 
    assignedClasses.some(c => 
      c.class_name === student.class_name && 
      (!c.section || c.section === student.section)
    )
  )

  const attMap: Record<string, string> = {}
  existing?.forEach(r => { attMap[r.student_id] = r.status })
  const classes = Array.from(new Set(classNames))

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
