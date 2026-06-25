import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AttendanceMarker from './AttendanceMarker'
import { getProfile } from '@/lib/supabase/getProfile'

export default async function AttendancePage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  let students: any[] = []
  let existing: any[] = []

  try {
    const [studentsRes, existingRes] = await Promise.all([
      supabase.from('students')
        .select('id, full_name, roll_number, class_name, section')
        .eq('school_id', profile.school_id).eq('is_active', true)
        .order('class_name').order('roll_number'),
      supabase.from('attendance').select('student_id, status')
        .eq('school_id', profile.school_id).eq('date', today),
    ])
    students = studentsRes.data ?? []
    existing = existingRes.data ?? []
  } catch (err) {
    console.warn('AttendancePage: Failed to fetch from Supabase (offline?):', err)
  }

  const attMap: Record<string, string> = {}
  existing.forEach(r => { attMap[r.student_id] = r.status })
  const classes = Array.from(new Set(students.map(s => s.class_name))).sort()

  return (
    <AttendanceMarker
      students={students} classes={classes}
      initialAttendance={attMap}
      teacherId={profile.id} schoolId={profile.school_id} date={today}
    />
  )
}
