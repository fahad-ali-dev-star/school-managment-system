import { redirect } from 'next/navigation'
import LeavesManager from './LeavesManager'
import { getProfile } from '@/lib/supabase/getProfile'
import { createClient } from '@/lib/supabase/server'

export default async function LeavesPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let applications: any[] = []
  let leaveTypes:   any[] = []
  let students:     any[] = []

  try {
    const [appRes, typesRes, studentsRes] = await Promise.all([
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
    applications = appRes.data      ?? []
    leaveTypes   = typesRes.data    ?? []
    students     = studentsRes.data ?? []
  } catch (err) {
    console.warn('LeavesPage: Failed to fetch from Supabase (offline?):', err)
  }

  return (
    <LeavesManager
      applications={applications}
      leaveTypes={leaveTypes}
      students={students}
      userRole={profile.role}
      schoolId={profile.school_id}
    />
  )
}
