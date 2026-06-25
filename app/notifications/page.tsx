import { redirect } from 'next/navigation'
import NotificationsManager from './NotificationsManager'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export default async function NotificationsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let logs:            any[] = []
  let templates:       any[] = []
  let students:        any[] = []
  let classes:         any[] = []
  let school:          any   = null
  let pendingFees:     any[] = []
  let todayAbsent:     any[] = []

  try {
    const [
      logsRes,
      templatesRes,
      studentsRes,
      classesRes,
      schoolRes,
      pendingFeesRes,
      todayAbsentRes,
    ] = await Promise.all([
      supabase.from('notification_logs')
        .select('*, student:students(full_name, roll_number, class_name)')
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('notification_templates')
        .select('*')
        .eq('school_id', profile.school_id)
        .order('type'),
      supabase.from('students')
        .select('id, full_name, roll_number, class_name, section, parent_name, parent_phone, fee_status')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .order('class_name').order('roll_number'),
      supabase.from('classes')
        .select('id, name, section')
        .eq('school_id', profile.school_id)
        .eq('is_active', true)
        .order('name').order('section'),
      supabase.from('schools')
        .select('name').eq('id', profile.school_id).single(),
      // Students with pending/overdue fees
      supabase.from('students')
        .select('id, full_name, parent_phone, parent_name, class_name, section, fee_status')
        .eq('school_id', profile.school_id)
        .in('fee_status', ['pending', 'overdue'])
        .eq('is_active', true),
      // Students absent today
      supabase.from('attendance')
        .select('student_id, students(full_name, parent_phone, parent_name, class_name, roll_number)')
        .eq('school_id', profile.school_id)
        .eq('date', new Date().toISOString().split('T')[0])
        .eq('status', 'absent'),
    ])
    logs        = logsRes.data         ?? []
    templates   = templatesRes.data    ?? []
    students    = studentsRes.data     ?? []
    classes     = classesRes.data      ?? []
    school      = schoolRes.data
    pendingFees = pendingFeesRes.data  ?? []
    todayAbsent = todayAbsentRes.data  ?? []
  } catch (err) {
    console.warn('NotificationsPage: Failed to fetch from Supabase (offline?):', err)
  }

  return (
    <NotificationsManager
      logs={logs}
      templates={templates}
      students={students}
      classes={classes}
      schoolName={school?.name ?? 'Beacon Light School'}
      pendingFeeStudents={pendingFees}
      absentToday={todayAbsent.map((a: any) => a.students).filter(Boolean)}
      schoolId={profile.school_id}
    />
  )
}
