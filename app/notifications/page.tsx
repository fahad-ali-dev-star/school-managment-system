import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationsManager from './NotificationsManager'

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('school_id, role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const [
    { data: logs },
    { data: templates },
    { data: students },
    { data: classes },
    { data: school },
    { data: pendingFees },
    { data: todayAbsent },
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

  return (
    <NotificationsManager
      logs={logs ?? []}
      templates={templates ?? []}
      students={students ?? []}
      classes={classes ?? []}
      schoolName={school?.name ?? 'Beacon Light School'}
      pendingFeeStudents={pendingFees ?? []}
      absentToday={(todayAbsent ?? []).map((a: any) => a.students).filter(Boolean)}
      schoolId={profile.school_id}
    />
  )
}
