import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ParentAttendance from './ParentAttendance'
import { getProfile } from '@/lib/supabase/getProfile'

export default async function ParentAttendancePage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let children: any[]    = []
  let attendance: any[]  = []

  try {
    const { data: childrenData } = await supabase.from('students')
      .select('id, full_name, roll_number, class_name, section')
      .eq('school_id', profile.school_id)
      .ilike('parent_email', profile.email)
      .eq('is_active', true)
    children = childrenData ?? []

    const childIds = children.map(c => c.id)
    if (childIds.length > 0) {
      const { data } = await supabase.from('attendance')
        .select('student_id, date, status')
        .in('student_id', childIds)
        .order('date', { ascending: false })
        .limit(500)
      attendance = data ?? []
    }
  } catch (err) {
    console.warn('ParentAttendancePage: Failed to fetch from Supabase (offline?):', err)
  }

  return <ParentAttendance children_={children} attendance={attendance} />
}
