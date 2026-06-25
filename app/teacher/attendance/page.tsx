import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { parseAllClassesAssigned } from '@/lib/teacherAccess'
import AttendanceMarker from '@/app/attendance/AttendanceMarker'
import { getProfile } from '@/lib/supabase/getProfile'

export default async function TeacherAttendancePage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  let teacherRow: any = null
  let studentsData: any[] = []
  let existing: any[]     = []

  try {
    const { data } = await supabase.from('teachers')
      .select('class_assigned').eq('email', profile.email).eq('school_id', profile.school_id).single()
    teacherRow = data

    const assignedClassesTmp = parseAllClassesAssigned(teacherRow?.class_assigned ?? '')
    const classNamesTmp = assignedClassesTmp.map(c => c.class_name).filter(Boolean)

    let studentsQuery = supabase.from('students')
      .select('id, full_name, roll_number, class_name, section')
      .eq('school_id', profile.school_id)
      .eq('is_active', true)
      .order('roll_number')

    if (classNamesTmp.length > 0) {
      studentsQuery = studentsQuery.in('class_name', classNamesTmp)
    } else {
      studentsQuery = studentsQuery.eq('id', '00000000-0000-0000-0000-000000000000') // matches nothing
    }

    const [studentsRes, existingRes] = await Promise.all([
      studentsQuery,
      supabase.from('attendance').select('student_id, status')
        .eq('school_id', profile.school_id).eq('date', today),
    ])
    studentsData = studentsRes.data ?? []
    existing     = existingRes.data ?? []
  } catch (err) {
    console.warn('TeacherAttendancePage: Failed to fetch from Supabase (offline?):', err)
  }

  const assignedClasses = parseAllClassesAssigned(teacherRow?.class_assigned ?? '')
  const classNames = assignedClasses.map(c => c.class_name).filter(Boolean)

  const students = studentsData.filter(student =>
    assignedClasses.some(c =>
      c.class_name === student.class_name &&
      (!c.section || c.section === student.section)
    )
  )

  const attMap: Record<string, string> = {}
  existing.forEach(r => { attMap[r.student_id] = r.status })
  const classes = Array.from(new Set(classNames))

  return (
    <AttendanceMarker
      students={students}
      classes={classes}
      initialAttendance={attMap}
      teacherId={profile.id}
      schoolId={profile.school_id}
      date={today}
    />
  )
}
