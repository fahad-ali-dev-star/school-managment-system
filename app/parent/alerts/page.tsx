import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ParentAlerts from './ParentAlerts'
import { getProfile } from '@/lib/supabase/getProfile'

export const dynamic = 'force-dynamic'

export default async function ParentAlertsPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const supabase = createClient()

  let children: any[] = []
  let alerts: any[] = []

  try {
    const { data: childrenData } = await supabase.from('students')
      .select('id, full_name, roll_number, class_name, section')
      .eq('school_id', profile.school_id)
      .ilike('parent_email', profile.email)
      .eq('is_active', true)
    children = childrenData ?? []

    const childIds = children.map(c => c.id)
    if (childIds.length > 0) {
      const { data } = await supabase.from('notification_logs')
        .select('*, student:students(id, full_name, roll_number, class_name, section)')
        .in('student_id', childIds)
        .order('created_at', { ascending: false })
        .limit(200)
      alerts = data ?? []
    }
  } catch (err) {
    console.warn('ParentAlertsPage: Failed to fetch from Supabase (offline?):', err)
  }

  return <ParentAlerts children_={children} alerts={alerts} />
}
