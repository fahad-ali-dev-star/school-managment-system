import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/getProfile'
import ParentLeavesManager from './ParentLeavesManager'

export const dynamic = 'force-dynamic'

export default async function ParentLeavesPage() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'parent') redirect('/login')

  const supabase = createClient()

  // Fetch children active students linked to this parent's email
  const { data: children, error: childrenErr } = await supabase
    .from('students')
    .select('id, full_name, roll_number, class_name, section, gender')
    .eq('school_id', profile.school_id)
    .ilike('parent_email', profile.email)
    .eq('is_active', true)
    .order('class_name')
    .order('roll_number')

  if (childrenErr) {
    console.error('Error fetching children:', childrenErr)
  }

  const childIds = (children ?? []).map(c => c.id)

  let applications: any[] = []
  if (childIds.length > 0) {
    const { data: apps, error: appsErr } = await supabase
      .from('leave_applications')
      .select('*, student:students(full_name, roll_number, class_name, section), leave_type:leave_types(name, color, max_days)')
      .eq('school_id', profile.school_id)
      .in('student_id', childIds)
      .order('created_at', { ascending: false })

    if (appsErr) {
      console.error('Error fetching leave applications:', appsErr)
    } else {
      applications = apps ?? []
    }
  }

  // Fetch leave types for the school
  const { data: leaveTypes, error: typesErr } = await supabase
    .from('leave_types')
    .select('*')
    .eq('school_id', profile.school_id)
    .order('name')

  if (typesErr) {
    console.error('Error fetching leave types:', typesErr)
  }

  return (
    <ParentLeavesManager
      applications={applications}
      leaveTypes={leaveTypes ?? []}
      students={children ?? []}
      schoolId={profile.school_id}
    />
  )
}
